package com.smartbox.backend.service.commerce;

import com.smartbox.backend.dto.request.commerce.OrderLookupRequest;
import com.smartbox.backend.dto.response.commerce.OrderLookupResponse;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dịch vụ tra cứu tiến trình đơn hàng công khai.
 * Phục vụ khách hàng kiểm tra lịch sử đặt hàng, giao vận, lắp đặt và thiết bị SmartBox.
 */
@Service
@RequiredArgsConstructor
public class OrderLookupService {

    private final CommerceRepository db;
    private final OrderWorkflowService orders;

    @Transactional(readOnly = true)
    public OrderLookupResponse lookup(OrderLookupRequest request) {
        String rawId = request != null && request.orderId() != null ? request.orderId().trim() : "";
        String phone = request != null && request.phone() != null ? request.phone().trim() : "";

        if (rawId.isEmpty() && phone.isEmpty()) {
            throw new BadRequestException("Vui lòng nhập mã đơn hàng hoặc số điện thoại để tra cứu");
        }

        UUID orderId;
        if (!rawId.isEmpty()) {
            try {
                orderId = UUID.fromString(rawId);
            } catch (IllegalArgumentException ex) {
                var matches = db.list("SELECT id FROM public.orders WHERE CAST(id AS TEXT) ILIKE ? LIMIT 1", rawId + "%");
                if (!matches.isEmpty()) {
                    orderId = UUID.fromString(matches.get(0).get("id").toString());
                } else {
                    throw new ResourceNotFoundException("Đơn hàng", "orderId", rawId);
                }
            }
        } else {
            var matches = db.list(
                    "SELECT id FROM public.orders WHERE (shipping_address_snapshot->>'phone' ILIKE ? OR shipping_address ILIKE ?) ORDER BY created_at DESC LIMIT 1",
                    "%" + phone + "%", "%" + phone + "%"
            );
            if (matches.isEmpty()) {
                throw new ResourceNotFoundException("Đơn hàng", "phone", phone);
            }
            orderId = UUID.fromString(matches.get(0).get("id").toString());
        }

        var orderRows = db.list("SELECT * FROM public.orders WHERE id = ?", orderId);
        if (orderRows.isEmpty()) {
            throw new ResourceNotFoundException("Đơn hàng", "id", orderId);
        }
        var order = orderRows.get(0);

        var snapshot = orders.view(orderId);
        @SuppressWarnings("unchecked")
        Map<String, Object> addressSnapshot = (Map<String, Object>) snapshot.get("shippingAddressSnapshot");
        String actualPhone = addressSnapshot != null && addressSnapshot.get("phone") != null ? addressSnapshot.get("phone").toString() : "";
        String recipient = addressSnapshot != null && addressSnapshot.get("recipientName") != null ? addressSnapshot.get("recipientName").toString() : "";

        if (!phone.isEmpty() && !actualPhone.isEmpty()) {
            String cleanPhoneInput = phone.replaceAll("[^0-9]", "");
            String cleanActual = actualPhone.replaceAll("[^0-9]", "");
            if (cleanActual.length() >= 4 && cleanPhoneInput.length() >= 4) {
                String last4Input = cleanPhoneInput.substring(cleanPhoneInput.length() - 4);
                String last4Actual = cleanActual.substring(cleanActual.length() - 4);
                if (!last4Input.equals(last4Actual)) {
                    throw new BadRequestException("Số điện thoại không khớp với thông tin đơn hàng");
                }
            }
        }

        BigDecimal total = order.get("total") instanceof BigDecimal bd
                ? bd
                : (order.get("total") != null ? new BigDecimal(order.get("total").toString()) : BigDecimal.ZERO);
        BigDecimal subtotal = order.get("subtotal") instanceof BigDecimal bd
                ? bd
                : (order.get("subtotal") != null ? new BigDecimal(order.get("subtotal").toString()) : total);
        BigDecimal discountAmount = order.get("discount_amount") instanceof BigDecimal bd
                ? bd
                : (order.get("discount_amount") != null ? new BigDecimal(order.get("discount_amount").toString()) : BigDecimal.ZERO);
        String voucherCode = order.get("voucher_code") != null ? order.get("voucher_code").toString() : null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawItems = (List<Map<String, Object>>) snapshot.get("items");
        List<OrderLookupResponse.OrderItemDto> items = new ArrayList<>();
        if (rawItems != null) {
            for (var it : rawItems) {
                UUID itemId = null;
                if (it.get("id") != null) {
                    itemId = it.get("id") instanceof UUID u ? u : UUID.fromString(it.get("id").toString());
                }
                String pName = it.get("productName") != null ? it.get("productName").toString() : "";
                String vName = it.get("variantName") != null ? it.get("variantName").toString() : null;
                String sku = it.get("sku") != null ? it.get("sku").toString() : "";
                int qty = it.get("quantity") instanceof Number n ? n.intValue() : 0;
                BigDecimal unitPrice = it.get("unitPrice") instanceof BigDecimal bd
                        ? bd
                        : (it.get("unitPrice") != null ? new BigDecimal(it.get("unitPrice").toString()) : BigDecimal.ZERO);
                BigDecimal itemSubtotal = it.get("subtotal") instanceof BigDecimal bd
                        ? bd
                        : (it.get("subtotal") != null ? new BigDecimal(it.get("subtotal").toString()) : BigDecimal.ZERO);

                items.add(new OrderLookupResponse.OrderItemDto(
                        itemId, pName, vName, sku, qty, unitPrice, itemSubtotal
                ));
            }
        }

        List<OrderLookupResponse.TimelineEventDto> timeline = new ArrayList<>();
        var statusHist = db.list(
                "SELECT to_status AS status, reason, created_at AS \"occurredAt\" FROM public.order_status_history WHERE order_id = ? ORDER BY created_at ASC",
                orderId
        );
        for (var h : statusHist) {
            timeline.add(new OrderLookupResponse.TimelineEventDto(
                    "ORDER",
                    h.get("status") != null ? h.get("status").toString() : "",
                    h.get("occurredAt")
            ));
        }

        var deliveryHist = db.list(
                "SELECT h.action, h.reason, h.created_at AS \"occurredAt\" FROM public.delivery_installation_history h JOIN public.delivery_installations j ON j.id = h.job_id WHERE j.order_id = ? ORDER BY h.created_at ASC",
                orderId
        );
        for (var d : deliveryHist) {
            String act = d.get("action") != null ? d.get("action").toString() : "";
            if (!act.startsWith("CHECK_")) {
                timeline.add(new OrderLookupResponse.TimelineEventDto(
                        "DELIVERY",
                        act,
                        d.get("occurredAt")
                ));
            }
        }

        OrderLookupResponse.DeliveryInstallationDto deliveryInstallation = null;
        var jobs = db.list(
                "SELECT id, status, scheduled_at AS \"scheduledAt\", delivered_at AS \"deliveredAt\", installed_at AS \"installedAt\", completed_at AS \"completedAt\", customer_accepted AS \"customerAccepted\" FROM public.delivery_installations WHERE order_id = ? LIMIT 1",
                orderId
        );
        if (!jobs.isEmpty()) {
            var job = jobs.get(0);
            UUID jobId = UUID.fromString(job.get("id").toString());
            var devicesList = db.list(
                    "SELECT d.serial_number AS \"serialNumber\", d.name, p.has_weight_sensor AS \"hasWeightSensor\" FROM public.delivery_installation_devices j JOIN public.devices d ON d.id = j.device_id LEFT JOIN public.products p ON p.id = d.product_id WHERE j.job_id = ?",
                    jobId
            );

            List<OrderLookupResponse.DeviceItemDto> deviceDtos = new ArrayList<>();
            for (var dev : devicesList) {
                deviceDtos.add(new OrderLookupResponse.DeviceItemDto(
                        dev.get("serialNumber") != null ? dev.get("serialNumber").toString() : "",
                        dev.get("name") != null ? dev.get("name").toString() : null,
                        Boolean.TRUE.equals(dev.get("hasWeightSensor"))
                ));
            }

            deliveryInstallation = new OrderLookupResponse.DeliveryInstallationDto(
                    jobId,
                    job.get("status") != null ? job.get("status").toString() : "",
                    job.get("scheduledAt"),
                    job.get("deliveredAt"),
                    job.get("installedAt"),
                    job.get("completedAt"),
                    Boolean.TRUE.equals(job.get("customerAccepted")),
                    deviceDtos
            );
        }

        return new OrderLookupResponse(
                orderId,
                order.get("status") != null ? order.get("status").toString() : "",
                order.get("created_at"),
                order.get("paid_at"),
                order.get("expires_at"),
                order.get("shipping_address") != null ? order.get("shipping_address").toString() : "",
                maskName(recipient),
                maskPhone(actualPhone),
                total,
                subtotal,
                discountAmount,
                voucherCode,
                items,
                timeline,
                deliveryInstallation
        );
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone != null ? phone : "";
        }
        int len = phone.length();
        return phone.substring(0, 3) + "****" + phone.substring(len - 3);
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) {
            return "Khách hàng";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].charAt(0) + "***";
        }
        return parts[0] + " *** " + parts[parts.length - 1];
    }
}
