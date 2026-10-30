package com.smartbox.backend.service.commerce;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Message Queue có độ trễ (Delayed Queue) sử dụng Redis ZSet.
 * Quản lý mốc thời gian hết hạn của đơn hàng theo TTL (Time-To-Live).
 * Giúp hệ thống không cần quét full-table Scan trong PostgreSQL liên tục.
 */
@Component
@Slf4j
public class OrderDelayedExpiryQueue {

    public static final String REDIS_DELAYED_QUEUE_KEY = "smartbox:orders:delayed_expiry";

    private final StringRedisTemplate redis;

    @Autowired
    public OrderDelayedExpiryQueue(@Autowired(required = false) StringRedisTemplate redis) {
        this.redis = redis;
    }

    /**
     * Gắn mốc thời gian hết hạn (expired_at) vào Delayed Queue.
     * Score là timestamp epoch millisecond.
     */
    public void scheduleExpiry(UUID orderId, OffsetDateTime expiresAt) {
        if (orderId == null || expiresAt == null) return;
        if (redis == null) {
            log.debug("Redis không khả dụng, bỏ qua enqueue delayed order {}", orderId);
            return;
        }
        try {
            long epochMillis = expiresAt.toInstant().toEpochMilli();
            redis.opsForZSet().add(REDIS_DELAYED_QUEUE_KEY, orderId.toString(), epochMillis);
            log.info("Enqueued order {} into delayed expiry queue with score {}", orderId, epochMillis);
        } catch (Exception ex) {
            log.warn("Không thể lưu order {} vào Redis Delayed Queue: {}", orderId, ex.getMessage());
        }
    }

    /**
     * Hủy mốc đếm ngược khi đơn đã thanh toán hoặc khách hủy trước hạn.
     */
    public void cancelExpiry(UUID orderId) {
        if (orderId == null || redis == null) return;
        try {
            redis.opsForZSet().remove(REDIS_DELAYED_QUEUE_KEY, orderId.toString());
            log.info("Cancelled delayed expiry for order {}", orderId);
        } catch (Exception ex) {
            log.warn("Không thể xóa order {} khỏi Redis Delayed Queue: {}", orderId, ex.getMessage());
        }
    }

    /**
     * Lấy danh sách các đơn hàng đã đến hạn hết hạn (score <= current_timestamp_millis).
     * Sau khi lấy ra, nguyên tử (atomic) remove khỏi queue.
     */
    public List<UUID> pollExpired(int limit) {
        if (redis == null) return Collections.emptyList();
        try {
            long nowMillis = System.currentTimeMillis();
            Set<String> expiredIds = redis.opsForZSet().rangeByScore(REDIS_DELAYED_QUEUE_KEY, 0, nowMillis, 0, limit);
            if (expiredIds == null || expiredIds.isEmpty()) {
                return Collections.emptyList();
            }

            List<UUID> result = new ArrayList<>();
            for (String idStr : expiredIds) {
                redis.opsForZSet().remove(REDIS_DELAYED_QUEUE_KEY, idStr);
                try {
                    result.add(UUID.fromString(idStr));
                } catch (IllegalArgumentException ignored) {}
            }
            return result;
        } catch (Exception ex) {
            log.warn("Lỗi khi đọc từ Redis Delayed Queue: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}
