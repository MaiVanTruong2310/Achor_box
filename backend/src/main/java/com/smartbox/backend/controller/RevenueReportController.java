package com.smartbox.backend.controller;

import com.smartbox.backend.service.RevenueReportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reports")
public class RevenueReportController {
    private final RevenueReportService reports;
    public record Export(@NotNull @Pattern(regexp="PDF|XLSX") String format,@NotNull Map<String,Object> params){}
    @GetMapping("/{code}") public Map<String,Object> definition(@PathVariable String code){return reports.definition(code);}
    @PostMapping("/{code}/export") public ResponseEntity<byte[]> export(@PathVariable String code,@Valid @RequestBody Export request) {
        reports.definition(code);var report=reports.data(request.params());
        String extension="PDF".equals(request.format())?"pdf":"xlsx";
        String filename=code+"_"+report.from().format(DateTimeFormatter.BASIC_ISO_DATE)+"_"+report.to().format(DateTimeFormatter.BASIC_ISO_DATE)+"."+extension;
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+filename+"\"")
            .contentType(MediaType.parseMediaType("PDF".equals(request.format())?"application/pdf":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(reports.export(report,request.format()));
    }
}
