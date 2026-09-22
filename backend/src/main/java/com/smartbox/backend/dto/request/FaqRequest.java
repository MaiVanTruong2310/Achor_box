package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu tạo hoặc cập nhật câu hỏi thường gặp FAQ")
public class FaqRequest {

    @Schema(description = "Câu hỏi", example = "Làm sao để mở hộp khi mất kết nối mạng?")
    private String question;

    @Schema(description = "Câu trả lời giải đáp")
    private String answer;

    @Schema(description = "Chuyên mục FAQ (warranty, technical, usage, payment)", example = "technical")
    private String category;

    @Schema(description = "Thứ tự hiển thị", example = "1")
    private Integer displayOrder;

    @Schema(description = "Trạng thái công khai lên web", example = "true")
    private Boolean isPublished;
}
