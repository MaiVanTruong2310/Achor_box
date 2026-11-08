package com.smartbox.backend.service.commerce;

import com.smartbox.backend.common.AdminSearch;
import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.response.commerce.OrderItemResponse;
import com.smartbox.backend.dto.response.commerce.OrderResponse;
import com.smartbox.backend.entity.Order;
import com.smartbox.backend.entity.OrderItem;
import com.smartbox.backend.entity.Payment;
import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.enums.OrderStatus;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.OrderItemRepository;
import com.smartbox.backend.repository.OrderRepository;
import com.smartbox.backend.repository.PaymentRepository;
import com.smartbox.backend.repository.ProfileRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final ProfileRepository profileRepository;
    private final OrderWorkflowService workflow;
    private final FulfillmentService fulfillment;
    private final CurrentActor actors;

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders() {
        return mapOrdersToResponses(orderRepository.findAllByOrderByCreatedAtDesc());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOrdersPaged(int page, int size) {
        return getOrdersPaged(page, size, null, null, null, null);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> getOrdersPaged(int page, int size, String search, String status, String payment) {
        return getOrdersPaged(page, size, search, status, payment, null);
    }

    private static final Set<String> ORDER_SORTS = Set.of("created_at_desc", "created_at_asc", "total_asc", "total_desc", "customer_asc", "customer_desc", "status_asc", "status_desc");

    @Transactional(readOnly = true)
    public Map<String, Object> getOrdersPaged(int page, int size, String search, String status, String payment, String sort) {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");
        AdminSearch.page(page, size);
        String term = AdminSearch.term(search);
        String filter = status == null || status.isBlank() ? "" : OrderStatus.fromString(status).getValue();
        String paymentFilter = payment == null ? "" : payment.trim().toLowerCase(Locale.ROOT);
        if (!paymentFilter.isEmpty() && !Set.of("pending", "paid", "refunded", "failed", "expired", "mock", "vnpay", "cod", "momo").contains(paymentFilter)) {
            throw new BadRequestException("INVALID_PAYMENT_FILTER");
        }
        if ("paid".equals(paymentFilter)) {
            paymentFilter = "success";
        }
        boolean isPo = "product_manager".equals(actor.role());
        UUID poId = isPo ? actor.id() : null;
        String sortKey = sort == null ? "" : sort.trim().toLowerCase(Locale.ROOT);
        if (!sortKey.isEmpty() && !ORDER_SORTS.contains(sortKey)) {
            throw new BadRequestException("INVALID_ORDER_SORT");
        }

        Page<Order> orderPage = orderRepository.search(
                term,
                AdminSearch.like(term),
                filter,
                paymentFilter,
                isPo,
                poId,
                sortKey,
                PageRequest.of(page, size)
        );

        List<OrderResponse> content = mapOrdersToResponses(orderPage.getContent());
        Page<OrderResponse> pageResult = new PageImpl<>(content, orderPage.getPageable(), orderPage.getTotalElements());
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getOrderCounts() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");
        Map<String, Long> map = new LinkedHashMap<>();
        boolean isPo = "product_manager".equals(actor.role());
        if (isPo) {
            long total = 0;
            for (Object[] r : orderRepository.countGroupByStatusForPo(actor.id())) {
                if (r != null && r.length >= 2 && r[0] != null && r[1] != null) {
                    long cnt = ((Number) r[1]).longValue();
                    map.put(r[0].toString(), cnt);
                    total += cnt;
                }
            }
            map.put("all", total);
        } else {
            map.put("all", orderRepository.count());
            for (Object[] r : orderRepository.countGroupByStatus()) {
                if (r != null && r.length >= 2 && r[0] != null && r[1] != null) {
                    map.put(r[0].toString(), ((Number) r[1]).longValue());
                }
            }
        }
        return map;
    }

    /** Status counts and KPIs in a single database round trip (replaces counts + summary). */
    @Transactional(readOnly = true)
    public Map<String, Object> getOrderOverview() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");
        List<Object[]> rows = "product_manager".equals(actor.role())
                ? orderRepository.overviewForPo(actor.id())
                : orderRepository.overview();

        Map<String, Long> counts = new LinkedHashMap<>();
        long total = 0, completed = 0, paidCount = 0, awaitingCount = 0;
        BigDecimal paidRevenue = BigDecimal.ZERO, awaitingRevenue = BigDecimal.ZERO;
        for (Object[] r : rows) {
            if (r == null || r[0] == null) continue;
            String status = r[0].toString();
            long n = asLong(r[1]);
            counts.put(status, n);
            total += n;
            if ("completed".equals(status)) completed += n;
            if (!"cancelled".equals(status)) {
                paidCount += asLong(r[2]);
                paidRevenue = paidRevenue.add(asDecimal(r[3]));
            }
            if ("pending".equals(status) || "awaiting_payment".equals(status)) {
                awaitingCount += asLong(r[4]);
                awaitingRevenue = awaitingRevenue.add(asDecimal(r[5]));
            }
        }
        Map<String, Long> orderedCounts = new LinkedHashMap<>();
        orderedCounts.put("all", total);
        orderedCounts.putAll(counts);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", total);
        summary.put("completed", completed);
        summary.put("paidCount", paidCount);
        summary.put("paidRevenue", paidRevenue);
        summary.put("awaitingPaymentCount", awaitingCount);
        summary.put("awaitingPaymentRevenue", awaitingRevenue);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("counts", orderedCounts);
        out.put("summary", summary);
        return out;
    }

    /** Order KPIs for the whole system (or the PO's own scope), independent of list pagination. */
    @Transactional(readOnly = true)
    public Map<String, Object> getOrderSummary() {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager", "technician");
        List<Object[]> rows = "product_manager".equals(actor.role())
                ? orderRepository.summarizeForPo(actor.id())
                : orderRepository.summarize();
        Object[] r = rows.isEmpty() ? new Object[6] : rows.get(0);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("total", asLong(r[0]));
        map.put("completed", asLong(r[1]));
        map.put("paidCount", asLong(r[2]));
        map.put("paidRevenue", asDecimal(r[3]));
        map.put("awaitingPaymentCount", asLong(r[4]));
        map.put("awaitingPaymentRevenue", asDecimal(r[5]));
        return map;
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }

    private static BigDecimal asDecimal(Object value) {
        if (value instanceof BigDecimal d) return d;
        return value instanceof Number n ? new BigDecimal(n.toString()) : BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUserId(UUID userId) {
        return mapOrdersToResponses(orderRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public OrderResponse updateOrderStatus(UUID id, String status) {
        if ("cancelled".equalsIgnoreCase(status)) {
            workflow.cancel(id, "ADMIN_CANCELLATION");
            return mapToResponse(orderRepository.findById(id).orElseThrow());
        }
        throw new ConflictException("USE_WORKFLOW_ACTION: Thanh toán, duyệt ticket và giao hàng phải dùng API nghiệp vụ tương ứng");
    }

    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public OrderResponse updateTrackingNumber(UUID id, String trackingNumber) {
        fulfillment.tracking(id, trackingNumber);
        return mapToResponse(orderRepository.findById(id).orElseThrow());
    }

    public List<OrderResponse> mapOrdersToResponses(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> orderIds = orders.stream()
                .map(Order::getId)
                .filter(Objects::nonNull)
                .toList();

        Map<UUID, List<OrderItem>> itemsByOrderId = orderItemRepository.findByOrderIdIn(orderIds).stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));

        Map<UUID, List<Payment>> paymentsByOrderId = paymentRepository.findByOrderIdIn(orderIds).stream()
                .collect(Collectors.groupingBy(Payment::getOrderId));

        Set<UUID> userIds = orders.stream()
                .map(Order::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, Profile> customerMap = userIds.isEmpty()
                ? Collections.emptyMap()
                : profileRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(Profile::getId, p -> p));

        return orders.stream()
                .map(o -> mapToResponse(
                        o,
                        itemsByOrderId.getOrDefault(o.getId(), Collections.emptyList()),
                        paymentsByOrderId.getOrDefault(o.getId(), Collections.emptyList()),
                        customerMap.get(o.getUserId()) != null ? customerMap.get(o.getUserId()) : o.getCustomer()
                ))
                .collect(Collectors.toList());
    }

    public OrderResponse mapToResponse(Order o) {
        return mapToResponse(
                o,
                orderItemRepository.findByOrderId(o.getId()),
                paymentRepository.findByOrderId(o.getId()),
                o.getCustomer()
        );
    }

    public OrderResponse mapToResponse(Order o, List<OrderItem> items, List<Payment> payments, Profile customer) {
        Payment firstPayment = payments.isEmpty() ? null : payments.get(0);
        String paymentMethod = firstPayment != null
                ? ("vnpay".equals(firstPayment.getProvider()) && "sandbox".equals(firstPayment.getProviderEnvironment())
                        ? "vnpay_sandbox"
                        : firstPayment.getProvider())
                : null;
        String paymentStatus = firstPayment != null
                ? ("success".equals(firstPayment.getStatus()) ? "paid" : firstPayment.getStatus())
                : null;
        String transactionRef = firstPayment != null ? firstPayment.getTransactionRef() : null;

        List<OrderItemResponse> itemDTOs = items.stream().map(it -> OrderItemResponse.builder()
                .id(it.getId())
                .productId(it.getProductId())
                .productName(it.getProductNameSnapshot() != null ? it.getProductNameSnapshot() : (it.getProduct() != null ? it.getProduct().getName() : null))
                .variantId(it.getVariantId())
                .sku(it.getSkuSnapshot())
                .variantName(it.getVariantNameSnapshot())
                .subtotal(it.getUnitPrice().multiply(BigDecimal.valueOf(it.getQuantity())))
                .quantity(it.getQuantity())
                .unitPrice(it.getUnitPrice())
                .build()
        ).collect(Collectors.toList());

        String itemsSummary = itemDTOs.isEmpty()
                ? ""
                : itemDTOs.stream().map(i -> i.getQuantity() + "x " + i.getProductName()).collect(Collectors.joining(", "));

        String customerName = customer != null ? customer.getFullName() : null;
        String customerPhone = customer != null ? customer.getPhone() : null;

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
