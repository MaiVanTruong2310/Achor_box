package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu ghi chú nội bộ cho ca bảo hành")
public class NotesUpdateRequest {

    @Schema(description = "Nội dung ghi chú nội bộ", example = "Đã kiểm tra bo mạch, chuẩn bị thay module relay")
    private String notes;
}
