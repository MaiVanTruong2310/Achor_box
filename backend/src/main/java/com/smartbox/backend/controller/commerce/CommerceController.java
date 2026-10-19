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
@Tag(name = "Order API", description = "Quản lý đơn đặt hàng, giỏ hàng, phê duyệt PO và xử lý giao vận")
public class CommerceController {

    private final OrderWorkflowService orders;
    private final PaymentService payments;
    private final ApprovalTicketService tickets;
    private final FulfillmentService fulfillment;
    private final OutboxService outbox;

    @PostMapping("/api/orders")
    @Operation(summary = "Tạo đơn hàng mới (Pending)", description = "Khởi tạo đơn đặt hàng mới với các sản phẩm đã chọn, thông tin giao hàng và chuyển trạng thái chờ xác nhận")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CommerceRequests.CreateOrder request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orders.create(request));
    }

    @GetMapping("/api/orders/{id}")
    @Operation(summary = "Lấy chi tiết đơn hàng", description = "Xem toàn bộ thông tin chi tiết của đơn hàng bao gồm danh sách mặt hàng, thuế, phí và trạng thái")
    public Map<String, Object> detail(@PathVariable UUID id) {
        return orders.detail(id);
    }

    @GetMapping("/api/orders/my-orders")
    @Operation(summary = "Lấy danh sách đơn hàng của người dùng hiện tại", description = "Lấy danh sách đơn hàng thuộc quyền sở hữu của người dùng đang đăng nhập có phân trang")
    public List<Map<String, Object>> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orders.mine(page, size);
    }

    @GetMapping("/api/orders/{id}/history")
    @Operation(summary = "Lấy lịch sử thay đổi trạng thái đơn hàng", description = "Truy xuất nhật ký các bước chuyển dịch trạng thái của đơn hàng kèm thời gian và người thực hiện")
    public List<Map<String, Object>> history(@PathVariable UUID id) {
        return orders.history(id);
    }

    @PostMapping("/api/orders/{id}/items")
    @Operation(summary = "Thêm sản phẩm/biến thể vào đơn hàng (REQ-01)", description = "Bổ sung một sản phẩm hoặc biến thể kích cỡ vào đơn hàng đang ở trạng thái pending")
    public Map<String, Object> add(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Item item) {
        return orders.add(id, item.variantId(), item.quantity());
    }

    @PatchMapping("/api/orders/{id}/items/{variantId}")
    @Operation(summary = "Cập nhật số lượng sản phẩm trong đơn hàng (REQ-01)", description = "Điều chỉnh số lượng đặt mua của một mặt hàng cụ thể trong đơn hàng")
    public Map<String, Object> quantity(
            @PathVariable UUID id,
            @PathVariable UUID variantId,
            @Valid @RequestBody CommerceRequests.Quantity request) {
        return orders.setQuantity(id, variantId, request.quantity());
    }

    @DeleteMapping("/api/orders/{id}/items/{variantId}")
    @Operation(summary = "Xóa sản phẩm khỏi đơn hàng (REQ-01)", description = "Loại bỏ một mặt hàng cụ thể ra khỏi đơn hàng")
    public Map<String, Object> remove(
            @PathVariable UUID id,
            @PathVariable UUID variantId) {
        return orders.remove(id, variantId);
    }

    @PostMapping("/api/orders/{id}/voucher")
    @Operation(summary = "Áp dụng mã giảm giá voucher vào đơn hàng", description = "Kiểm tra và áp dụng mã khuyến mãi vào đơn hàng, tự động tính toán lại tổng tiền phải thanh toán")
    public Map<String, Object> voucher(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return orders.applyVoucher(id, body.get("code"));
    }

    @PostMapping("/api/orders/{id}/checkout")
    @Operation(summary = "Checkout đơn hàng sang trạng thái chờ thanh toán (REQ-02)", description = "Chuyển trạng thái đơn hàng từ pending sang awaiting_payment và chuẩn bị phiên thanh toán")
    public Map<String, Object> checkout(
            @PathVariable UUID id,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return payments.checkout(id, key);
    }

    @GetMapping("/api/orders/{id}/payment-session")
    @Operation(summary = "Lấy thông tin phiên thanh toán hiện tại của đơn hàng", description = "Truy xuất dữ liệu cổng thanh toán, mã giao dịch và số tiền cần thanh toán cho đơn hàng")
    public Map<String, Object> paymentSession(@PathVariable UUID id) {
        return payments.session(id);
    }

    @PostMapping("/api/orders/{id}/cancel")
    @Operation(summary = "Hủy đơn hàng", description = "Hủy bỏ đơn hàng kèm theo lý do cụ thể, chỉ áp dụng cho đơn hàng chưa hoàn tất giao vận")
    public Map<String, Object> cancel(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return orders.cancel(id, request.reason());
    }

    @PostMapping("/api/orders/{id}/customer-decision")
    @Operation(summary = "Khách hàng phản hồi xác nhận đơn khi có sản phẩm bị từ chối", description = "Khách hàng đồng ý tiếp tục mua các sản phẩm còn lại hoặc hủy toàn bộ đơn sau khi PO từ chối một phần")
    public Map<String, Object> customerDecision(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.CustomerDecision request) {
        return tickets.customerDecision(id, request.accept());
    }

    @PostMapping("/api/payments/callback")
    @Operation(summary = "Nhận webhook callback thanh toán (REQ-02)", description = "Điểm tiếp nhận kết quả xử lý giao dịch thanh toán từ cổng thanh toán đối tác")
    public Map<String, Object> callback(@Valid @RequestBody CommerceRequests.Callback request) {
        return payments.callback(request);
    }

    @GetMapping("/api/tickets")
    @Operation(summary = "Lấy danh sách phiếu phê duyệt đơn hàng PO", description = "Truy vấn danh sách các phiếu phê duyệt đơn hàng (PO tickets) theo phân trang để quản lý xem xét và duyệt đơn")
    public List<Map<String, Object>> tickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return tickets.list(page, size);
    }

    @GetMapping("/api/tickets/{id}")
    @Operation(summary = "Chi tiết phiếu phê duyệt PO", description = "Lấy thông tin chi tiết một phiếu phê duyệt PO theo ID bao gồm trạng thái duyệt và danh sách sản phẩm liên quan")
    public Map<String, Object> ticket(@PathVariable UUID id) {
        return tickets.detail(id);
    }

    @GetMapping("/api/orders/{id}/ticket")
    @Operation(summary = "Lấy phiếu phê duyệt PO theo mã đơn hàng", description = "Tìm kiếm và lấy chi tiết phiếu phê duyệt đơn hàng dựa trên mã định danh đơn hàng (orderId)")
    public Map<String, Object> ticketByOrder(@PathVariable UUID id) {
        return tickets.detailByOrder(id);
    }

    @PostMapping("/api/tickets/{id}/approve")
    @Operation(summary = "Phê duyệt phiếu PO", description = "Quản lý / PO duyệt phiếu PO, cho phép đơn hàng tiếp tục bước tiếp theo trong quy trình xử lý đơn hàng")
    public Map<String, Object> approve(@PathVariable UUID id) {
        return tickets.act(id, "APPROVE", null);
    }

    @PostMapping("/api/tickets/{id}/return")
    @Operation(summary = "Yêu cầu chỉnh sửa phiếu PO", description = "Gửi trả lại phiếu PO yêu cầu nhân viên phụ trách chỉnh sửa thông tin hoặc cung cấp thêm giải trình")
    public Map<String, Object> returnTicket(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.act(id, "RETURN", request.reason());
    }

    @PostMapping("/api/tickets/{id}/resubmit")
    @Operation(summary = "Gửi lại phiếu PO sau khi chỉnh sửa", description = "Nhân viên gửi lại phiếu PO lên cấp phê duyệt sau khi đã cập nhật thông tin theo yêu cầu")
    public Map<String, Object> resubmit(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.act(id, "RESUBMIT", request.reason());
    }

    @PostMapping("/api/tickets/{id}/reject")
    @Operation(summary = "Từ chối phiếu PO", description = "Từ chối phê duyệt đơn hàng kèm lý do, đơn hàng sẽ chuyển sang trạng thái bị hủy hoặc từ chối")
    public Map<String, Object> reject(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.act(id, "REJECT", request.reason());
    }

    @PostMapping("/api/tickets/{id}/items/{orderItemId}/approve")
    @Operation(summary = "PO duyệt một sản phẩm cụ thể trong đơn", description = "Phê duyệt một mặt hàng cụ thể trong phiếu PO đơn hàng")
    public Map<String, Object> approveItem(
            @PathVariable UUID id,
            @PathVariable UUID orderItemId) {
        return tickets.actItem(id, orderItemId, "APPROVE", null);
    }

    @PostMapping("/api/tickets/{id}/items/{orderItemId}/reject")
    @Operation(summary = "PO từ chối một sản phẩm cụ thể trong đơn", description = "Từ chối phê duyệt một mặt hàng cụ thể trong phiếu PO kèm lý do từ chối")
    public Map<String, Object> rejectItem(
            @PathVariable UUID id,
            @PathVariable UUID orderItemId,
            @Valid @RequestBody CommerceRequests.Reason request) {
        return tickets.actItem(id, orderItemId, "REJECT", request.reason());
    }

    @PostMapping("/api/orders/{id}/shipment/ship")
    @Operation(summary = "Đánh dấu đơn hàng bắt đầu giao vận", description = "Cập nhật trạng thái đơn hàng sang đang vận chuyển, lưu thông tin vận đơn và đơn vị vận chuyển")
    public Map<String, Object> ship(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.Shipment request) {
        return fulfillment.ship(id, request);
    }

    @PostMapping("/api/orders/{id}/shipment/deliver")
    @Operation(summary = "Xác nhận đã giao hàng thành công", description = "Xác nhận kiện hàng đã được giao thành công tới người nhận và kích hoạt quy trình hoàn tất giao vận")
    public Map<String, Object> deliver(@PathVariable UUID id) {
        return fulfillment.delivered(id);
    }

    @PostMapping("/api/orders/{id}/devices")
    @Operation(summary = "Gán số serial thiết bị cho đơn hàng", description = "Gán các mã serial/IMEI của thiết bị cụ thể trong kho vào từng mặt hàng trong đơn hàng xuất kho")
    public Map<String, Object> assign(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.DeviceAssignment request) {
        fulfillment.assign(id, request);
        return Map.of("assigned", true);
    }

    @GetMapping("/api/admin/refunds")
    @Operation(summary = "Lấy danh sách yêu cầu hoàn tiền", description = "Truy vấn danh sách các yêu cầu hoàn tiền cho đơn hàng theo trạng thái và phân trang")
    public List<Map<String, Object>> refunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return fulfillment.refunds(page, size);
    }

    @PostMapping("/api/admin/refunds/{id}/complete")
    @Operation(summary = "Hoàn tất xử lý hoàn tiền", description = "Xác nhận hoàn tất quy trình hoàn tiền qua cổng thanh toán với mã tham chiếu giao dịch hoàn tiền")
    public Map<String, Object> refund(
            @PathVariable UUID id,
            @Valid @RequestBody CommerceRequests.RefundCompletion request) {
        fulfillment.completeRefund(id, request.providerRef());
        return Map.of("completed", true);
    }

    @GetMapping("/api/admin/emails")
    @Operation(summary = "Lấy danh sách email outbox (REQ-03)", description = "Truy vấn danh sách email trong hàng đợi Outbox theo trạng thái (FAILED, PENDING, SENT) phục vụ giám sát gửi thư")
    public Map<String, Object> emails(
            @RequestParam(defaultValue = "FAILED") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return outbox.list(status, page, size);
    }

    @PostMapping("/api/admin/emails/{id}/resend")
    @Operation(summary = "Gửi lại email trong hàng đợi outbox (REQ-03)", description = "Thực hiện gửi lại một email đang bị lỗi hoặc chờ gửi trong hàng đợi Outbox")
    public ResponseEntity<Map<String, Object>> resend(@PathVariable UUID id) {
        return ResponseEntity.ok(outbox.resend(id));
    }

    @GetMapping("/api/admin/emails/{id}/status")
    @Operation(summary = "Kiểm tra trạng thái tiến trình gửi email trong nền", description = "Kiểm tra trạng thái xử lý gửi email bất đồng bộ theo ID tác vụ outbox")
    public ResponseEntity<Map<String, Object>> getEmailStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(outbox.getStatus(id));
    }

    @PostMapping("/api/admin/emails/test-send")
    @Operation(summary = "Gửi email kiểm thử trực tiếp qua SMTP trong nền và lưu nhật ký giao dịch", description = "Gửi email kiểm tra cấu hình SMTP trực tiếp trong nền và ghi nhật ký giao dịch thử nghiệm")
    public ResponseEntity<Map<String, Object>> sendTestEmail(
            @RequestBody(required = false) Map<String, String> request) {
        String recipient = request != null ? request.get("recipient") : null;
        String subject = request != null ? request.get("subject") : null;
        String body = request != null ? request.get("body") : null;
        return ResponseEntity.ok(outbox.sendTest(recipient, subject, body));
    }
}
