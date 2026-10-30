package com.smartbox.backend.controller.admin;

import com.smartbox.backend.service.admin.PoProductReportService;
import com.smartbox.backend.service.admin.RevenueReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reports")
@Tag(name = "Report API", description = "Báo cáo doanh thu, đối soát bán hàng và xuất báo cáo PDF/Excel")
public class RevenueReportController {

    private final RevenueReportService reports;
    private final PoProductReportService poReports;

    @Schema(description = "Yêu cầu kết xuất báo cáo động")
    public record Export(
            @NotNull
            @Pattern(regexp = "PDF|XLSX")
            @Schema(description = "Định dạng file xuất (PDF hoặc XLSX)", example = "PDF")
            String format,

            @NotNull
            @Schema(description = "Tập tham số truy vấn báo cáo")
            Map<String, Object> params
    ) {}

    @Schema(description = "Yêu cầu kết xuất báo cáo PO")
    public record PoExportRequest(
            @NotNull
            @Pattern(regexp = "PDF|XLSX")
            @Schema(description = "Định dạng file xuất (PDF hoặc XLSX)", example = "PDF")
            String format,

            @Schema(description = "Ngày bắt đầu (YYYY-MM-DD)", example = "2026-10-01")
            String from,

            @Schema(description = "Ngày kết thúc (YYYY-MM-DD)", example = "2026-10-31")
            String to,

            @Schema(description = "Loại báo cáo PO (REVENUE hoặc INVENTORY)", example = "REVENUE")
            String type
    ) {}

    @GetMapping("/{code}")
    @Operation(summary = "Lấy định nghĩa cấu hình báo cáo theo mã", description = "Truy xuất danh sách tham số đầu vào, bộ lọc và cấu trúc của mẫu báo cáo tương ứng với mã code")
    public Map<String, Object> definition(@PathVariable String code) {
        return reports.definition(code);
    }

    @PostMapping("/{code}/export")
    @Operation(summary = "Xuất dữ liệu báo cáo sang định dạng PDF hoặc Excel", description = "Sinh file báo cáo động định dạng PDF hoặc XLSX sử dụng JasperReports Engine và trả về file nhị phân đính kèm")
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
    @Operation(summary = "Lấy số liệu tổng hợp báo cáo PO theo kỳ", description = "Tổng hợp dữ liệu doanh thu, số lượng đơn hàng và giá trị phê duyệt PO trong khoảng thời gian từ ngày đến ngày")
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
    @Operation(summary = "Xuất báo cáo PO doanh thu/tồn kho ra file PDF/Excel", description = "Kết xuất dữ liệu báo cáo PO theo loại (REVENUE hoặc INVENTORY) ra file đính kèm PDF hoặc Excel")
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
