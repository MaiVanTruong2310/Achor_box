package com.smartbox.backend.service;

import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name="smartbox.jobs.enabled",havingValue="true")
public class OrderExpiryJob {
    private final CommerceRepository db;
    private final PaymentService payments;
    @Scheduled(fixedDelayString="${smartbox.payment.expiry-delay-ms:60000}")
    public void expire() {
        for(var row:db.list("SELECT id FROM public.orders WHERE workflow_version=2 AND status IN('pending','awaiting_payment') AND expires_at<=? ORDER BY expires_at LIMIT 100",now())) {
            try {payments.expire(uuid(row.get("id")));}
            catch(Exception ex){log.error("Could not expire order {} ({})",row.get("id"),ex.getClass().getSimpleName());}
        }
    }
}
