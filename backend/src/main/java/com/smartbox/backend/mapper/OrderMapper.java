package com.smartbox.backend.mapper;

import com.smartbox.backend.dto.response.OrderItemResponse;
import com.smartbox.backend.dto.response.OrderResponse;
import com.smartbox.backend.entity.Order;
import com.smartbox.backend.entity.OrderItem;
import com.smartbox.backend.entity.Payment;

import java.util.Collections;
import java.util.List;

public class OrderMapper {

    private OrderMapper() {}

    public static OrderResponse toResponse(Order order, List<OrderItem> items) {
        if (order == null) return null;

        List<OrderItemResponse> itemResponses = (items == null) ? Collections.emptyList() :
                items.stream().map(i -> OrderItemResponse.builder()
                        .id(i.getId())
                        .productId(i.getProductId())
                        .productName(i.getProduct() != null ? i.getProduct().getName() : null)
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .build()).toList();

        List<Payment> payments = order.getPayments();
        Payment firstPayment = (payments != null && !payments.isEmpty()) ? payments.get(0) : null;
        String paymentMethod = firstPayment != null && firstPayment.getProvider() != null ? firstPayment.getProvider() : "vnpay";
        String paymentStatus = firstPayment != null && firstPayment.getStatus() != null ? firstPayment.getStatus() : ("completed".equalsIgnoreCase(order.getStatus()) ? "paid" : "pending");
        String transactionRef = firstPayment != null && firstPayment.getTransactionRef() != null ? firstPayment.getTransactionRef() : "TRX-" + order.getId().toString().substring(0, 8);

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .customerName(order.getCustomer() != null ? order.getCustomer().getFullName() : null)
                .customerPhone(order.getCustomer() != null ? order.getCustomer().getPhone() : null)
                .shippingAddress(order.getShippingAddress())
                .trackingNumber(order.getTrackingNumber())
                .status(order.getStatus())
                .total(order.getTotal())
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .transactionRef(transactionRef)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
