package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Acceptance;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Assignment;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Command;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.CompletionSubmission;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Failure;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Installation;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Note;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.PoApprovalRequest;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Reassignment;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.RejectionRequest;
import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.Serial;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.commerce.DeliveryInstallationService;
import com.smartbox.backend.service.warranty.ClaimImageStorage;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Delivery & Installation API", description = "Quản lý luồng giao hàng và lắp đặt của kỹ thuật viên")
public class DeliveryInstallationController {

    private final DeliveryInstallationService jobs;
    private final ClaimImageStorage imageStorage;
    private final CurrentActor actors;

    @GetMapping("/api/delivery-installations/availability")
    @Operation(summary = "Kiểm tra lịch rảnh của các kỹ thuật viên")
    public List<Map<String, Object>> availability(
            @RequestParam OffsetDateTime start,
            @RequestParam(required = false) OffsetDateTime end) {
        return jobs.checkAvailability(start, end);
    }

    @PostMapping(value = "/api/delivery-installations/upload-proof", consumes = "multipart/form-data")
    @Operation(summary = "Tải ảnh minh chứng nghiệm thu")
    public Map<String, String> uploadProof(@RequestPart("file") MultipartFile file) {
        actors.get().requireRoles("technician", "product_manager", "super_admin");
        return Map.of("url", imageStorage.upload(file).secureUrl());
    }

    @PostMapping("/api/delivery-installations/{id}/submit-completion")
    @Operation(summary = "Kỹ thuật viên nộp báo cáo hoàn thành kèm ảnh minh chứng")
    public Map<String, Object> submitCompletion(
            @PathVariable UUID id,
            @Valid @RequestBody CompletionSubmission request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.submitCompletion(id, request, version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/approve-completion")
    @Operation(summary = "PO duyệt nghiệm thu và hoàn tất đơn hàng")
    public Map<String, Object> approveCompletion(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) PoApprovalRequest request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.approveCompletion(id, request, version, key);
    }

    @PostMapping("/api/delivery-installations/{id}/reject-completion")
    @Operation(summary = "PO yêu cầu kỹ thuật viên xử lý lại")
    public Map<String, Object> rejectCompletion(
            @PathVariable UUID id,
            @Valid @RequestBody RejectionRequest request,
            @RequestHeader(value = "If-Match", required = false) String version,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID key) {
        return jobs.rejectCompletion(id, request, version, key);
    }

    @GetMapping("/api/technician/daily-tasks")
    @Operation(summary = "Lấy danh sách công việc trong ngày của kỹ thuật viên (hỗ trợ thời khóa biểu)")
    public Map<String, Object> dailyTasks(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) UUID technicianId) {
        return jobs.dailyTasks(date, technicianId);
    }

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
