package com.smartbox.backend.service.admin;

import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.request.admin.ArticleRequest;
import com.smartbox.backend.dto.request.admin.BannerRequest;
import com.smartbox.backend.dto.request.admin.FaqRequest;
import com.smartbox.backend.dto.request.catalog.ReviewReplyRequest;
import com.smartbox.backend.dto.request.catalog.ReviewStatusUpdateRequest;
import com.smartbox.backend.dto.response.admin.ArticleResponse;
import com.smartbox.backend.dto.response.admin.BannerResponse;
import com.smartbox.backend.dto.response.admin.ContentSummaryStatsResponse;
import com.smartbox.backend.dto.response.admin.FaqResponse;
import com.smartbox.backend.dto.response.catalog.ProductReviewResponse;
import com.smartbox.backend.entity.Article;
import com.smartbox.backend.entity.Banner;
import com.smartbox.backend.entity.FaqItem;
import com.smartbox.backend.entity.ProductReview;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.ArticleRepository;
import com.smartbox.backend.repository.BannerRepository;
import com.smartbox.backend.repository.FaqRepository;
import com.smartbox.backend.repository.ProductReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly=true)
public class ContentService {

    private final ArticleRepository articleRepository;
    private final BannerRepository bannerRepository;
    private final ProductReviewRepository reviewRepository;
    private final FaqRepository faqRepository;

    // ==========================================
    // 0. SUMMARY STATS
    // ==========================================
    public ContentSummaryStatsResponse getSummaryStats() {
        return ContentSummaryStatsResponse.builder()
                .totalArticles(articleRepository.count())
                .publishedArticles(articleRepository.countByStatus("published"))
                .totalBanners(bannerRepository.count())
                .activeBanners(bannerRepository.countByIsActiveTrue())
                .totalReviews(reviewRepository.count())
                .pendingReviews(reviewRepository.countByStatus("pending"))
                .totalFaqs(faqRepository.count())
                .build();
    }

    // ==========================================
    // 1. ARTICLES
    // ==========================================
    public List<ArticleResponse> getAllArticles(String category, String status) {
        List<Article> list;
        if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("all")) {
            list = articleRepository.findByCategoryOrderByCreatedAtDesc(category);
        } else if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("all")) {
            list = articleRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            list = articleRepository.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().filter(a->status==null||status.isBlank()||status.equalsIgnoreCase("all")||status.equals(a.getStatus())).map(this::mapToArticleResponse).collect(Collectors.toList());
    }

    public Map<String, Object> getArticlesPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ArticleResponse> pageResult = articleRepository.findAll(pageable).map(this::mapToArticleResponse);
        return PaginationUtil.toMap(pageResult);
    }

    public ArticleResponse getArticleById(UUID id) {
        Article a = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bài viết", "id", id));
        return mapToArticleResponse(a);
    }

    @Transactional
    public ArticleResponse createArticle(ArticleRequest req) {
        String slug = req.getSlug();
        if (slug == null || slug.trim().isEmpty()) {
            slug = generateSlug(req.getTitle());
        }
        if (articleRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis() % 10000;
        }

        String tagsStr = (req.getTags() != null) ? String.join(",", req.getTags()) : "";
        OffsetDateTime pubAt = "published".equalsIgnoreCase(req.getStatus()) ? OffsetDateTime.now() : null;

        Article article = Article.builder()
                .title(req.getTitle())
                .slug(slug)
                .category(req.getCategory() != null ? req.getCategory() : "guide")
                .summary(req.getSummary())
                .content(req.getContent())
                .coverImage(req.getCoverImage())
                .authorName(req.getAuthorName() != null ? req.getAuthorName() : "Ban Biên Tập SmartBox")
                .status(req.getStatus() != null ? req.getStatus() : "published")
                .viewCount(0)
                .tags(tagsStr)
                .publishedAt(pubAt)
                .build();

        Article saved = articleRepository.save(article);
        log.info("Tạo bài viết mới thành công: {} (id: {})", saved.getTitle(), saved.getId());
        return mapToArticleResponse(saved);
    }

    @Transactional
    public ArticleResponse updateArticle(UUID id, ArticleRequest req) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bài viết", "id", id));

        if (req.getTitle() != null) article.setTitle(req.getTitle());
        if (req.getCategory() != null) article.setCategory(req.getCategory());
        if (req.getSummary() != null) article.setSummary(req.getSummary());
        if (req.getContent() != null) article.setContent(req.getContent());
        if (req.getCoverImage() != null) article.setCoverImage(req.getCoverImage());
        if (req.getAuthorName() != null) article.setAuthorName(req.getAuthorName());
        if (req.getTags() != null) article.setTags(String.join(",", req.getTags()));

        if (req.getStatus() != null) {
            if ("published".equalsIgnoreCase(req.getStatus()) && article.getPublishedAt() == null) {
                article.setPublishedAt(OffsetDateTime.now());
            }
            article.setStatus(req.getStatus());
        }

        Article updated = articleRepository.save(article);
        return mapToArticleResponse(updated);
    }

    @Transactional
    public void deleteArticle(UUID id) {
        if (!articleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Bài viết", "id", id);
        }
        articleRepository.deleteById(id);
        log.info("Đã xóa bài viết id: {}", id);
    }

    private ArticleResponse mapToArticleResponse(Article a) {
        List<String> tagsList = (a.getTags() != null && !a.getTags().trim().isEmpty())
                ? Arrays.asList(a.getTags().split(","))
                : Collections.emptyList();

        return ArticleResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .slug(a.getSlug())
                .category(a.getCategory())
                .summary(a.getSummary())
                .content(a.getContent())
                .coverImage(a.getCoverImage())
                .authorName(a.getAuthorName())
                .status(a.getStatus())
                .viewCount(a.getViewCount())
                .tags(tagsList)
                .publishedAt(a.getPublishedAt())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    // ==========================================
    // 2. BANNERS
    // ==========================================
    public List<BannerResponse> getAllBanners(String position, Boolean activeOnly) {
        List<Banner> list;
        if (Boolean.TRUE.equals(activeOnly)) {
            list = bannerRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
        } else if (position != null && !position.trim().isEmpty() && !position.equalsIgnoreCase("all")) {
            list = bannerRepository.findByPositionOrderByDisplayOrderAsc(position);
        } else {
            list = bannerRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc();
        }
        return list.stream().map(this::mapToBannerResponse).collect(Collectors.toList());
    }

    @Transactional
    public BannerResponse createBanner(BannerRequest req) {
        Banner banner = Banner.builder()
                .title(req.getTitle())
                .imageUrl(req.getImageUrl())
                .targetUrl(req.getTargetUrl())
                .position(req.getPosition() != null ? req.getPosition() : "hero_home")
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 1)
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .clickCount(0)
                .startDate(req.getStartDate() != null ? OffsetDateTime.parse(req.getStartDate()) : OffsetDateTime.now())
                .endDate(req.getEndDate() != null ? OffsetDateTime.parse(req.getEndDate()) : OffsetDateTime.now().plusMonths(3))
                .build();

        Banner saved = bannerRepository.save(banner);
        return mapToBannerResponse(saved);
    }

    @Transactional
    public BannerResponse updateBanner(UUID id, BannerRequest req) {
        Banner b = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", "id", id));

        if (req.getTitle() != null) b.setTitle(req.getTitle());
        if (req.getImageUrl() != null) b.setImageUrl(req.getImageUrl());
        if (req.getTargetUrl() != null) b.setTargetUrl(req.getTargetUrl());
        if (req.getPosition() != null) b.setPosition(req.getPosition());
        if (req.getDisplayOrder() != null) b.setDisplayOrder(req.getDisplayOrder());
        if (req.getIsActive() != null) b.setIsActive(req.getIsActive());

        Banner updated = bannerRepository.save(b);
        return mapToBannerResponse(updated);
    }

    @Transactional
    public BannerResponse toggleBannerStatus(UUID id) {
        Banner b = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", "id", id));
        b.setIsActive(!b.getIsActive());
        return mapToBannerResponse(bannerRepository.save(b));
    }

    @Transactional
    public void deleteBanner(UUID id) {
        if (!bannerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Banner", "id", id);
        }
        bannerRepository.deleteById(id);
    }

    private BannerResponse mapToBannerResponse(Banner b) {
        return BannerResponse.builder()
                .id(b.getId())
                .title(b.getTitle())
                .imageUrl(b.getImageUrl())
                .targetUrl(b.getTargetUrl())
                .position(b.getPosition())
                .displayOrder(b.getDisplayOrder())
                .isActive(b.getIsActive())
                .clickCount(b.getClickCount())
                .startDate(b.getStartDate())
                .endDate(b.getEndDate())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }

    // ==========================================
    // 3. REVIEWS
    // ==========================================
    public List<ProductReviewResponse> getAllReviews(String status, UUID productId) {
        List<ProductReview> list;
        if (productId != null) {
            list = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
        } else if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("all")) {
            list = reviewRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            list = reviewRepository.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(this::mapToReviewResponse).collect(Collectors.toList());
    }

    public Map<String, Object> getReviewsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ProductReviewResponse> pageResult = reviewRepository.findAll(pageable).map(this::mapToReviewResponse);
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional
    public ProductReviewResponse updateReviewStatus(UUID id, ReviewStatusUpdateRequest req) {
        ProductReview r = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá", "id", id));

        if (req.getStatus() != null) {
            r.setStatus(req.getStatus());
        }
        if (req.getRejectReason() != null) {
            r.setRejectReason(req.getRejectReason());
        }

        return mapToReviewResponse(reviewRepository.save(r));
    }

    @Transactional
    public ProductReviewResponse replyReview(UUID id, ReviewReplyRequest req) {
        ProductReview r = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá", "id", id));

        r.setAdminReply(req.getAdminReply());
        r.setAdminRepliedAt(OffsetDateTime.now());

        return mapToReviewResponse(reviewRepository.save(r));
    }

    @Transactional
    public void deleteReview(UUID id) {
        if (!reviewRepository.existsById(id)) {
            throw new ResourceNotFoundException("Đánh giá", "id", id);
        }
        reviewRepository.deleteById(id);
    }

    private ProductReviewResponse mapToReviewResponse(ProductReview r) {
        List<String> imgList = (r.getImages() != null && !r.getImages().trim().isEmpty())
                ? Arrays.asList(r.getImages().split(","))
                : Collections.emptyList();

        return ProductReviewResponse.builder()
                .id(r.getId())
                .productId(r.getProductId())
                .productName(r.getProductName())
                .customerName(r.getCustomerName())
                .customerEmail(r.getCustomerEmail())
                .customerPhone(r.getCustomerPhone())
                .rating(r.getRating())
                .title(r.getTitle())
                .comment(r.getComment())
                .images(imgList)
                .status(r.getStatus())
                .rejectReason(r.getRejectReason())
                .adminReply(r.getAdminReply())
                .adminRepliedAt(r.getAdminRepliedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }

    // ==========================================
    // 4. FAQ
    // ==========================================
    public List<FaqResponse> getAllFaqs(String category, Boolean publishedOnly) {
        List<FaqItem> list;
        if (Boolean.TRUE.equals(publishedOnly)) {
            list = faqRepository.findByIsPublishedTrueOrderByDisplayOrderAsc();
        } else if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("all")) {
            list = faqRepository.findByCategoryOrderByDisplayOrderAsc(category);
        } else {
            list = faqRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc();
        }
        return list.stream().map(this::mapToFaqResponse).collect(Collectors.toList());
    }

    @Transactional
    public FaqResponse createFaq(FaqRequest req) {
        FaqItem faq = FaqItem.builder()
                .question(req.getQuestion())
                .answer(req.getAnswer())
                .category(req.getCategory() != null ? req.getCategory() : "general")
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 1)
                .isPublished(req.getIsPublished() != null ? req.getIsPublished() : true)
                .helpfulCount(0)
                .build();

        return mapToFaqResponse(faqRepository.save(faq));
    }

    @Transactional
    public FaqResponse updateFaq(UUID id, FaqRequest req) {
        FaqItem f = faqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FAQ", "id", id));

        if (req.getQuestion() != null) f.setQuestion(req.getQuestion());
        if (req.getAnswer() != null) f.setAnswer(req.getAnswer());
        if (req.getCategory() != null) f.setCategory(req.getCategory());
        if (req.getDisplayOrder() != null) f.setDisplayOrder(req.getDisplayOrder());
        if (req.getIsPublished() != null) f.setIsPublished(req.getIsPublished());

        return mapToFaqResponse(faqRepository.save(f));
    }

    @Transactional
    public FaqResponse toggleFaqStatus(UUID id) {
        FaqItem f = faqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FAQ", "id", id));
        f.setIsPublished(!f.getIsPublished());
        return mapToFaqResponse(faqRepository.save(f));
    }

    @Transactional
    public void deleteFaq(UUID id) {
        if (!faqRepository.existsById(id)) {
            throw new ResourceNotFoundException("FAQ", "id", id);
        }
        faqRepository.deleteById(id);
    }

    private FaqResponse mapToFaqResponse(FaqItem f) {
        return FaqResponse.builder()
                .id(f.getId())
                .question(f.getQuestion())
                .answer(f.getAnswer())
                .category(f.getCategory())
                .displayOrder(f.getDisplayOrder())
                .isPublished(f.getIsPublished())
                .helpfulCount(f.getHelpfulCount())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .build();
    }

    // Helper tạo slug tiếng Việt chuẩn SEO
    private String generateSlug(String input) {
        if (input == null || input.trim().isEmpty()) return "bai-viet-" + System.currentTimeMillis();
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String noDiacritics = pattern.matcher(normalized).replaceAll("").toLowerCase();
        noDiacritics = noDiacritics.replaceAll("đ", "d");
        noDiacritics = noDiacritics.replaceAll("[^a-z0-9\\s-]", "");
        noDiacritics = noDiacritics.replaceAll("\\s+", "-");
        noDiacritics = noDiacritics.replaceAll("-+", "-");
        return noDiacritics.replaceAll("^-|-$", "");
    }
}
