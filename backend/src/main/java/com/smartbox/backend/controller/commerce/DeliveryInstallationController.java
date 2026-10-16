package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Acceptance;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Assignment;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Command;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Failure;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Installation;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Note;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Reassignment;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Serial;
import com.smartbox.backend.service.commerce.DeliveryInstallationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Delivery & Installation API", description = "Quản lý luồng giao hàng và lắp đặt của kỹ thuật viên")
public class DeliveryInstallationController {

    private final DeliveryInstallationService jobs;

    @PostMapping("/api/orders/{id}/delivery-installation")
    @Operation(summary = "Phân công kỹ thuật viên giao và lắp đặt cho đơn hàng")
    public ResponseEntity<Map<String, Object>> assign(
            @PathVariable UUID id,
            @Valid @RequestBody Assignment request,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobs.assign(id, request, key));
    }

    @GetMapping("/api/orders/{id}/delivery-installation")
    @Operation(summary = "Lấy thông tin công việc giao lắp của đơn hàng")
    public Map<String, Object> forOrder(@PathVariable UUID id) {
        return jobs.forOrder(id);
    }

    @GetMapping("/api/delivery-installations/eligible-orders")
    @Operation(summary = "Lấy danh sách đơn hàng đủ điều kiện phân công giao lắp")
    public Map<String, Object> eligible(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return jobs.eligible(page, size);
    }

    @GetMapping("/api/delivery-installations/technicians")
    @Operation(summary = "Lấy danh sách kỹ thuật viên khả dụng")
    public List<Map<String, Object>> technicians() {
        return jobs.technicians();
    }

    @GetMapping("/api/delivery-installations/my-jobs")
    @Operation(summary = "Lấy danh sách công việc giao lắp của kỹ thuật viên hiện tại")
    public Map<String, Object> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        return jobs.list(true, page, size, status);
    }

    @GetMapping("/api/delivery-installations")
    @Operation(summary = "Lấy toàn bộ công việc giao lắp trong hệ thống")
    public Map<String, Object> all(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        return jobs.list(false, page, size, status);
    }

    @GetMapping("/api/delivery-installations/{id}")
    @Operation(summary = "Lấy chi tiết công việc giao lắp")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return jobs.detail(id);
    }

    @GetMapping("/api/delivery-installations/{id}/checks")
    @Operation(summary = "Lấy danh sách kiểm tra lắp đặt")
    public Map<String, Object> checks(@PathVariable UUID id) {
        return jobs.checks(id);
    }

    @PostMapping("/api/delivery-installations/{id}/start")
    @Operation(summary = "Bắt đầu thực hiện công việc giao lắp")
    public Map<String, Object> start(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.progress(id, "START", new Note(null), version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/confirm-delivery")
    @Operation(summary = "Xác nhận đã giao hàng tới địa chỉ khách hàng")
    public Map<String, Object> delivery(
            @PathVariable UUID id,
            @Valid @RequestBody Note request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.progress(id, "DELIVER", request, version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/devices")
    @Operation(summary = "Quét số serial thiết bị lắp đặt thực tế")
    public Map<String, Object> serial(
            @PathVariable UUID id,
            @Valid @RequestBody Serial request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.serial(id, request, version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/checks/commands")
    @Operation(summary = "Kiểm thử lệnh thiết bị khi lắp đặt")
    public ResponseEntity<Map<String, Object>> command(
            @PathVariable UUID id,
            @Valid @RequestBody Command request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return ResponseEntity.accepted().body(jobs.command(id, request, version, key));
    }

    @PostMapping("/api/delivery-installations/{id}/confirm-installation")
    @Operation(summary = "Xác nhận hoàn tất lắp đặt vật lý")
    public Map<String, Object> installation(
            @PathVariable UUID id,
            @Valid @RequestBody Installation request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.progress(id, "INSTALL", request, version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/acceptance")
    @Operation(summary = "Ký biên bản nghiệm thu và kích hoạt gói bảo hành cho khách")
    public Map<String, Object> acceptance(
            @PathVariable UUID id,
            @Valid @RequestBody Acceptance request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.progress(id, "ACCEPT", request, version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/fail")
    @Operation(summary = "Báo cáo sự cố hoặc không thể hoàn thành giao lắp")
    public Map<String, Object> fail(
            @PathVariable UUID id,
            @Valid @RequestBody Failure request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.progress(id, "FAIL", request, version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/reassign")
    @Operation(summary = "Chuyển giao việc cho kỹ thuật viên khác")
    public Map<String, Object> reassign(
            @PathVariable UUID id,
            @Valid @RequestBody Reassignment request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.progress(id, "REASSIGN", request, version, key);
    }
}
