package com.smartbox.backend.service;

import com.smartbox.backend.dto.OrderDTO;
import com.smartbox.backend.model.Order;
import com.smartbox.backend.model.OrderItem;
import com.smartbox.backend.model.Payment;
import com.smartbox.backend.repository.OrderItemRepository;
import com.smartbox.backend.repository.OrderRepository;
import com.smartbox.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public List<OrderDTO.OrderResponse> getOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderDTO.OrderResponse> getOrdersByUserId(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public OrderDTO.OrderResponse updateOrderStatus(UUID id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại: " + id));
        order.setStatus(status);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public OrderDTO.OrderResponse updateTrackingNumber(UUID id, String trackingNumber) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại: " + id));
        order.setTrackingNumber(trackingNumber);
        return mapToResponse(orderRepository.save(order));
    }

    private OrderDTO.OrderResponse mapToResponse(Order o) {
        List<OrderItem> items = orderItemRepository.findByOrderId(o.getId());
        List<Payment> payments = paymentRepository.findByOrderId(o.getId());

        Payment firstPayment = payments.isEmpty() ? null : payments.get(0);
        String paymentMethod = firstPayment != null && firstPayment.getProvider() != null ? firstPayment.getProvider() : "vnpay";
        String paymentStatus = firstPayment != null && firstPayment.getStatus() != null ? firstPayment.getStatus() : ("completed".equalsIgnoreCase(o.getStatus()) ? "paid" : "pending");
        String transactionRef = firstPayment != null && firstPayment.getTransactionRef() != null ? firstPayment.getTransactionRef() : "TRX-" + o.getId().toString().substring(0, 8);

        List<OrderDTO.OrderItemResponse> itemDTOs = items.stream().map(it -> OrderDTO.OrderItemResponse.builder()
                .id(it.getId())
                .productId(it.getProductId())
                .productName(it.getProduct() != null ? it.getProduct().getName() : "Hộp Smart Delivery Box")
                .quantity(it.getQuantity())
                .unitPrice(it.getUnitPrice())
                .build()
        ).collect(Collectors.toList());

        String itemsSummary = itemDTOs.isEmpty()
                ? "1x Hộp Smart Delivery Box"
                : itemDTOs.stream().map(i -> i.getQuantity() + "x " + i.getProductName()).collect(Collectors.joining(", "));

        String customerName = o.getCustomer() != null ? o.getCustomer().getFullName() : "Khách hàng SmartBox";
        String customerPhone = o.getCustomer() != null ? o.getCustomer().getPhone() : "0901234567";

        return OrderDTO.OrderResponse.builder()
                .id(o.getId())
                .userId(o.getUserId())
                .customerName(customerName)
                .customerPhone(customerPhone)
                .shippingAddress(o.getShippingAddress() != null ? o.getShippingAddress() : "Trụ sở SmartBox VN")
                .trackingNumber(o.getTrackingNumber() != null ? o.getTrackingNumber() : "VNPOST-" + o.getId().toString().substring(0, 6).toUpperCase())
                .status(o.getStatus())
                .total(o.getTotal())
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .transactionRef(transactionRef)
                .itemsSummary(itemsSummary)
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .items(itemDTOs)
                .build();
    }
}
