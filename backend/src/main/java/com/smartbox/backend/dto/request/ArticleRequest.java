package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu tạo hoặc cập nhật bài viết blog / tin tức")
public class ArticleRequest {

    @Schema(description = "Tiêu đề bài viết", example = "Hướng dẫn kết nối SmartBox với app di động")
    private String title;

    @Schema(description = "Đường dẫn slug thân thiện", example = "huong-dan-ket-noi-smartbox-app")
    private String slug;

    @Schema(description = "Chuyên mục (product_intro, guide, tech_news, promotion)", example = "guide")
    private String category;

    @Schema(description = "Tóm tắt ngắn bài viết")
    private String summary;

    @Schema(description = "Nội dung bài viết HTML / Markdown")
    private String content;

    @Schema(description = "Ảnh bìa đại diện")
    private String coverImage;

    @Schema(description = "Tên tác giả", example = "Ban Biên Tập SmartBox")
    private String authorName;

    @Schema(description = "Trạng thái bài viết (published, draft, archived)", example = "published")
    private String status;

    @Schema(description = "Danh sách thẻ tags")
    private List<String> tags;
}
