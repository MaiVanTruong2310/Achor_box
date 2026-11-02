package com.smartbox.backend.controller.warranty;

import com.smartbox.backend.dto.request.warranty.CustomerClaimRequest;
import com.smartbox.backend.service.warranty.AcceptanceWarrantyService;
import com.smartbox.backend.service.warranty.CustomerWarrantyClaimService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Warranty API", description = "Quản lý bảo hành điện tử, tra cứu Serial/QR, tiếp nhận khiếu nại và kỹ thuật viên")
public class CustomerWarrantyController {

    private final AcceptanceWarrantyService warranties;
    private final CustomerWarrantyClaimService claims;

    @GetMapping("/api/customer/warranties")
    @Operation(summary = "Lấy danh sách các gói bảo hành của thiết bị mà khách hàng sở hữu", description = "Truy xuất thông tin các gói bảo hành còn hiệu lực hoặc đã hết hạn của các thiết bị SmartBox đã mua")
    public Map<String, Object> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String serial) {
        return warranties.mine(page, size, serial);
    }

    @PostMapping(value = "/api/customer/warranties/{id}/images", consumes = "multipart/form-data")
    @Operation(summary = "Tải ảnh đính kèm minh chứng cho yêu cầu bảo hành", description = "Tải ảnh JPG/PNG minh chứng sự cố của thiết bị lên bucket warranty-claims của Supabase Storage")
    public Map<String, Object> upload(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file) {
        return claims.upload(id, file);
    }

    @DeleteMapping("/api/customer/warranties/{id}/images/{imageId}")
    @Operation(summary = "Xóa ảnh đính kèm chưa gửi", description = "Gỡ ảnh đã tải lên nhưng chưa gắn vào yêu cầu bảo hành nào, giải phóng hạn mức ảnh chờ")
    public Map<String, Object> deleteImage(@PathVariable UUID id, @PathVariable UUID imageId) {
        return claims.deleteImage(id, imageId);
    }

    @PostMapping("/api/customer/warranty-claims")
    @Operation(summary = "Gửi yêu cầu bảo hành thiết bị mới", description = "Tạo phiếu yêu cầu bảo hành mới kèm theo mô tả chi tiết lỗi gặp phải và danh sách ảnh minh chứng")
    public Map<String, Object> create(
            @Valid @RequestBody CustomerClaimRequest request,
            @RequestHeader("Idempotency-Key") UUID key) {
        return claims.create(request, key);
    }

    @GetMapping("/api/customer/warranty-claims")
    @Operation(summary = "Lấy danh sách yêu cầu bảo hành đã gửi của khách hàng", description = "Khách hàng theo dõi tiến độ xử lý của tất cả các yêu cầu bảo hành mà mình đã gửi")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return claims.list(page, size);
    }

    @GetMapping("/api/customer/warranty-claims/{id}")
    @Operation(summary = "Lấy chi tiết yêu cầu bảo hành của khách hàng", description = "Xem chi tiết phản hồi của kỹ thuật viên, trạng thái xử lý và phương án khắc phục sự cố")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return claims.detail(id);
    }
}
