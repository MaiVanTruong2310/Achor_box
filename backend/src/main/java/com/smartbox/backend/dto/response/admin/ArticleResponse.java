package com.smartbox.backend.dto.response.admin;

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

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết bài viết blog / tin tức")
public class ArticleResponse {

    @Schema(description = "ID bài viết")
    private UUID id;

    @Schema(description = "Tiêu đề bài viết", example = "Hướng dẫn kết nối SmartBox")
    private String title;

    @Schema(description = "Đường dẫn slug", example = "huong-dan-ket-noi-smartbox")
    private String slug;

    @Schema(description = "Chuyên mục", example = "guide")
    private String category;

    @Schema(description = "Tóm tắt bài viết")
    private String summary;

    @Schema(description = "Nội dung chi tiết")
    private String content;

    @Schema(description = "Ảnh bìa đại diện")
    private String coverImage;

    @Schema(description = "Tên tác giả", example = "Admin")
    private String authorName;

    @Schema(description = "Trạng thái (published, draft, archived)", example = "published")
    private String status;

    @Schema(description = "Lượt xem", example = "128")
    private Integer viewCount;

    @Schema(description = "Danh sách thẻ tags")
    private List<String> tags;

    @Schema(description = "Thời gian xuất bản")
    private OffsetDateTime publishedAt;

    @Schema(description = "Thời gian tạo")
    private OffsetDateTime createdAt;

    @Schema(description = "Thời gian cập nhật")
    private OffsetDateTime updatedAt;
}
