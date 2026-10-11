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
                        .productName(i.getProductNameSnapshot()!=null?i.getProductNameSnapshot():i.getProduct()!=null?i.getProduct().getName():null)
                        .variantId(i.getVariantId()).sku(i.getSkuSnapshot()).variantName(i.getVariantNameSnapshot())
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .build()).toList();

        List<Payment> payments = order.getPayments();
        Payment firstPayment = (payments != null && !payments.isEmpty()) ? payments.get(0) : null;
        String paymentMethod = firstPayment != null ? firstPayment.getProvider() : null;
        String paymentStatus = firstPayment != null ? firstPayment.getStatus() : null;
        String transactionRef = firstPayment != null ? firstPayment.getTransactionRef() : null;

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
