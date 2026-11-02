package com.smartbox.backend.controller.warranty;

import com.smartbox.backend.service.warranty.WarrantyPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Warranty API", description = "Quản lý bảo hành điện tử, tra cứu Serial/QR, tiếp nhận khiếu nại và kỹ thuật viên")
public class WarrantyPlanController {

    private final WarrantyPlanService plans;

    @GetMapping("/api/warranty-plans")
    @Operation(summary = "Danh sách gói bảo hành mua thêm đang bán", description = "Gói gia hạn bảo hành khách có thể chọn kèm từng sản phẩm khi đặt hàng")
    public List<Map<String, Object>> active() {
        return plans.active();
    }
}
