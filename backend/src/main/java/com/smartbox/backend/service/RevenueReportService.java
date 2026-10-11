package com.smartbox.backend.service;

import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.sql.Types;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RevenueReportService {
    public static final String CODE="RPT_REVENUE_DAILY";
    private static final ZoneId ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
    private final CommerceRepository db;
    private final NamedParameterJdbcTemplate jdbc;
    private final CurrentActor actors;
    @Value("${smartbox.reports.font-path:}") private String fontPath;
    public record Day(LocalDate date,long orders,BigDecimal revenue){}
    public record Report(LocalDate from,LocalDate to,List<Day> days,BigDecimal grossPaid,BigDecimal refunded){}
    @Transactional(readOnly=true)
    public Map<String,Object> definition(String code) {
        actors.get().requireRoles("super_admin","accountant");
        if(!CODE.equals(code))throw new ResourceNotFoundException("Báo cáo","code",code);
        var definition=db.one("SELECT name FROM public.report_definitions WHERE code=?",code);
        return Map.of("code",code,"name",definition.get("name"),"params",db.list("SELECT name,data_type AS \"dataType\",required,max_days AS \"maxDays\" FROM public.report_params WHERE report_code=? ORDER BY name",code));
    }
    @Transactional(readOnly=true)
    public Report data(Map<String,Object> raw) {
        definition(CODE);List<Map<String,String>> errors=new ArrayList<>();
        Map<String,Object> values=new HashMap<>();MapSqlParameterSource params=new MapSqlParameterSource();
        var definitions=db.list("SELECT * FROM public.report_params WHERE report_code=?",CODE);
        Set<String> known=new HashSet<>();
        for(var definition:definitions) {
            String name=definition.get("name").toString(),type=definition.get("data_type").toString();known.add(name);
            Object input=raw.get(name),value=null;int sqlType=switch(type){case "DATE"->Types.DATE;case "DECIMAL"->Types.NUMERIC;case "LONG"->Types.BIGINT;case "UUID"->Types.OTHER;default->Types.VARCHAR;};
            if(input==null) {
                if(Boolean.TRUE.equals(definition.get("required")))errors.add(error(name,"REQUIRED"));
            } else try {
                value=switch(type) {case "DATE"->LocalDate.parse(input.toString());case "UUID"->UUID.fromString(input.toString());case "LONG"->Long.valueOf(input.toString());case "DECIMAL"->new BigDecimal(input.toString());default->throw new IllegalArgumentException();};
            }catch(Exception ex){errors.add(error(name,"DATE".equals(type)?"INVALID_FORMAT":"INVALID_TYPE"));}
            values.put(name,value);params.addValue(name,value instanceof LocalDate date?java.sql.Date.valueOf(date):value,sqlType);
        }
        for(String name:raw.keySet())if(!known.contains(name))errors.add(error(name,"UNKNOWN_PARAMETER"));
        LocalDate from=(LocalDate)values.get("fromDate"),to=(LocalDate)values.get("toDate");
        if(from!=null&&to!=null) {
            if(to.isBefore(from))errors.add(error("toDate","RANGE_INVALID"));
            else {
                int maxDays=definitions.stream().map(d->d.get("max_days")).filter(Number.class::isInstance).map(Number.class::cast).mapToInt(Number::intValue).filter(n->n>0).min().orElse(92);
                if(ChronoUnit.DAYS.between(from,to)+1>maxDays)errors.add(error("toDate","RANGE_TOO_LONG"));
            }
        }
        if(values.get("customerId")!=null && db.list("SELECT id FROM public.profiles WHERE id=?",values.get("customerId")).isEmpty())errors.add(error("customerId","NOT_FOUND"));
        if(!errors.isEmpty())throw new ReportParamsException(errors);
        OffsetDateTime start=from.atStartOfDay(ZONE).toOffsetDateTime(),end=to.plusDays(1).atStartOfDay(ZONE).toOffsetDateTime();
        params.addValue("rangeStart",start,Types.TIMESTAMP_WITH_TIMEZONE).addValue("rangeEnd",end,Types.TIMESTAMP_WITH_TIMEZONE);
        String query=db.one("SELECT query_sql FROM public.report_definitions WHERE code=?",CODE).get("query_sql").toString();
        // Only database-admin-authored, single SELECT templates; all client values are bound parameters.
        if(!query.stripLeading().toUpperCase(Locale.ROOT).startsWith("SELECT ")||query.contains(";")||query.contains("$P!"))throw new IllegalStateException("INVALID_REPORT_TEMPLATE");
        var rows=jdbc.queryForList(query,params);Map<LocalDate,Day> byDay=new HashMap<>();
        for(var row:rows) {LocalDate day=row.get("day") instanceof java.sql.Date d?d.toLocalDate():LocalDate.parse(row.get("day").toString());byDay.put(day,new Day(day,((Number)row.get("orders")).longValue(),OrderWorkflowService.money(row.get("revenue"))));}
        List<Day> days=new ArrayList<>();for(LocalDate day=from;!day.isAfter(to);day=day.plusDays(1))days.add(byDay.getOrDefault(day,new Day(day,0,BigDecimal.ZERO)));
        Object customer=values.get("customerId");
        BigDecimal gross=OrderWorkflowService.money(db.one("SELECT COALESCE(sum(p.amount),0) AS total FROM public.payments p JOIN public.orders o ON o.id=p.order_id WHERE p.paid_at>=? AND p.paid_at<? AND (CAST(? AS uuid) IS NULL OR o.user_id=?)",start,end,customer,customer).get("total"));
        BigDecimal refunded=OrderWorkflowService.money(db.one("SELECT COALESCE(sum(r.amount),0) AS total FROM public.refunds r JOIN public.orders o ON o.id=r.order_id WHERE r.status='COMPLETED' AND r.completed_at>=? AND r.completed_at<? AND (CAST(? AS uuid) IS NULL OR o.user_id=?)",start,end,customer,customer).get("total"));
        return new Report(from,to,List.copyOf(days),gross,refunded);
    }
    private Map<String,String> error(String name,String reason){return Map.of("param",name,"reason",reason);}
    public byte[] export(Report report,String format) {
        if("XLSX".equals(format))return xlsx(report);
        if(!"PDF".equals(format))throw new BadRequestException("INVALID_REPORT_FORMAT");
        return pdf(report);
    }
    private byte[] xlsx(Report report) {
        try(var workbook=new XSSFWorkbook();var output=new ByteArrayOutputStream()) {
            var sheet=workbook.createSheet("Doanh thu");
            var header=sheet.createRow(0);String[] titles={"Ngày","Số đơn hàng","Doanh thu (₫)"};
            for(int i=0;i<titles.length;i++)header.createCell(i).setCellValue(titles[i]);
            var currency=workbook.createCellStyle();currency.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            int index=1;for(Day day:report.days()) {var row=sheet.createRow(index++);row.createCell(0).setCellValue(day.date().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));row.createCell(1).setCellValue(day.orders());row.createCell(2).setCellValue(day.revenue().doubleValue());row.getCell(2).setCellStyle(currency);}
            var total=sheet.createRow(index++);total.createCell(0).setCellValue("Tổng cộng");total.createCell(1).setCellValue(report.days().stream().mapToLong(Day::orders).sum());total.createCell(2).setCellValue(report.days().stream().map(Day::revenue).reduce(BigDecimal.ZERO,BigDecimal::add).doubleValue());total.getCell(2).setCellStyle(currency);
            for(var summary:List.of(Map.entry("Tiền đã thanh toán trong kỳ",report.grossPaid()),Map.entry("Tiền đã hoàn trong kỳ",report.refunded()),Map.entry("Dòng tiền ròng trong kỳ",report.grossPaid().subtract(report.refunded())))) {var row=sheet.createRow(index++);row.createCell(0).setCellValue(summary.getKey());row.createCell(2).setCellValue(summary.getValue().doubleValue());row.getCell(2).setCellStyle(currency);}
            for(int i=0;i<3;i++)sheet.autoSizeColumn(i);workbook.write(output);return output.toByteArray();
        }catch(Exception ex){throw new IllegalStateException("REPORT_XLSX_FAILED",ex);}
    }
    private byte[] pdf(Report report) {
        if(fontPath.isBlank()||!java.nio.file.Files.isRegularFile(java.nio.file.Path.of(fontPath)))throw new AppException(503,"REPORT_FONT_NOT_CONFIGURED");
        try(var output=new ByteArrayOutputStream()) {
            BaseFont base=BaseFont.createFont(fontPath,BaseFont.IDENTITY_H,BaseFont.EMBEDDED);Font font=new Font(base,11);Font title=new Font(base,16,Font.BOLD);
            Document doc=new Document(PageSize.A4,40,40,40,40);PdfWriter.getInstance(doc,output);doc.open();
            doc.add(new Paragraph("BÁO CÁO DOANH THU THEO NGÀY",title));
            doc.add(new Paragraph("Từ ngày "+report.from()+" đến "+report.to(),font));
            doc.add(new Paragraph("Xuất lúc "+ZonedDateTime.now(ZONE).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))+" (UTC+7)",font));doc.add(new Paragraph(" ",font));
            PdfPTable table=new PdfPTable(new float[]{2,2,3});table.setWidthPercentage(100);table.setHeaderRows(1);
            for(String text:List.of("Ngày","Số đơn hàng","Doanh thu (₫)"))table.addCell(new Phrase(text,font));
            var currency=java.text.NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN"));
            for(Day day:report.days()) {table.addCell(new Phrase(day.date().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),font));table.addCell(new Phrase(Long.toString(day.orders()),font));table.addCell(new Phrase(currency.format(day.revenue()),font));}
            table.addCell(new Phrase("Tổng cộng",font));table.addCell(new Phrase(Long.toString(report.days().stream().mapToLong(Day::orders).sum()),font));table.addCell(new Phrase(currency.format(report.days().stream().map(Day::revenue).reduce(BigDecimal.ZERO,BigDecimal::add)),font));doc.add(table);
            doc.add(new Paragraph("Tiền đã thanh toán trong kỳ: "+currency.format(report.grossPaid())+" ₫",font));
            doc.add(new Paragraph("Tiền đã hoàn trong kỳ: "+currency.format(report.refunded())+" ₫",font));
            doc.add(new Paragraph("Dòng tiền ròng trong kỳ: "+currency.format(report.grossPaid().subtract(report.refunded()))+" ₫",font));
            doc.close();return output.toByteArray();
        }catch(Exception ex){throw new IllegalStateException("REPORT_PDF_FAILED",ex);}
    }
}
