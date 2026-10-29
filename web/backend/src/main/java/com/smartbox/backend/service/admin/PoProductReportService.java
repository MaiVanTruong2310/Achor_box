package com.smartbox.backend.service.admin;

import com.smartbox.backend.exception.BadRequestException;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PoProductReportService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final CommerceRepository db;
    private final CurrentActor actors;

    public record PoProductItem(
            String productName,
            String variantName,
            String sku,
            String categoryName,
            BigDecimal price,
            Long stockQuantity,
            BigDecimal inventoryValue,
            Long soldQuantity,
            BigDecimal revenue
    ) {}

    public record PoReportSummary(
            LocalDate from,
            LocalDate to,
            String managerName,
            String managerEmail,
            String reportType,
            Long totalProducts,
            Long totalVariants,
            Long totalStock,
            BigDecimal totalInventoryValue,
            Long totalSold,
            BigDecimal totalRevenue,
            List<PoProductItem> items
    ) {}

    private volatile JasperReport compiled;

    private JasperReport template() throws JRException, IOException {
        var current = compiled;
        if (current != null) return current;
        synchronized (this) {
            if (compiled == null) {
                try (var input = new ClassPathResource("reports/po-products.jrxml").getInputStream()) {
                    compiled = JasperCompileManager.compileReport(input);
                }
            }
            return compiled;
        }
    }

    @Transactional(readOnly = true)
    public PoReportSummary getReportData(LocalDate from, LocalDate to) {
        return getReportData(from, to, "REVENUE");
    }

    @Transactional(readOnly = true)
    public PoReportSummary getReportData(LocalDate from, LocalDate to, String reportType) {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager");

        UUID managerId = actor.id();

        var profile = db.one("SELECT full_name, email FROM public.profiles WHERE id=?", managerId);
        String managerName = profile.get("full_name") != null ? profile.get("full_name").toString() : "Quản lý sản phẩm";
        String managerEmail = profile.get("email") != null ? profile.get("email").toString() : "po@smartbox.vn";

        LocalDate startDay = from != null ? from : LocalDate.now(ZONE).minusMonths(1);
        LocalDate endDay = to != null ? to : LocalDate.now(ZONE);

        OffsetDateTime start = startDay.atStartOfDay(ZONE).toOffsetDateTime();
        OffsetDateTime end = endDay.plusDays(1).atStartOfDay(ZONE).toOffsetDateTime();

        String sql = "SELECT p.name AS product_name, " +
                "       COALESCE(c.name, 'Hộp nhận hàng thông minh') AS category_name, " +
                "       COALESCE(v.variant_name, 'Bản tiêu chuẩn') AS variant_name, " +
                "       COALESCE(v.sku, p.sku) AS sku, " +
                "       (p.price + COALESCE(v.price_delta, 0)) AS price, " +
                "       COALESCE(v.stock_quantity, p.stock_quantity, 0) AS stock_quantity, " +
                "       COALESCE((SELECT sum(oi.quantity) " +
                "                 FROM public.order_items oi " +
                "                 JOIN public.orders o ON o.id=oi.order_id " +
                "                 WHERE oi.variant_id=v.id " +
                "                   AND o.status::text IN ('paid','confirmed','completed','shipping','installed') " +
                "                   AND o.created_at >= ? AND o.created_at < ?), 0) AS sold_quantity, " +
                "       COALESCE((SELECT sum(oi.quantity * oi.unit_price) " +
                "                 FROM public.order_items oi " +
                "                 JOIN public.orders o ON o.id=oi.order_id " +
                "                 WHERE oi.variant_id=v.id " +
                "                   AND o.status::text IN ('paid','confirmed','completed','shipping','installed') " +
                "                   AND o.created_at >= ? AND o.created_at < ?), 0) AS revenue " +
                "FROM public.products p " +
                "LEFT JOIN public.product_categories c ON c.id=p.category_id " +
                "LEFT JOIN public.product_variants v ON v.product_id=p.id " +
                "WHERE (c.manager_id = ? OR (c.manager_id IS NULL AND p.manager_id = ?)) " +
                "ORDER BY p.name, v.variant_name";

        List<Map<String, Object>> rows = db.list(sql,
                Timestamp.from(start.toInstant()),
                Timestamp.from(end.toInstant()),
                Timestamp.from(start.toInstant()),
                Timestamp.from(end.toInstant()),
                managerId,
                managerId
        );

        List<PoProductItem> items = new ArrayList<>();
        long totalStock = 0;
        BigDecimal totalInventoryValue = BigDecimal.ZERO;
        long totalSold = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        java.util.Set<String> distinctProducts = new java.util.HashSet<>();

        for (var row : rows) {
            String pName = row.get("product_name") != null ? row.get("product_name").toString() : "";
            distinctProducts.add(pName);
            String vName = row.get("variant_name") != null ? row.get("variant_name").toString() : "";
            String sku = row.get("sku") != null ? row.get("sku").toString() : "";
            String catName = row.get("category_name") != null ? row.get("category_name").toString() : "";
            BigDecimal price = OrderWorkflowService.money(row.get("price"));
            long stock = ((Number) row.get("stock_quantity")).longValue();
            BigDecimal invValue = price.multiply(BigDecimal.valueOf(stock));
            long sold = ((Number) row.get("sold_quantity")).longValue();
            BigDecimal rev = OrderWorkflowService.money(row.get("revenue"));

            totalStock += stock;
            totalInventoryValue = totalInventoryValue.add(invValue);
            totalSold += sold;
            totalRevenue = totalRevenue.add(rev);

            items.add(new PoProductItem(pName, vName, sku, catName, price, stock, invValue, sold, rev));
        }

        String effectiveType = reportType != null && !reportType.isBlank() ? reportType.toUpperCase() : "REVENUE";

        return new PoReportSummary(
                startDay,
                endDay,
                managerName,
                managerEmail,
                effectiveType,
                (long) distinctProducts.size(),
                (long) items.size(),
                totalStock,
                totalInventoryValue,
                totalSold,
                totalRevenue,
                items
        );
    }

    public byte[] export(PoReportSummary report, String format) {
        return export(report, format, report.reportType());
    }

    public byte[] export(PoReportSummary report, String format, String reportType) {
        if (!Set.of("PDF", "XLSX").contains(format)) {
            throw new BadRequestException("INVALID_REPORT_FORMAT");
        }
        try (var output = new ByteArrayOutputStream()) {
            List<Map<String, ?>> rows = new ArrayList<>();
            for (var item : report.items()) {
                rows.add(Map.of(
                        "productName", item.productName(),
                        "variantName", item.variantName(),
                        "sku", item.sku(),
                        "categoryName", item.categoryName(),
                        "price", item.price(),
                        "stockQuantity", item.stockQuantity(),
                        "inventoryValue", item.inventoryValue(),
                        "soldQuantity", item.soldQuantity(),
                        "revenue", item.revenue()
                ));
            }

            String effectiveType = reportType != null && !reportType.isBlank() ? reportType.toUpperCase() : "REVENUE";
            String title = "INVENTORY".equals(effectiveType)
                    ? "BÁO CÁO TỒN KHO & ĐỊNH MỨC HÀNG HÓA PHÂN QUYỀN PO"
                    : "BÁO CÁO DOANH THU & SẢN LƯỢNG BÁN HÀNG PHÂN QUYỀN PO";

            Map<String, Object> params = new HashMap<>();
            params.put("reportTitle", title);
            params.put("reportType", effectiveType);
            params.put("managerName", report.managerName());
            params.put("managerEmail", report.managerEmail());
            params.put("period", "Từ " + report.from().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                    " đến " + report.to().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            params.put("generatedAt", ZonedDateTime.now(ZONE).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + " (giờ Việt Nam)");
            params.put("totalProducts", report.totalProducts());
            params.put("totalVariants", report.totalVariants());
            params.put("totalStock", report.totalStock());
            params.put("totalInventoryValue", report.totalInventoryValue());
            params.put("totalSold", report.totalSold());
            params.put("totalRevenue", report.totalRevenue());
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
            config.setSheetNames(new String[]{"INVENTORY".equals(effectiveType) ? "BaoCao_TonKho_PO" : "BaoCao_DoanhThu_PO"});
            exporter.setConfiguration(config);
            exporter.exportReport();
            return output.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("JASPER_PO_REPORT_EXPORT_FAILED", ex);
        }
    }
}
