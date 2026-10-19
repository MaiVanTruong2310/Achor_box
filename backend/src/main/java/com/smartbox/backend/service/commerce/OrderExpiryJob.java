package com.smartbox.backend.service.commerce;

import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "smartbox.jobs.enabled", havingValue = "true")
public class OrderExpiryJob {

    private final CommerceRepository db;
    private final PaymentTimeoutService paymentTimeoutService;
    private final OrderDelayedExpiryQueue delayedQueue;

    /**
     * Polling cơ chế Message Queue có độ trễ (Delayed Queue - Redis ZSet).
     * Tránh quét toàn bộ bảng DB lớn, lấy chính xác các đơn đến hạn hủy.
     */
    @Scheduled(fixedDelayString = "${smartbox.payment.expiry-poll-ms:5000}")
    public void processDelayedQueue() {
        List<UUID> expiredOrderIds = delayedQueue.pollExpired(50);
        if (!expiredOrderIds.isEmpty()) {
            log.info("Delayed Queue kích hoạt {} đơn hàng hết hạn thanh toán", expiredOrderIds.size());
            for (UUID orderId : expiredOrderIds) {
                try {
                    paymentTimeoutService.processExpiredOrder(orderId);
                } catch (Exception ex) {
                    log.error("Lỗi xử lý đơn hết hạn qua Delayed Queue {} ({})", orderId, ex.getMessage());
                }
            }
        }
    }

    /**
     * Chốt chặn dự phòng định kỳ (Safety fallback sweep).
     * Chỉ quét tần suất thấp đề phòng sự cố Redis mất kết nối hoặc restart.
     */
    @Scheduled(fixedDelayString = "${smartbox.payment.expiry-delay-ms:300000}")
    public void fallbackDbSweep() {
        var expiredRows = db.list("SELECT id FROM public.orders WHERE workflow_version=2 AND CAST(status AS text) IN('pending','awaiting_payment') AND expires_at<=? ORDER BY expires_at LIMIT 50", now());
        if (!expiredRows.isEmpty()) {
            log.info("Safety fallback: Tìm thấy {} đơn quá hạn trong DB chưa hủy", expiredRows.size());
            for (var row : expiredRows) {
                UUID id = uuid(row.get("id"));
                try {
                    paymentTimeoutService.processExpiredOrder(id);
                } catch (Exception ex) {
                    log.error("Could not expire order via safety fallback {} ({})", id, ex.getClass().getSimpleName());
                }
            }
        }
    }
}
