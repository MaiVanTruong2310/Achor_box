package com.smartbox.backend.service;

import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.response.OrderItemResponse;
import com.smartbox.backend.dto.response.OrderResponse;
import com.smartbox.backend.entity.Order;
import com.smartbox.backend.entity.OrderItem;
import com.smartbox.backend.entity.Payment;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.OrderItemRepository;
import com.smartbox.backend.repository.OrderRepository;
import com.smartbox.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final OrderWorkflowService workflow;
    private final FulfillmentService fulfillment;

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOrdersPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<OrderResponse> pageResult = orderRepository.findAll(pageable).map(this::mapToResponse);
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUserId(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public OrderResponse updateOrderStatus(UUID id, String status) {
        if ("cancelled".equalsIgnoreCase(status)) {
            workflow.cancel(id, "ADMIN_CANCELLATION");
            // JDBC mutation shares the JPA transaction; fetch after the mutation.
            return mapToResponse(orderRepository.findById(id).orElseThrow());
        }
        throw new com.smartbox.backend.exception.ConflictException("USE_WORKFLOW_ACTION: Thanh toán, duyệt ticket và giao hàng phải dùng API nghiệp vụ tương ứng");
    }

    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public OrderResponse updateTrackingNumber(UUID id, String trackingNumber) {
        fulfillment.tracking(id,trackingNumber);
        return mapToResponse(orderRepository.findById(id).orElseThrow());
    }

    public OrderResponse mapToResponse(Order o) {
        List<OrderItem> items = orderItemRepository.findByOrderId(o.getId());
        List<Payment> payments = paymentRepository.findByOrderId(o.getId());

        Payment firstPayment = payments.isEmpty() ? null : payments.get(0);
        String paymentMethod = firstPayment != null ? firstPayment.getProvider() : null;
        String paymentStatus = firstPayment != null ? firstPayment.getStatus() : null;
        String transactionRef = firstPayment != null ? firstPayment.getTransactionRef() : null;

        List<OrderItemResponse> itemDTOs = items.stream().map(it -> OrderItemResponse.builder()
                .id(it.getId())
                .productId(it.getProductId())
                .productName(it.getProductNameSnapshot() != null ? it.getProductNameSnapshot() : it.getProduct() != null ? it.getProduct().getName() : null)
                .variantId(it.getVariantId()).sku(it.getSkuSnapshot()).variantName(it.getVariantNameSnapshot())
                .subtotal(it.getUnitPrice().multiply(java.math.BigDecimal.valueOf(it.getQuantity())))
                .quantity(it.getQuantity())
                .unitPrice(it.getUnitPrice())
                .build()
        ).collect(Collectors.toList());

        String itemsSummary = itemDTOs.isEmpty()
                ? ""
                : itemDTOs.stream().map(i -> i.getQuantity() + "x " + i.getProductName()).collect(Collectors.joining(", "));

        String customerName = o.getCustomer() != null ? o.getCustomer().getFullName() : null;
        String customerPhone = o.getCustomer() != null ? o.getCustomer().getPhone() : null;

        return OrderResponse.builder()
                .id(o.getId())
                .userId(o.getUserId())
                .customerName(customerName)
                .customerPhone(customerPhone)
                .shippingAddress(o.getShippingAddress())
                .trackingNumber(o.getTrackingNumber())
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
