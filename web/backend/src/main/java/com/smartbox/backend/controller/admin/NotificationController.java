package com.smartbox.backend.controller.admin;

import com.smartbox.backend.service.admin.PushNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
@Tag(name = "Notification API", description = "Quản lý thông báo hệ thống và push notification dành cho người dùng và quản trị viên")
public class NotificationController {

    private final PushNotificationService push;

    public record Token(@NotBlank @Size(max=4096) String token){}
    public record Preference(@NotNull Boolean enabled){}

    @PostMapping("/tokens")
    @Operation(summary = "Đăng ký thiết bị nhận thông báo đẩy (FCM Token)", description = "Lưu trữ device token của ứng dụng di động hoặc trình duyệt web để gửi thông báo push trực tiếp")
    public Map<String,Object> register(@Valid @RequestBody Token request) {
        return push.register(request.token());
    }

    @DeleteMapping("/tokens/{id}")
    @Operation(summary = "Hủy đăng ký token nhận thông báo", description = "Xóa bỏ token thiết bị khỏi danh sách nhận thông báo khi người dùng đăng xuất")
    public void remove(@PathVariable UUID id) {
        push.remove(id);
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo của người dùng", description = "Truy xuất danh sách thông báo cá nhân có phân trang, sắp xếp theo thời gian mới nhất")
    public List<Map<String,Object>> list(@RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        return push.list(page, size);
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Đánh dấu thông báo đã đọc", description = "Cập nhật trạng thái của thông báo cụ thể sang đã đọc (read = true)")
    public void read(@PathVariable UUID id) {
        push.read(id);
    }

    @PutMapping("/preferences/{event}")
    @Operation(summary = "Cập nhật cấu hình nhận thông báo theo loại sự kiện", description = "Bật hoặc tắt việc nhận thông báo đối với một loại sự kiện cụ thể (đơn hàng, bảo hành, khuyến mãi)")
    public void preference(@PathVariable String event, @Valid @RequestBody Preference request) {
        push.preference(event, request.enabled());
    }
}
