package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.dto.request.commerce.CommerceRequests;
import com.smartbox.backend.service.commerce.ApprovalTicketService;
import com.smartbox.backend.service.commerce.FulfillmentService;
import com.smartbox.backend.service.commerce.OrderWorkflowService;
import com.smartbox.backend.service.admin.OutboxService;
import com.smartbox.backend.service.commerce.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
@Tag(name = "Commerce API", description = "Quản lý đơn hàng, giỏ hàng, checkout, phê duyệt PO và xử lý giao vận")
public class CommerceController {

    private final OrderWorkflowService orders;
    private final PaymentService payments;
    private final ApprovalTicketService tickets;
    private final FulfillmentService fulfillment;
    private final OutboxService outbox;

    @PostMapping("/api/orders")
    @Operation(summary = "Tạo đơn hàng mới (Pending)")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CommerceRequests.CreateOrder request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orders.create(request));
    }

    @GetMapping("/api/orders/{id}")
    @Operation(summary = "Lấy chi tiết đơn hàng")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return orders.detail(id);
    }

    @GetMapping("/api/orders/my-orders")
    @Operation(summary = "Lấy danh sách đơn hàng của người dùng hiện tại")
    public List<Map<String, Object>> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orders.mine(page, size);
    }

    @GetMapping("/api/orders/{id}/history")
    @Operation(summary = "Lấy lịch sử thay đổi trạng thái đơn hàng")
    public List<Map<String, Object>> history(@PathVariable UUID id) {
        return orders.history(id);
    }

    @PostMapping("/api/orders/{id}/items")
    @Operation(summary = "Thêm sản phẩm/biến thể vào đơn hàng (REQ-01)")
    public Map<String, Object> add(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Item item) {
        return orders.add(id, item.variantId(), item.quantity());
    }

    @PatchMapping("/api/orders/{id}/items/{variantId}")
    @Operation(summary = "Cập nhật số lượng sản phẩm trong đơn hàng (REQ-01)")
    public Map<String, Object> quantity(
            @PathVariable UUID id,
            @PathVariable UUID variantId,
            @Valid @RequestBody CommerceRequests.Quantity request) {
        return orders.setQuantity(id, variantId, request.quantity());
    }

    @DeleteMapping("/api/orders/{id}/items/{variantId}")
    @Operation(summary = "Xóa sản phẩm khỏi đơn hàng (REQ-01)")
    public Map<String, Object> remove(
            @PathVariable UUID id,
            @PathVariable UUID variantId) {
        return orders.remove(id, variantId);
    }

    @PostMapping("/api/orders/{id}/voucher")
    @Operation(summary = "Áp dụng mã giảm giá voucher vào đơn hàng")
    public Map<String, Object> voucher(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return orders.applyVoucher(id, body.get("code"));
    }

    @PostMapping("/api/orders/{id}/checkout")
    @Operation(summary = "Checkout đơn hàng sang trạng thái chờ thanh toán (REQ-02)")
    public Map<String, Object> checkout(
            @PathVariable UUID id,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return payments.checkout(id, key);
    }

    @GetMapping("/api/orders/{id}/payment-session")
    @Operation(summary = "Lấy thông tin phiên thanh toán hiện tại của đơn hàng")
    public Map<String, Object> paymentSession(@PathVariable UUID id) {
        return payments.session(id);
    }

    @PostMapping("/api/orders/{id}/cancel")
    @Operation(summary = "Hủy đơn hàng")
    public Map<String, Object> cancel(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return orders.cancel(id, request.reason());
    }

    @PostMapping("/api/orders/{id}/customer-decision")
    @Operation(summary = "Khách hàng phản hồi xác nhận đơn khi có sản phẩm bị từ chối")
    public Map<String, Object> customerDecision(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.CustomerDecision request) {
        return tickets.customerDecision(id, request.accept());
    }

    @PostMapping("/api/payments/callback")
    @Operation(summary = "Nhận webhook callback thanh toán (REQ-02)")
    public Map<String, Object> callback(@Valid @RequestBody CommerceRequests.Callback request) {
        return payments.callback(request);
    }

    @GetMapping("/api/tickets")
    @Operation(summary = "Lấy danh sách phiếu phê duyệt đơn hàng PO")
    public List<Map<String, Object>> tickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return tickets.list(page, size);
    }

    @GetMapping("/api/tickets/{id}")
    @Operation(summary = "Chi tiết phiếu phê duyệt PO")
    public Map<String, Object> ticket(@PathVariable UUID id) {
        return tickets.detail(id);
    }

    @GetMapping("/api/orders/{id}/ticket")
    @Operation(summary = "Lấy phiếu phê duyệt PO theo mã đơn hàng")
    public Map<String, Object> ticketByOrder(@PathVariable UUID id) {
        return tickets.detailByOrder(id);
    }

    @PostMapping("/api/tickets/{id}/approve")
    @Operation(summary = "Phê duyệt phiếu PO")
    public Map<String, Object> approve(@PathVariable UUID id) {
        return tickets.act(id, "APPROVE", null);
    }

    @PostMapping("/api/tickets/{id}/return")
    @Operation(summary = "Yêu cầu chỉnh sửa phiếu PO")
    public Map<String, Object> returnTicket(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.act(id, "RETURN", request.reason());
    }

    @PostMapping("/api/tickets/{id}/resubmit")
    @Operation(summary = "Gửi lại phiếu PO sau khi chỉnh sửa")
    public Map<String, Object> resubmit(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.act(id, "RESUBMIT", request.reason());
    }

    @PostMapping("/api/tickets/{id}/reject")
    @Operation(summary = "Từ chối phiếu PO")
    public Map<String, Object> reject(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.act(id, "REJECT", request.reason());
    }

    @PostMapping("/api/tickets/{id}/items/{orderItemId}/approve")
    @Operation(summary = "PO duyệt một sản phẩm cụ thể trong đơn")
    public Map<String, Object> approveItem(
            @PathVariable UUID id,
            @PathVariable UUID orderItemId) {
        return tickets.actItem(id, orderItemId, "APPROVE", null);
    }

    @PostMapping("/api/tickets/{id}/items/{orderItemId}/reject")
    @Operation(summary = "PO từ chối một sản phẩm cụ thể trong đơn")
    public Map<String, Object> rejectItem(
            @PathVariable UUID id,
            @PathVariable UUID orderItemId,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.actItem(id, orderItemId, "REJECT", request.reason());
    }

    @PostMapping("/api/orders/{id}/shipment/ship")
    @Operation(summary = "Đánh dấu đơn hàng bắt đầu giao vận")
    public Map<String, Object> ship(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Shipment request) {
        return fulfillment.ship(id, request);
    }

    @PostMapping("/api/orders/{id}/shipment/deliver")
    @Operation(summary = "Xác nhận đã giao hàng thành công")
    public Map<String, Object> deliver(@PathVariable UUID id) {
        return fulfillment.delivered(id);
    }

    @PostMapping("/api/orders/{id}/devices")
    @Operation(summary = "Gán số serial thiết bị cho đơn hàng")
    public Map<String, Object> assign(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.DeviceAssignment request) {
        fulfillment.assign(id, request);
        return Map.of("assigned", true);
    }

    @GetMapping("/api/admin/refunds")
    @Operation(summary = "Lấy danh sách yêu cầu hoàn tiền")
    public List<Map<String, Object>> refunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return fulfillment.refunds(page, size);
    }

    @PostMapping("/api/admin/refunds/{id}/complete")
    @Operation(summary = "Hoàn tất xử lý hoàn tiền")
    public Map<String, Object> refund(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.RefundCompletion request) {
        fulfillment.completeRefund(id, request.providerRef());
        return Map.of("completed", true);
    }

    @GetMapping("/api/admin/emails")
    @Operation(summary = "Lấy danh sách email outbox (REQ-03)")
    public Map<String, Object> emails(
            @RequestParam(defaultValue = "FAILED") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return outbox.list(status, page, size);
    }

    @PostMapping("/api/admin/emails/{id}/resend")
    @Operation(summary = "Gửi lại email trong hàng đợi outbox (REQ-03)")
    public Map<String, Object> resend(@PathVariable UUID id) {
        outbox.resend(id);
        return Map.of("queued", true);
    }
}
