package com.smartbox.backend.controller.warranty;

import com.smartbox.backend.service.warranty.WarrantyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Warranty API", description = "Quản lý bảo hành điện tử, tra cứu Serial/QR, tiếp nhận khiếu nại và kỹ thuật viên")
public class PublicWarrantyController {

    private final WarrantyService warranties;

    @GetMapping("/api/public/warranty-lookup")
    @Operation(summary = "Tra cứu công khai thời hạn bảo hành theo serial", description = "Chỉ trả về sản phẩm, hiệu lực và thời hạn; không trả thông tin chủ sở hữu, vị trí hay trạng thái thiết bị")
    public Map<String, Object> lookup(@RequestParam String serial) {
        return warranties.publicLookup(serial);
    }
}
