package com.smartbox.backend.service.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Service quản lý trạng thái đăng nhập qua Redis:
 * 1. Chống dò mật khẩu (Brute-force protection / Login attempt throttling).
 * 2. Lưu trữ phiên làm việc đang hoạt động (Active User Session).
 * 3. Thu hồi & Blacklist JWT Token khi người dùng Đăng xuất (Logout) hoặc Đổi mật khẩu.
 * 4. Tự động chuyển đổi Fallback an toàn (In-Memory) nếu Redis chưa khả dụng.
 */
@Service
@Slf4j
public class RedisAuthService {

    private final StringRedisTemplate redis;

    @Value("${smartbox.redis.auth.enabled:true}")
    private boolean enabled;

    @Value("${smartbox.redis.auth.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${smartbox.redis.auth.lockout-minutes:15}")
    private long lockoutMinutes;

    // Fallback in-memory khi Redis chưa kết nối được
    private final Map<String, Integer> memoryAttempts = new ConcurrentHashMap<>();
    private final Map<String, Instant> memoryLockouts = new ConcurrentHashMap<>();
    private final Map<String, Instant> memoryBlacklist = new ConcurrentHashMap<>();

    @Autowired
    public RedisAuthService(@Autowired(required = false) StringRedisTemplate redis) {
        this.redis = redis;
    }

    /**
     * Kiểm tra xem tài khoản hoặc IP có đang bị tạm khóa do đăng nhập sai nhiều lần hay không.
     */
    public boolean isLoginLocked(String identifier) {
        if (!enabled || identifier == null || identifier.isBlank()) return false;
        String cleanId = normalize(identifier);

        try {
            if (redis != null) {
                String key = "auth:attempts:" + cleanId;
                String val = redis.opsForValue().get(key);
                if (val != null && Integer.parseInt(val) >= maxLoginAttempts) {
                    return true;
                }
            }
        } catch (Exception ex) {
            log.debug("Redis không khả dụng, sử dụng bộ nhớ đệm tạm thời: {}", ex.getMessage());
        }

        Instant lockExpiry = memoryLockouts.get(cleanId);
        if (lockExpiry != null) {
            if (Instant.now().isBefore(lockExpiry)) {
                return true;
            } else {
                memoryLockouts.remove(cleanId);
                memoryAttempts.remove(cleanId);
            }
        }
        return memoryAttempts.getOrDefault(cleanId, 0) >= maxLoginAttempts;
    }

    /**
     * Ghi nhận 1 lần đăng nhập thất bại. Nếu vượt quá maxLoginAttempts, sẽ kích hoạt thời gian khóa.
     */
    public int recordFailedLogin(String identifier) {
        if (!enabled || identifier == null || identifier.isBlank()) return 0;
        String cleanId = normalize(identifier);
        int attempts = 1;

        try {
            if (redis != null) {
                String key = "auth:attempts:" + cleanId;
                Long count = redis.opsForValue().increment(key);
                if (count != null) {
                    attempts = count.intValue();
                    // Đặt thời gian hết hạn cho bộ đếm đăng nhập sai
                    redis.expire(key, Duration.ofMinutes(lockoutMinutes));
                    log.warn("Đăng nhập thất bại lần {} cho '{}'", attempts, cleanId);
                    return attempts;
                }
            }
        } catch (Exception ex) {
            log.debug("Redis không khả dụng khi ghi nhận thất bại: {}", ex.getMessage());
        }

        attempts = memoryAttempts.merge(cleanId, 1, Integer::sum);
        if (attempts >= maxLoginAttempts) {
            memoryLockouts.put(cleanId, Instant.now().plus(Duration.ofMinutes(lockoutMinutes)));
        }
        return attempts;
    }

    /**
     * Xóa bộ đếm đăng nhập sai khi người dùng đăng nhập thành công.
     */
    public void resetFailedAttempts(String identifier) {
        if (!enabled || identifier == null || identifier.isBlank()) return;
        String cleanId = normalize(identifier);

        try {
            if (redis != null) {
                redis.delete("auth:attempts:" + cleanId);
            }
        } catch (Exception ex) {
            log.debug("Redis không khả dụng khi xóa bộ đếm thất bại: {}", ex.getMessage());
        }

        memoryAttempts.remove(cleanId);
        memoryLockouts.remove(cleanId);
    }

    /**
     * Lấy số phút còn lại trước khi tài khoản được mở khóa.
     */
    public long getRemainingLockTimeMinutes(String identifier) {
        if (!enabled || identifier == null || identifier.isBlank()) return 0;
        String cleanId = normalize(identifier);

        try {
            if (redis != null) {
                String key = "auth:attempts:" + cleanId;
                Long expireSeconds = redis.getExpire(key, TimeUnit.SECONDS);
                if (expireSeconds != null && expireSeconds > 0) {
                    return Math.max(1, (expireSeconds + 59) / 60);
                }
            }
        } catch (Exception ex) {
            log.debug("Redis không khả dụng khi lấy TTL khóa: {}", ex.getMessage());
        }

        Instant lockExpiry = memoryLockouts.get(cleanId);
        if (lockExpiry != null && Instant.now().isBefore(lockExpiry)) {
            return Math.max(1, Duration.between(Instant.now(), lockExpiry).toMinutes() + 1);
        }
        return 0;
    }

    /**
     * Lưu trữ phiên làm việc đang hoạt động của người dùng vào Redis sau khi đăng nhập thành công.
     */
    public void saveSession(UUID userId, String token, long expiresInSeconds, String email, String role) {
        if (!enabled || userId == null || token == null) return;

        try {
            if (redis != null) {
                String sessionKey = "auth:session:" + userId;
                String tokenHash = hashToken(token);
                String val = String.format("{\"tokenHash\":\"%s\",\"email\":\"%s\",\"role\":\"%s\",\"loginTime\":\"%s\"}",
                        tokenHash, email != null ? email : "", role != null ? role : "", Instant.now());
                long ttl = expiresInSeconds > 0 ? expiresInSeconds : 86400;
                redis.opsForValue().set(sessionKey, val, ttl, TimeUnit.SECONDS);
                log.info("Đã lưu phiên đăng nhập Redis cho User ID: {} (TTL: {}s)", userId, ttl);
            }
        } catch (Exception ex) {
            log.debug("Không thể ghi phiên đăng nhập vào Redis: {}", ex.getMessage());
        }
    }

    /**
     * Đưa Token vào danh sách Blacklist khi đăng xuất để vô hiệu hóa ngay lập tức.
     */
    public void blacklistToken(String token, long remainingSeconds) {
        if (!enabled || token == null || token.isBlank()) return;
        String tokenHash = hashToken(token);
        long ttl = remainingSeconds > 0 ? remainingSeconds : 86400;

        try {
            if (redis != null) {
                String blacklistKey = "auth:blacklist:" + tokenHash;
                redis.opsForValue().set(blacklistKey, "REVOKED", ttl, TimeUnit.SECONDS);
                log.info("Token đã được đưa vào Redis Blacklist (TTL: {}s)", ttl);
            }
        } catch (Exception ex) {
            log.debug("Không thể đưa token vào Redis Blacklist: {}", ex.getMessage());
        }

        memoryBlacklist.put(tokenHash, Instant.now().plusSeconds(ttl));
    }

    /**
     * Kiểm tra xem Token có nằm trong danh sách đen (Blacklist / đã đăng xuất) hay không.
     */
    public boolean isTokenBlacklisted(String token) {
        if (!enabled || token == null || token.isBlank()) return false;
        String tokenHash = hashToken(token);

        try {
            if (redis != null) {
                String blacklistKey = "auth:blacklist:" + tokenHash;
                Boolean exists = redis.hasKey(blacklistKey);
                if (Boolean.TRUE.equals(exists)) {
                    return true;
                }
            }
        } catch (Exception ex) {
            log.debug("Redis không khả dụng khi kiểm tra token blacklist: {}", ex.getMessage());
        }

        Instant expiry = memoryBlacklist.get(tokenHash);
        if (expiry != null) {
            if (Instant.now().isBefore(expiry)) {
                return true;
            } else {
                memoryBlacklist.remove(tokenHash);
            }
        }
        return false;
    }

    /**
     * Hủy phiên làm việc của người dùng (khi đổi mật khẩu hoặc đăng xuất toàn bộ thiết bị).
     */
    public void revokeUserSession(UUID userId) {
        if (!enabled || userId == null) return;

        try {
            if (redis != null) {
                redis.delete("auth:session:" + userId);
                log.info("Đã hủy phiên làm việc Redis cho User ID: {}", userId);
            }
        } catch (Exception ex) {
            log.debug("Không thể xóa phiên làm việc Redis: {}", ex.getMessage());
        }
    }

    private String normalize(String str) {
        return str.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            return String.valueOf(token.hashCode());
        }
    }
}
