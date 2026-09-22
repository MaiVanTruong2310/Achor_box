package com.smartbox.backend.controller;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.*;
import com.smartbox.backend.dto.response.*;
import com.smartbox.backend.service.ContentService;
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
    @Operation(summary = "Lấy số liệu thống kê tổng quan CMS")
    public ResponseEntity<ContentSummaryStatsResponse> getSummaryStats() {
        return ResponseEntity.ok(contentService.getSummaryStats());
    }

    // ==========================================
    // 1. ARTICLES (BÀI VIẾT BLOG / TIN TỨC)
    // ==========================================
    @GetMapping("/articles")
    @Operation(summary = "Lấy danh sách bài viết blog / tin tức")
    public ResponseEntity<List<ArticleResponse>> getAllArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(contentService.getAllArticles(category, status));
    }

    @GetMapping("/articles/paged")
    @Operation(summary = "Lấy danh sách bài viết có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getArticlesPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(contentService.getArticlesPaged(page, size));
    }

    @GetMapping("/articles/{id}")
    @Operation(summary = "Lấy chi tiết một bài viết theo ID")
    public ResponseEntity<ArticleResponse> getArticleById(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.getArticleById(id));
    }

    @PostMapping("/articles")
    @Operation(summary = "Tạo bài viết mới")
    public ResponseEntity<ArticleResponse> createArticle(@RequestBody ArticleRequest req) {
        return ResponseEntity.ok(contentService.createArticle(req));
    }

    @PutMapping("/articles/{id}")
    @Operation(summary = "Chỉnh sửa bài viết")
    public ResponseEntity<ArticleResponse> updateArticle(
            @PathVariable UUID id,
            @RequestBody ArticleRequest req) {
        return ResponseEntity.ok(contentService.updateArticle(id, req));
    }

    @DeleteMapping("/articles/{id}")
    @Operation(summary = "Xóa bài viết")
    public ResponseEntity<Map<String, Object>> deleteArticle(@PathVariable UUID id) {
        contentService.deleteArticle(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa bài viết thành công."));
    }

    // ==========================================
    // 2. BANNERS (HÌNH ẢNH TRANG CHỦ)
    // ==========================================
    @GetMapping("/banners")
    @Operation(summary = "Lấy danh sách banner trang chủ & quảng cáo")
    public ResponseEntity<List<BannerResponse>> getAllBanners(
            @RequestParam(required = false) String position,
            @RequestParam(required = false) Boolean activeOnly) {
        return ResponseEntity.ok(contentService.getAllBanners(position, activeOnly));
    }

    @PostMapping("/banners")
    @Operation(summary = "Thêm banner mới")
    public ResponseEntity<BannerResponse> createBanner(@RequestBody BannerRequest req) {
        return ResponseEntity.ok(contentService.createBanner(req));
    }

    @PutMapping("/banners/{id}")
    @Operation(summary = "Chỉnh sửa thông tin banner")
    public ResponseEntity<BannerResponse> updateBanner(
            @PathVariable UUID id,
            @RequestBody BannerRequest req) {
        return ResponseEntity.ok(contentService.updateBanner(id, req));
    }

    @PatchMapping("/banners/{id}/toggle")
    @Operation(summary = "Bật/tắt trạng thái hiển thị của banner")
    public ResponseEntity<BannerResponse> toggleBannerStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.toggleBannerStatus(id));
    }

    @DeleteMapping("/banners/{id}")
    @Operation(summary = "Xóa banner")
    public ResponseEntity<Map<String, Object>> deleteBanner(@PathVariable UUID id) {
        contentService.deleteBanner(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa banner thành công."));
    }

    // ==========================================
    // 3. PRODUCT REVIEWS (ĐÁNH GIÁ SẢN PHẨM)
    // ==========================================
    @GetMapping("/reviews")
    @Operation(summary = "Lấy danh sách đánh giá sản phẩm của khách hàng")
    public ResponseEntity<List<ProductReviewResponse>> getAllReviews(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID productId) {
        return ResponseEntity.ok(contentService.getAllReviews(status, productId));
    }

    @GetMapping("/reviews/paged")
    @Operation(summary = "Lấy danh sách đánh giá sản phẩm có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getReviewsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(contentService.getReviewsPaged(page, size));
    }

    @PatchMapping("/reviews/{id}/status")
    @Operation(summary = "Cập nhật trạng thái duyệt/ẩn đánh giá")
    public ResponseEntity<ProductReviewResponse> updateReviewStatus(
            @PathVariable UUID id,
            @RequestBody ReviewStatusUpdateRequest req) {
        return ResponseEntity.ok(contentService.updateReviewStatus(id, req));
    }

    @PostMapping("/reviews/{id}/reply")
    @Operation(summary = "Admin gửi phản hồi chính thức cho đánh giá")
    public ResponseEntity<ProductReviewResponse> replyReview(
            @PathVariable UUID id,
            @RequestBody ReviewReplyRequest req) {
        return ResponseEntity.ok(contentService.replyReview(id, req));
    }

    @DeleteMapping("/reviews/{id}")
    @Operation(summary = "Xóa đánh giá khỏi hệ thống")
    public ResponseEntity<Map<String, Object>> deleteReview(@PathVariable UUID id) {
        contentService.deleteReview(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa đánh giá thành công."));
    }

    // ==========================================
    // 4. FAQ (HỎI ĐÁP NHANH)
    // ==========================================
    @GetMapping("/faqs")
    @Operation(summary = "Lấy danh sách câu hỏi thường gặp FAQ")
    public ResponseEntity<List<FaqResponse>> getAllFaqs(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean publishedOnly) {
        return ResponseEntity.ok(contentService.getAllFaqs(category, publishedOnly));
    }

    @PostMapping("/faqs")
    @Operation(summary = "Thêm câu hỏi FAQ mới")
    public ResponseEntity<FaqResponse> createFaq(@RequestBody FaqRequest req) {
        return ResponseEntity.ok(contentService.createFaq(req));
    }

    @PutMapping("/faqs/{id}")
    @Operation(summary = "Chỉnh sửa câu hỏi FAQ")
    public ResponseEntity<FaqResponse> updateFaq(
            @PathVariable UUID id,
            @RequestBody FaqRequest req) {
        return ResponseEntity.ok(contentService.updateFaq(id, req));
    }

    @PatchMapping("/faqs/{id}/toggle")
    @Operation(summary = "Bật/tắt hiển thị câu hỏi FAQ")
    public ResponseEntity<FaqResponse> toggleFaqStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.toggleFaqStatus(id));
    }

    @DeleteMapping("/faqs/{id}")
    @Operation(summary = "Xóa câu hỏi FAQ")
    public ResponseEntity<Map<String, Object>> deleteFaq(@PathVariable UUID id) {
        contentService.deleteFaq(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa câu hỏi FAQ thành công."));
    }
}
