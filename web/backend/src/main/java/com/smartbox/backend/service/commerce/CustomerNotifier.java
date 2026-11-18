package com.smartbox.backend.service.commerce;

import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;

/** Writes an in-app notification for a customer and queues the same message for FCM delivery. */
@Component
@RequiredArgsConstructor
public class CustomerNotifier {

    private final CommerceRepository db;

    public UUID notify(UUID userId, String type, String title, String body) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO public.notifications(id, user_id, type, title, body, is_read, created_at) VALUES(?,?,?,?,?,false,?)",
                id, userId, type, title, body, now());
        db.update("INSERT INTO public.push_outbox(id, notification_id, status, attempts, next_attempt_at) VALUES(?,?,'PENDING',0,?)",
                UUID.randomUUID(), id, now());
        return id;
    }
}
