package com.smartbox.backend.controller.admin;

import com.smartbox.backend.service.admin.PoProductReportService;
import com.smartbox.backend.service.admin.RevenueReportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reports")
public class RevenueReportController {

    private final RevenueReportService reports;
    private final PoProductReportService poReports;

    public record Export(@NotNull @Pattern(regexp="PDF|XLSX") String format, @NotNull Map<String,Object> params){}
    public record PoExportRequest(@NotNull @Pattern(regexp="PDF|XLSX") String format, String from, String to, String type){}

    @GetMapping("/{code}")
    public Map<String,Object> definition(@PathVariable String code) {
        return reports.definition(code);
    }

    @PostMapping("/{code}/export")
    public ResponseEntity<byte[]> export(@PathVariable String code, @Valid @RequestBody Export request) {
        reports.definition(code);
        var report = reports.data(request.params());
        String extension = "PDF".equals(request.format()) ? "pdf" : "xlsx";
        String filename = code + "_" + report.from().format(DateTimeFormatter.BASIC_ISO_DATE) + "_" + report.to().format(DateTimeFormatter.BASIC_ISO_DATE) + "." + extension;
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .header("X-Report-Engine", "JasperReports")
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("PDF".equals(request.format()) ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(reports.export(report, request.format()));
    }

    @GetMapping("/po/summary")
    public PoProductReportService.PoReportSummary poSummary(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false, defaultValue = "REVENUE") String type
    ) {
        LocalDate fromDate = from != null && !from.isBlank() ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null && !to.isBlank() ? LocalDate.parse(to) : null;
        return poReports.getReportData(fromDate, toDate, type);
    }

    @PostMapping("/po/export")
    public ResponseEntity<byte[]> exportPo(@Valid @RequestBody PoExportRequest request) {
        LocalDate fromDate = request.from() != null && !request.from().isBlank() ? LocalDate.parse(request.from()) : null;
        LocalDate toDate = request.to() != null && !request.to().isBlank() ? LocalDate.parse(request.to()) : null;
        String type = request.type() != null && !request.type().isBlank() ? request.type() : "REVENUE";
        var summary = poReports.getReportData(fromDate, toDate, type);
        String extension = "PDF".equals(request.format()) ? "pdf" : "xlsx";
        String prefix = "INVENTORY".equalsIgnoreCase(type) ? "TonKho" : "DoanhThu";
        String filename = "BaoCao_PO_" + prefix + "_" + summary.from().format(DateTimeFormatter.BASIC_ISO_DATE) + "_" + summary.to().format(DateTimeFormatter.BASIC_ISO_DATE) + "." + extension;
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .header("X-Report-Engine", "JasperReports")
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("PDF".equals(request.format()) ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(poReports.export(summary, request.format(), type));
    }
}
