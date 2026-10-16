package com.smartbox.backend.controller.customer;

import com.smartbox.backend.dto.request.customer.CustomerDirectoryRequests;
import com.smartbox.backend.service.customer.CustomerDirectoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/customers")
@Tag(name = "Customer Directory API", description = "Quản lý danh bạ khách hàng, thông tin liên hệ và tạo tài khoản đăng nhập")
public class CustomerDirectoryController {

    private final CustomerDirectoryService customers;

    @GetMapping
    @Operation(summary = "Lấy danh sách khách hàng có tìm kiếm và phân trang")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "all") String account,
            @RequestParam(defaultValue = "active") String state) {
        return customers.list(page, size, search, account, state);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết hồ sơ khách hàng")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return customers.detail(id);
    }

    @PostMapping
    @Operation(summary = "Tạo mới khách hàng (có tùy chọn tạo tài khoản đăng nhập)")
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody @Valid CustomerDirectoryRequests.Create request,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(customers.create(request, key));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin khách hàng")
    public Map<String, Object> update(
            @PathVariable UUID id,
            @RequestBody @Valid CustomerDirectoryRequests.Update request) {
        return customers.update(id, request);
    }
}
