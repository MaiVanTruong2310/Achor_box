package com.smartbox.backend.service.admin;

import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ReportParamsException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.commerce.OrderWorkflowService;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRMapCollectionDataSource;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimpleXlsxReportConfiguration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Types;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RevenueReportService {

    public static final String CODE = "RPT_REVENUE_DAILY";
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final CommerceRepository db;
    private final NamedParameterJdbcTemplate jdbc;
    private final CurrentActor actors;

    public record Day(LocalDate date, long orders, BigDecimal revenue) {}
    public record Report(LocalDate from, LocalDate to, List<Day> days, BigDecimal grossPaid, BigDecimal refunded) {}

    @Transactional(readOnly = true)
    public Map<String, Object> definition(String code) {
        actors.get().requireRoles("super_admin", "product_manager");
        if (!CODE.equals(code)) {
            throw new ResourceNotFoundException("Báo cáo", "code", code);
        }
        var definition = db.one("SELECT name FROM public.report_definitions WHERE code=?", code);
        return Map.of("code", code, "name", definition.get("name"), "params", db.list("SELECT name,data_type AS \"dataType\",required,max_days AS \"maxDays\" FROM public.report_params WHERE report_code=? ORDER BY name", code));
    }

    @Transactional(readOnly = true)
    public Report data(Map<String, Object> raw) {
        definition(CODE);
        List<Map<String, String>> errors = new ArrayList<>();
        Map<String, Object> values = new HashMap<>();
        MapSqlParameterSource params = new MapSqlParameterSource();
        var definitions = db.list("SELECT * FROM public.report_params WHERE report_code=?", CODE);
        Set<String> known = new HashSet<>();
        for (var definition : definitions) {
            String name = definition.get("name").toString();
            String type = definition.get("data_type").toString();
            known.add(name);
            Object input = raw.get(name);
            Object value = null;
            int sqlType = switch (type) {
                case "DATE" -> Types.DATE;
                case "DECIMAL" -> Types.NUMERIC;
                case "LONG" -> Types.BIGINT;
                case "UUID" -> Types.OTHER;
                default -> Types.VARCHAR;
            };
            if (input == null) {
                if (Boolean.TRUE.equals(definition.get("required"))) {
                    errors.add(error(name, "REQUIRED"));
                }
            } else {
                try {
                    value = switch (type) {
                        case "DATE" -> LocalDate.parse(input.toString());
                        case "UUID" -> UUID.fromString(input.toString());
                        case "LONG" -> Long.valueOf(input.toString());
                        case "DECIMAL" -> new BigDecimal(input.toString());
                        default -> throw new IllegalArgumentException();
                    };
                } catch (Exception ex) {
                    errors.add(error(name, "DATE".equals(type) ? "INVALID_FORMAT" : "INVALID_TYPE"));
                }
            }
            values.put(name, value);
            params.addValue(name, value instanceof LocalDate date ? Date.valueOf(date) : value, sqlType);
        }
        for (String name : raw.keySet()) {
            if (!known.contains(name)) {
                errors.add(error(name, "UNKNOWN_PARAMETER"));
            }
        }
        LocalDate from = (LocalDate) values.get("fromDate");
        LocalDate to = (LocalDate) values.get("toDate");
        if (from != null && to != null) {
            if (to.isBefore(from)) {
                errors.add(error("toDate", "RANGE_INVALID"));
            } else {
                int maxDays = definitions.stream()
                        .map(d -> d.get("max_days"))
                        .filter(Number.class::isInstance)
                        .map(Number.class::cast)
                        .mapToInt(Number::intValue)
                        .filter(n -> n > 0)
                        .min()
                        .orElse(92);
                if (ChronoUnit.DAYS.between(from, to) + 1 > maxDays) {
                    errors.add(error("toDate", "RANGE_TOO_LONG"));
                }
            }
        }
        if (values.get("customerId") != null && db.list("SELECT id FROM public.profiles WHERE id=?", values.get("customerId")).isEmpty()) {
            errors.add(error("customerId", "NOT_FOUND"));
        }
        if (!errors.isEmpty()) {
            throw new ReportParamsException(errors);
        }
        OffsetDateTime start = from.atStartOfDay(ZONE).toOffsetDateTime();
        OffsetDateTime end = to.plusDays(1).atStartOfDay(ZONE).toOffsetDateTime();
        params.addValue("rangeStart", start, Types.TIMESTAMP_WITH_TIMEZONE).addValue("rangeEnd", end, Types.TIMESTAMP_WITH_TIMEZONE);
        String query = db.one("SELECT query_sql FROM public.report_definitions WHERE code=?", CODE).get("query_sql").toString();
        // Only database-admin-authored, single SELECT templates; all client values are bound parameters.
        if (!query.stripLeading().toUpperCase(Locale.ROOT).startsWith("SELECT ") || query.contains(";") || query.contains("$P!")) {
            throw new IllegalStateException("INVALID_REPORT_TEMPLATE");
        }
        if (values.get("customerId") == null) {
            query = query.replace("(CAST(:customerId AS uuid) IS NULL OR o.user_id=CAST(:customerId AS uuid))", "1=1")
                         .replace("(:customerId IS NULL OR o.user_id=:customerId)", "1=1");
        }
        if (values.get("minAmount") == null) {
            query = query.replace("(:minAmount IS NULL OR o.total>=:minAmount)", "1=1")
                         .replace("(:minAmount IS NULL OR p.amount>=:minAmount)", "1=1");
        }
        query = query.replaceAll("(?i)\\bo\\.status\\s+IN\\b", "CAST(o.status AS text) IN");
        var rows = jdbc.queryForList(query, params);
        Map<LocalDate, Day> byDay = new HashMap<>();
        for (var row : rows) {
            LocalDate day = OrderWorkflowService.date(row.get("day"));
            byDay.put(day, new Day(day, ((Number) row.get("orders")).longValue(), OrderWorkflowService.money(row.get("revenue"))));
        }
        List<Day> days = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            days.add(byDay.getOrDefault(day, new Day(day, 0, BigDecimal.ZERO)));
        }
        Object customer = values.get("customerId");
        BigDecimal gross = OrderWorkflowService.money(customer != null
                ? db.one("SELECT COALESCE(sum(p.amount),0) AS total FROM public.payments p JOIN public.orders o ON o.id=p.order_id WHERE p.paid_at>=? AND p.paid_at<? AND o.user_id=?", start, end, customer).get("total")
                : db.one("SELECT COALESCE(sum(p.amount),0) AS total FROM public.payments p WHERE p.paid_at>=? AND p.paid_at<?", start, end).get("total"));
        BigDecimal refunded = OrderWorkflowService.money(customer != null
                ? db.one("SELECT COALESCE(sum(r.amount),0) AS total FROM public.refunds r JOIN public.orders o ON o.id=r.order_id WHERE r.status='COMPLETED' AND r.completed_at>=? AND r.completed_at<? AND o.user_id=?", start, end, customer).get("total")
                : db.one("SELECT COALESCE(sum(r.amount),0) AS total FROM public.refunds r WHERE r.status='COMPLETED' AND r.completed_at>=? AND r.completed_at<?", start, end).get("total"));
        return new Report(from, to, List.copyOf(days), gross, refunded);
    }

    private Map<String, String> error(String name, String reason) {
        return Map.of("param", name, "reason", reason);
    }

    private volatile JasperReport compiled;

    private JasperReport template() throws JRException, IOException {
        var current = compiled;
        if (current != null) return current;
        synchronized (this) {
            if (compiled == null) {
                try (var input = new ClassPathResource("reports/revenue-daily.jrxml").getInputStream()) {
                    compiled = JasperCompileManager.compileReport(input);
                }
            }
            return compiled;
        }
    }

    public byte[] export(Report report, String format) {
        if (!Set.of("PDF", "XLSX").contains(format)) {
            throw new BadRequestException("INVALID_REPORT_FORMAT");
        }
        try (var output = new ByteArrayOutputStream()) {
            List<Map<String, ?>> rows = new ArrayList<>();
            for (var day : report.days()) {
                rows.add(Map.of("dateLabel", day.date().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), "orders", day.orders(), "revenue", day.revenue()));
            }
            Map<String, Object> params = new HashMap<>();
            params.put("period", "Từ " + report.from().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " đến " + report.to().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            params.put("generatedAt", ZonedDateTime.now(ZONE).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + " (giờ Việt Nam)");
            params.put("totalOrders", report.days().stream().mapToLong(Day::orders).sum());
            params.put("totalRevenue", report.days().stream().map(Day::revenue).reduce(BigDecimal.ZERO, BigDecimal::add));
            params.put("grossPaid", report.grossPaid());
            params.put("refunded", report.refunded());
            params.put("netCash", report.grossPaid().subtract(report.refunded()));
            params.put(JRParameter.REPORT_LOCALE, Locale.forLanguageTag("vi-VN"));
            params.put(JRParameter.IS_IGNORE_PAGINATION, "XLSX".equals(format));
            var print = JasperFillManager.fillReport(template(), params, new JRMapCollectionDataSource(rows));
            if ("PDF".equals(format)) {
                return JasperExportManager.exportReportToPdf(print);
            }
            var exporter = new JRXlsxExporter();
            exporter.setExporterInput(new SimpleExporterInput(print));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(output));
            var config = new SimpleXlsxReportConfiguration();
            config.setDetectCellType(true);
            config.setRemoveEmptySpaceBetweenRows(true);
            config.setWhitePageBackground(false);
            config.setOnePagePerSheet(false);
            config.setSheetNames(new String[]{"Doanh thu"});
            exporter.setConfiguration(config);
            exporter.exportReport();
            return output.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("JASPER_REPORT_EXPORT_FAILED", ex);
        }
    }
}
