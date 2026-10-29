package com.smartbox.backend.service.commerce;

import com.smartbox.backend.exception.ConflictException;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * State machine for approval-before-payment workflow.
 * Transitions:
 * pending -> awaiting_payment, customer_decision_pending, cancelled
 * customer_decision_pending -> awaiting_payment, cancelled
 * awaiting_payment -> paid, confirmed, cancelled
 * paid -> confirmed, cancelled
 * confirmed -> completed, cancelled
 * completed -> terminal
 * cancelled -> terminal
 */
@Component
public class OrderStateMachine {

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "pending", Set.of("awaiting_payment", "customer_decision_pending", "cancelled"),
            "customer_decision_pending", Set.of("awaiting_payment", "cancelled"),
            "awaiting_payment", Set.of("awaiting_payment", "paid", "confirmed", "cancelled"),
            "paid", Set.of("confirmed", "cancelled"),
            "confirmed", Set.of("completed", "cancelled"),
            "completed", Set.of(),
            "cancelled", Set.of()
    );

    public void requireTransition(String from, String to) {
        if (from == null || to == null || !TRANSITIONS.getOrDefault(from, Set.of()).contains(to)) {
            throw new ConflictException("INVALID_ORDER_TRANSITION: " + from + " → " + to);
        }
    }
}
