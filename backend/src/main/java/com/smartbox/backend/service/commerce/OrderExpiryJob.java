package com.smartbox.backend.service.commerce;

import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "smartbox.jobs.enabled", havingValue = "true")
public class OrderExpiryJob {

    private final CommerceRepository db;
    private final PaymentService payments;

    @Scheduled(fixedDelayString = "${smartbox.payment.expiry-delay-ms:60000}")
    public void expire() {
        var expiredRows = db.list("SELECT id FROM public.orders WHERE workflow_version=2 AND CAST(status AS text) IN('pending','awaiting_payment') AND expires_at<=? ORDER BY expires_at LIMIT 50", now());
        if (!expiredRows.isEmpty()) {
            log.info("OrderExpiryJob found {} expired pending orders to cancel", expiredRows.size());
        }
        for (var row : expiredRows) {
            UUID id = uuid(row.get("id"));
            try {
                payments.expire(id);
                log.info("Order {} successfully cancelled due to expiry", id);
            } catch (Exception ex) {
                log.error("Could not expire order {} ({})", id, ex.getClass().getSimpleName());
            }
        }
    }
}
