package com.smartbox.backend.controller.auth;

import com.smartbox.backend.dto.request.customer.CustomerRequests;
import com.smartbox.backend.service.auth.CustomerAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@Tag(name = "Customer Account API", description = "Quản lý thông tin hồ sơ cá nhân và sổ địa chỉ giao hàng của khách hàng")
public class CustomerAccountController {

    private final CustomerAccountService customers;

    @GetMapping("/profile")
    @Operation(summary = "Xem thông tin hồ sơ của khách hàng hiện tại", description = "Lấy toàn bộ thông tin tài khoản, hồ sơ cá nhân và quyền hạn của khách hàng đang đăng nhập")
    public Map<String, Object> profile() {
        return customers.profile();
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật thông tin hồ sơ cá nhân của khách hàng", description = "Cập nhật họ tên, số điện thoại, ngày sinh và các thông tin liên hệ của khách hàng")
    public Map<String, Object> profile(@Valid @RequestBody CustomerRequests.ProfileUpdate request) {
        return customers.updateProfile(request);
    }

    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    @Operation(summary = "Tải lên ảnh đại diện của khách hàng lên Cloudinary và cập nhật hồ sơ", description = "Nhận file ảnh đại diện từ client, tải lên Cloudinary và tự động lưu URL vào hồ sơ cá nhân của khách hàng")
    public Map<String, String> uploadAvatar(@RequestPart("file") MultipartFile file) {
        return customers.uploadAvatar(file);
    }

    @GetMapping("/addresses")
    @Operation(summary = "Lấy danh sách sổ địa chỉ nhận hàng của khách hàng", description = "Truy xuất tất cả các địa chỉ giao hàng đã lưu trong sổ địa chỉ của khách hàng, bao gồm địa chỉ mặc định")
    public List<Map<String, Object>> addresses() {
        return customers.addresses();
    }

    @PostMapping("/addresses")
    @Operation(summary = "Thêm mới một địa chỉ giao hàng vào sổ địa chỉ", description = "Thêm một địa chỉ nhận hàng mới với đầy đủ thông tin người nhận, số điện thoại, tỉnh/thành, quận/huyện, phường/xã và địa chỉ chi tiết")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CustomerRequests.Address request) {
        return ResponseEntity.status(201).body(customers.saveAddress(null, request));
    }

    @PutMapping("/addresses/{id}")
    @Operation(summary = "Cập nhật thông tin một địa chỉ giao hàng", description = "Chỉnh sửa thông tin địa chỉ giao nhận cụ thể theo ID trong sổ địa chỉ của khách hàng")
    public Map<String, Object> update(@PathVariable UUID id, @Valid @RequestBody CustomerRequests.Address request) {
        return customers.saveAddress(id, request);
    }

    @DeleteMapping("/addresses/{id}")
    @Operation(summary = "Xóa một địa chỉ khỏi sổ địa chỉ của khách hàng", description = "Xóa bỏ địa chỉ giao hàng tương ứng với ID được chỉ định khỏi danh sách địa chỉ đã lưu")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        customers.deleteAddress(id);
        return ResponseEntity.noContent().build();
    }
}
