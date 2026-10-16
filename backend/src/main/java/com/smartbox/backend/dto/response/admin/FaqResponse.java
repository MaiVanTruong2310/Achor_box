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
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết câu hỏi thường gặp FAQ")
public class FaqResponse {

    @Schema(description = "ID câu hỏi")
    private UUID id;

    @Schema(description = "Nội dung câu hỏi", example = "Làm sao để mở hộp khi mất kết nối mạng?")
    private String question;

    @Schema(description = "Câu trả lời giải đáp")
    private String answer;

    @Schema(description = "Chuyên mục", example = "technical")
    private String category;

    @Schema(description = "Thứ tự hiển thị", example = "1")
    private Integer displayOrder;

    @Schema(description = "Trạng thái công khai", example = "true")
    private Boolean isPublished;

    @Schema(description = "Số lượt bình chọn hữu ích", example = "35")
    private Integer helpfulCount;

    @Schema(description = "Thời gian tạo")
    private OffsetDateTime createdAt;

    @Schema(description = "Thời gian cập nhật")
    private OffsetDateTime updatedAt;
}
