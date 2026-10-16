package com.smartbox.backend.dto.request.admin;

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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu tạo hoặc cập nhật Banner quảng cáo")
public class BannerRequest {

    @Schema(description = "Tiêu đề banner", example = "Khuyến mãi mùa hè sôi động")
    private String title;

    @Schema(description = "URL hình ảnh banner")
    private String imageUrl;

    @Schema(description = "Đường dẫn liên kết khi click")
    private String targetUrl;

    @Schema(description = "Vị trí hiển thị (hero_home, mid_banner, sidebar, popup_promo)", example = "hero_home")
    private String position;

    @Schema(description = "Thứ tự sắp xếp hiển thị", example = "1")
    private Integer displayOrder;

    @Schema(description = "Trạng thái kích hoạt", example = "true")
    private Boolean isActive;

    @Schema(description = "Ngày bắt đầu hiển thị (ISO String)")
    private String startDate;

    @Schema(description = "Ngày kết thúc hiển thị (ISO String)")
    private String endDate;
}
