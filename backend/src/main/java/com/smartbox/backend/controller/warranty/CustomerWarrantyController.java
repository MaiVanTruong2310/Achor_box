package com.smartbox.backend.controller.warranty;

import com.smartbox.backend.dto.request.warranty.CustomerClaimRequest;
import com.smartbox.backend.service.warranty.AcceptanceWarrantyService;
import com.smartbox.backend.service.warranty.CustomerWarrantyClaimService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
@Tag(name = "Customer Warranty API", description = "Quản lý bảo hành và gửi yêu cầu khiếu nại bảo hành của khách hàng")
public class CustomerWarrantyController {

    private final AcceptanceWarrantyService warranties;
    private final CustomerWarrantyClaimService claims;

    @GetMapping("/api/customer/warranties")
    @Operation(summary = "Lấy danh sách các gói bảo hành của thiết bị mà khách hàng sở hữu")
    public Map<String, Object> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return warranties.mine(page, size);
    }

    @PostMapping(value = "/api/customer/warranties/{id}/images", consumes = "multipart/form-data")
    @Operation(summary = "Tải ảnh đính kèm minh chứng cho yêu cầu bảo hành")
    public Map<String, Object> upload(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file) {
        return claims.upload(id, file);
    }

    @PostMapping("/api/customer/warranty-claims")
    @Operation(summary = "Gửi yêu cầu bảo hành thiết bị mới")
    public Map<String, Object> create(
            @Valid @RequestBody CustomerClaimRequest request,
            @RequestHeader("Idempotency-Key") UUID key) {
        return claims.create(request, key);
    }

    @GetMapping("/api/customer/warranty-claims")
    @Operation(summary = "Lấy danh sách yêu cầu bảo hành đã gửi của khách hàng")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return claims.list(page, size);
    }

    @GetMapping("/api/customer/warranty-claims/{id}")
    @Operation(summary = "Lấy chi tiết yêu cầu bảo hành của khách hàng")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return claims.detail(id);
    }
}
