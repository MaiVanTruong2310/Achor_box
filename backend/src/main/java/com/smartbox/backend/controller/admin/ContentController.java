package com.smartbox.backend.controller.admin;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.admin.*;
import com.smartbox.backend.dto.request.auth.*;
import com.smartbox.backend.dto.request.catalog.*;
import com.smartbox.backend.dto.request.commerce.*;
import com.smartbox.backend.dto.request.customer.*;
import com.smartbox.backend.dto.request.device.*;
import com.smartbox.backend.dto.request.warranty.*;
import com.smartbox.backend.dto.response.admin.*;
import com.smartbox.backend.dto.response.auth.*;
import com.smartbox.backend.dto.response.catalog.*;
import com.smartbox.backend.dto.response.commerce.*;
import com.smartbox.backend.dto.response.customer.*;
import com.smartbox.backend.dto.response.device.*;
import com.smartbox.backend.dto.response.warranty.*;
import com.smartbox.backend.service.admin.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/content")
@RequiredArgsConstructor
@Tag(name = "Content & Marketing API", description = "Quản lý nội dung CMS: Bài viết blog, Banner trang chủ, Đánh giá sản phẩm và FAQ")
public class ContentController {

    private final ContentService contentService;

    // ==========================================
    // 0. SUMMARY STATS
    // ==========================================
    @GetMapping("/summary")
    @Operation(summary = "Lấy số liệu thống kê tổng quan CMS", description = "Tổng hợp số lượng bài viết, banner đang kích hoạt, đánh giá cần duyệt và câu hỏi thường gặp FAQ")
    public ResponseEntity<ContentSummaryStatsResponse> getSummaryStats() {
        return ResponseEntity.ok(contentService.getSummaryStats());
    }

    // ==========================================
    // 1. ARTICLES (BÀI VIẾT BLOG / TIN TỨC)
    // ==========================================
    @GetMapping("/articles")
    @Operation(summary = "Lấy danh sách bài viết blog / tin tức", description = "Lấy tất cả bài viết theo danh mục hoặc trạng thái xuất bản (draft, published, archived)")
    public ResponseEntity<List<ArticleResponse>> getAllArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(contentService.getAllArticles(category, status));
    }

    @GetMapping("/articles/paged")
    @Operation(summary = "Lấy danh sách bài viết có phân trang dạng Map<String, Object>", description = "Phân trang danh sách bài viết tin tức kèm theo thông tin tác giả, lượt xem và thời gian tạo")
    public ResponseEntity<Map<String, Object>> getArticlesPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(contentService.getArticlesPaged(page, size));
    }

    @GetMapping("/articles/{id}")
    @Operation(summary = "Lấy chi tiết một bài viết theo ID", description = "Truy xuất đầy đủ nội dung bài viết định dạng Markdown/HTML kèm hình ảnh đại diện và SEO meta")
    public ResponseEntity<ArticleResponse> getArticleById(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.getArticleById(id));
    }

    @PostMapping("/articles")
    @Operation(summary = "Tạo bài viết mới", description = "Khởi tạo bài viết blog hoặc tin tức mới với tiêu đề, đường dẫn slug, nội dung và danh mục")
    public ResponseEntity<ArticleResponse> createArticle(@RequestBody ArticleRequest req) {
        return ResponseEntity.ok(contentService.createArticle(req));
    }

    @PutMapping("/articles/{id}")
    @Operation(summary = "Chỉnh sửa bài viết", description = "Cập nhật tiêu đề, nội dung, hình ảnh và trạng thái của bài viết hiện có")
    public ResponseEntity<ArticleResponse> updateArticle(
            @PathVariable UUID id,
            @RequestBody ArticleRequest req) {
        return ResponseEntity.ok(contentService.updateArticle(id, req));
    }

    @DeleteMapping("/articles/{id}")
    @Operation(summary = "Xóa bài viết", description = "Xóa vĩnh viễn bài viết khỏi hệ thống nội dung CMS")
    public ResponseEntity<Map<String, Object>> deleteArticle(@PathVariable UUID id) {
        contentService.deleteArticle(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa bài viết thành công."));
    }

    // ==========================================
    // 2. BANNERS (HÌNH ẢNH TRANG CHỦ)
    // ==========================================
    @GetMapping("/banners")
    @Operation(summary = "Lấy danh sách banner trang chủ & quảng cáo", description = "Lấy danh sách banner hiển thị theo vị trí (trang chủ, popup, khuyến mãi) và trạng thái kích hoạt")
    public ResponseEntity<List<BannerResponse>> getAllBanners(
            @RequestParam(required = false) String position,
            @RequestParam(required = false) Boolean activeOnly) {
        return ResponseEntity.ok(contentService.getAllBanners(position, activeOnly));
    }

    @PostMapping("/banners")
    @Operation(summary = "Thêm banner mới", description = "Tạo mới banner quảng cáo với đường dẫn ảnh, liên kết đích và thứ tự hiển thị")
    public ResponseEntity<BannerResponse> createBanner(@RequestBody BannerRequest req) {
        return ResponseEntity.ok(contentService.createBanner(req));
    }

    @PutMapping("/banners/{id}")
    @Operation(summary = "Chỉnh sửa thông tin banner", description = "Cập nhật thông tin hình ảnh, tiêu đề, liên kết điều hướng và vị trí của banner")
    public ResponseEntity<BannerResponse> updateBanner(
            @PathVariable UUID id,
            @RequestBody BannerRequest req) {
        return ResponseEntity.ok(contentService.updateBanner(id, req));
    }

    @PatchMapping("/banners/{id}/toggle")
    @Operation(summary = "Bật/tắt trạng thái hiển thị của banner", description = "Chuyển đổi trạng thái hiển thị công khai của banner trên website khách hàng")
    public ResponseEntity<BannerResponse> toggleBannerStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.toggleBannerStatus(id));
    }

    @DeleteMapping("/banners/{id}")
    @Operation(summary = "Xóa banner", description = "Xóa bỏ banner quảng cáo khỏi hệ thống quản lý giao diện")
    public ResponseEntity<Map<String, Object>> deleteBanner(@PathVariable UUID id) {
        contentService.deleteBanner(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa banner thành công."));
    }

    // ==========================================
    // 3. PRODUCT REVIEWS (ĐÁNH GIÁ SẢN PHẨM)
    // ==========================================
    @GetMapping("/reviews")
    @Operation(summary = "Lấy danh sách đánh giá sản phẩm của khách hàng", description = "Truy xuất các đánh giá, số sao và phản hồi từ khách hàng theo sản phẩm hoặc trạng thái duyệt")
    public ResponseEntity<List<ProductReviewResponse>> getAllReviews(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID productId) {
        return ResponseEntity.ok(contentService.getAllReviews(status, productId));
    }

    @GetMapping("/reviews/paged")
    @Operation(summary = "Lấy danh sách đánh giá sản phẩm có phân trang dạng Map<String, Object>", description = "Phân trang danh sách đánh giá sản phẩm phục vụ kiểm duyệt nội dung của ban quản trị")
    public ResponseEntity<Map<String, Object>> getReviewsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(contentService.getReviewsPaged(page, size));
    }

    @PatchMapping("/reviews/{id}/status")
    @Operation(summary = "Cập nhật trạng thái duyệt/ẩn đánh giá", description = "Phê duyệt cho phép hiển thị công khai hoặc ẩn đánh giá vi phạm quy định cộng đồng")
    public ResponseEntity<ProductReviewResponse> updateReviewStatus(
            @PathVariable UUID id,
            @RequestBody ReviewStatusUpdateRequest req) {
        return ResponseEntity.ok(contentService.updateReviewStatus(id, req));
    }

    @PostMapping("/reviews/{id}/reply")
    @Operation(summary = "Admin gửi phản hồi chính thức cho đánh giá", description = "Nhập nội dung phản hồi từ ban quản trị hoặc bộ phận CSKH đối với đánh giá của khách hàng")
    public ResponseEntity<ProductReviewResponse> replyReview(
            @PathVariable UUID id,
            @RequestBody ReviewReplyRequest req) {
        return ResponseEntity.ok(contentService.replyReview(id, req));
    }

    @DeleteMapping("/reviews/{id}")
    @Operation(summary = "Xóa đánh giá khỏi hệ thống", description = "Xóa vĩnh viễn đánh giá sản phẩm không phù hợp khỏi cơ sở dữ liệu")
    public ResponseEntity<Map<String, Object>> deleteReview(@PathVariable UUID id) {
        contentService.deleteReview(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa đánh giá thành công."));
    }

    // ==========================================
    // 4. FAQ (HỎI ĐÁP NHANH)
    // ==========================================
    @GetMapping("/faqs")
    @Operation(summary = "Lấy danh sách câu hỏi thường gặp FAQ", description = "Truy xuất danh sách câu hỏi và câu trả lời thường gặp theo nhóm danh mục hỗ trợ khách hàng")
    public ResponseEntity<List<FaqResponse>> getAllFaqs(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean publishedOnly) {
        return ResponseEntity.ok(contentService.getAllFaqs(category, publishedOnly));
    }

    @PostMapping("/faqs")
    @Operation(summary = "Thêm câu hỏi FAQ mới", description = "Tạo mới một cặp câu hỏi và câu trả lời hướng dẫn sử dụng tủ SmartBox")
    public ResponseEntity<FaqResponse> createFaq(@RequestBody FaqRequest req) {
        return ResponseEntity.ok(contentService.createFaq(req));
    }

    @PutMapping("/faqs/{id}")
    @Operation(summary = "Chỉnh sửa câu hỏi FAQ", description = "Cập nhật nội dung câu hỏi, câu trả lời hoặc thứ tự ưu tiên của mục FAQ")
    public ResponseEntity<FaqResponse> updateFaq(
            @PathVariable UUID id,
            @RequestBody FaqRequest req) {
        return ResponseEntity.ok(contentService.updateFaq(id, req));
    }

    @PatchMapping("/faqs/{id}/toggle")
    @Operation(summary = "Bật/tắt hiển thị câu hỏi FAQ", description = "Ẩn hoặc hiện câu hỏi thường gặp trên trang trợ giúp khách hàng")
    public ResponseEntity<FaqResponse> toggleFaqStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.toggleFaqStatus(id));
    }

    @DeleteMapping("/faqs/{id}")
    @Operation(summary = "Xóa câu hỏi FAQ", description = "Xóa mục câu hỏi thường gặp khỏi hệ thống hỗ trợ")
    public ResponseEntity<Map<String, Object>> deleteFaq(@PathVariable UUID id) {
        contentService.deleteFaq(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa câu hỏi FAQ thành công."));
    }
}
