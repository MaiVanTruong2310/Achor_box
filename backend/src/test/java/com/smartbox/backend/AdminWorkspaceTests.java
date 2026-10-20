package com.smartbox.backend;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.admin.*;
import com.smartbox.backend.service.auth.*;
import com.smartbox.backend.service.catalog.*;
import com.smartbox.backend.service.commerce.*;
import com.smartbox.backend.service.customer.*;
import com.smartbox.backend.service.device.*;
import com.smartbox.backend.service.warranty.*;
import com.smartbox.backend.exception.ForbiddenException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class AdminWorkspaceTests {
    @Test void notificationsUseActualEventsAndTechniciansOnlySeeTheirJobsAndClaims(){
        var jdbc=new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1","sa",""));
        for(String table:List.of("orders","approval_tickets","delivery_installations","warranty_claims","email_outbox"))jdbc.execute("CREATE TABLE "+table+"(id uuid,status varchar,created_at timestamp with time zone,updated_at timestamp with time zone,assigned_to uuid)");
        UUID own=UUID.randomUUID(),other=UUID.randomUUID(),job=UUID.randomUUID(),claim=UUID.randomUUID();var time=OffsetDateTime.now(ZoneOffset.UTC);
        for(String table:List.of("orders","approval_tickets","email_outbox"))jdbc.update("INSERT INTO "+table+" VALUES(?,?,?,?,?)",UUID.randomUUID(),table.equals("email_outbox")?"FAILED":"PENDING",time,time,null);
        jdbc.update("INSERT INTO delivery_installations VALUES(?,?,?,?,?),(?,?,?,?,?)",job,"ASSIGNED",time,time,own,UUID.randomUUID(),"ASSIGNED",time,time,other);
        jdbc.update("INSERT INTO warranty_claims VALUES(?,?,?,?,?),(?,?,?,?,?)",claim,"new",time,time,own,UUID.randomUUID(),"new",time,time,other);
        var actors=new CurrentActor(){String role="technician";@Override public Actor get(){return new Actor(own,role);}};
        var service=new AdminNotificationsService(new CommerceRepository(jdbc),actors);
        var events=(List<Map<String,Object>>)service.feed().get("events");assertEquals(2,events.size());assertEquals(Set.of(job.toString(),claim.toString()),events.stream().map(e->e.get("referenceId").toString()).collect(java.util.stream.Collectors.toSet()));
        actors.role="product_manager";var accounting=(List<Map<String,Object>>)service.feed().get("events");assertEquals(4,accounting.size());
        actors.role="super_admin";assertEquals(7,((List<?>)service.feed().get("events")).size());
        actors.role="customer";assertThrows(ForbiddenException.class,service::feed);
    }
    @Test void jasperExportsUnicodePdfAndNumericWorkbookWithoutExternalFont() throws Exception {
        var service=new RevenueReportService(null,null,null);
        LocalDate from=LocalDate.of(2026,8,1);var days=new ArrayList<RevenueReportService.Day>();
        for(int i=0;i<92;i++)days.add(new RevenueReportService.Day(from.plusDays(i),i%3,new BigDecimal("1200000")));
        var report=new RevenueReportService.Report(from,from.plusDays(91),days,new BigDecimal("120000000"),new BigDecimal("1000000"));
        byte[] pdf=service.export(report,"PDF");assertTrue(new String(pdf,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF"));
        var reader=new com.lowagie.text.pdf.PdfReader(pdf);assertTrue(reader.getNumberOfPages()>1);reader.close();
        var output=Path.of("build/audit/jasper-revenue.pdf");Files.createDirectories(output.getParent());Files.write(output,pdf);
        byte[] xlsx=service.export(report,"XLSX");
        try(var workbook=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(xlsx))){
            int numeric=0;for(var row:workbook.getSheetAt(0))for(var cell:row)if(cell.getCellType()==org.apache.poi.ss.usermodel.CellType.NUMERIC&&cell.getNumericCellValue()==1200000)numeric++;
            assertTrue(numeric>=92);assertEquals("Doanh thu",workbook.getSheetAt(0).getSheetName());
        }
        Files.write(Path.of("build/audit/jasper-revenue.xlsx"),xlsx);
        assertThrows(com.smartbox.backend.exception.BadRequestException.class,()->service.export(report,"HTML"));
    }
}
