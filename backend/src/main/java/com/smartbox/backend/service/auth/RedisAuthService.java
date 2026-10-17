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

    // L1 In-Memory Auth Cache để tăng tốc xác thực mọi HTTP request (<0.01ms)
    private final Map<String, CachedUserSession> memoryAuthCache = new ConcurrentHashMap<>();
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public record CachedUserSession(
        UUID userId,
        String role,
        String email,
        String fullName,
        boolean isLocked,
        long expiresAtEpochMs
    ) {
        public boolean isExpired() {
            return System.currentTimeMillis() >= expiresAtEpochMs;
        }
    }

    public RedisAuthService(StringRedisTemplate redis) {
        this(redis, new com.fasterxml.jackson.databind.ObjectMapper());
    }

    @Autowired
    public RedisAuthService(@Autowired(required = false) StringRedisTemplate redis,
                            @Autowired(required = false) com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper != null ? objectMapper : new com.fasterxml.jackson.databind.ObjectMapper();
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
                    log.warn("[XAC THUC] Dang nhap that bai (Sai mat khau) lan {}/{} cho tai khoan '{}'", attempts, maxLoginAttempts, cleanId);
                    return attempts;
                }
            }
        } catch (Exception ex) {
            log.debug("Redis không khả dụng khi ghi nhận thất bại: {}", ex.getMessage());
        }

        attempts = memoryAttempts.merge(cleanId, 1, Integer::sum);
        log.warn("[XAC THUC] Dang nhap that bai (Sai mat khau) lan {}/{} cho tai khoan '{}'", attempts, maxLoginAttempts, cleanId);
        if (attempts >= maxLoginAttempts) {
            memoryLockouts.put(cleanId, Instant.now().plus(Duration.ofMinutes(lockoutMinutes)));
            log.warn("[XAC THUC] Tai khoan '{}' da bi khoa tam thoi trong {} phut do dang nhap sai qua {} lan", cleanId, lockoutMinutes, maxLoginAttempts);
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
     * Cache thông tin phiên xác thực người dùng theo hash của access token (L1 Memory + L2 Redis).
     * Giúp mọi HTTP request tiếp theo được xác thực trong <0.01ms mà không cần gọi Supabase/DB.
     */
    public void cacheAuthSession(String token, UUID userId, String role, String email, String fullName, boolean isLocked, long ttlSeconds) {
        if (!enabled || token == null || token.isBlank() || userId == null) return;
        String tokenHash = hashToken(token);
        long ttl = ttlSeconds > 0 ? ttlSeconds : 300;
        long expiresAt = System.currentTimeMillis() + (ttl * 1000);
        CachedUserSession session = new CachedUserSession(userId, role, email, fullName, isLocked, expiresAt);

        // L1: In-Memory
        memoryAuthCache.put(tokenHash, session);

        // L2: Redis
        try {
            if (redis != null) {
                String tokenKey = "auth:token:" + tokenHash;
                Map<String, Object> data = Map.of(
                        "userId", userId.toString(),
                        "role", role != null ? role : "",
                        "email", email != null ? email : "",
                        "fullName", fullName != null ? fullName : "",
                        "isLocked", isLocked
                );
                String val = objectMapper.writeValueAsString(data);
                redis.opsForValue().set(tokenKey, val, ttl, TimeUnit.SECONDS);
            }
        } catch (Exception ex) {
            log.debug("Không thể ghi token cache vào Redis: {}", ex.getMessage());
        }
    }

    /**
     * Lấy phiên xác thực đã được cache từ L1 Memory hoặc L2 Redis.
     */
    public CachedUserSession getCachedAuthSession(String token) {
        if (!enabled || token == null || token.isBlank()) return null;
        if (isTokenBlacklisted(token)) return null;

        String tokenHash = hashToken(token);

        // Kiểm tra L1: In-Memory cache
        CachedUserSession session = memoryAuthCache.get(tokenHash);
        if (session != null) {
            if (!session.isExpired()) {
                return session;
            } else {
                memoryAuthCache.remove(tokenHash);
            }
        }

        // Kiểm tra L2: Redis cache
        try {
            if (redis != null) {
                String tokenKey = "auth:token:" + tokenHash;
                String val = redis.opsForValue().get(tokenKey);
                if (val != null) {
                    Long ttl = redis.getExpire(tokenKey, TimeUnit.SECONDS);
                    long expiresAt = System.currentTimeMillis() + ((ttl != null && ttl > 0 ? ttl : 60) * 1000);
                    Map<?, ?> map = objectMapper.readValue(val, Map.class);
                    UUID userId = UUID.fromString(map.get("userId").toString());
                    String role = (String) map.get("role");
                    String email = (String) map.get("email");
                    String fullName = (String) map.get("fullName");
                    boolean isLocked = Boolean.TRUE.equals(map.get("isLocked"));

                    CachedUserSession fromRedis = new CachedUserSession(userId, role, email, fullName, isLocked, expiresAt);
                    memoryAuthCache.put(tokenHash, fromRedis);
                    return fromRedis;
                }
            }
        } catch (Exception ex) {
            log.debug("Không thể đọc token cache từ Redis: {}", ex.getMessage());
        }

        return null;
    }

    /**
     * Hủy cache phiên xác thực của một token.
     */
    public void invalidateToken(String token) {
        if (token == null || token.isBlank()) return;
        String tokenHash = hashToken(token);
        memoryAuthCache.remove(tokenHash);
        try {
            if (redis != null) {
                redis.delete("auth:token:" + tokenHash);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Đưa Token vào danh sách Blacklist khi đăng xuất để vô hiệu hóa ngay lập tức.
     */
    public void blacklistToken(String token, long remainingSeconds) {
        if (!enabled || token == null || token.isBlank()) return;
        invalidateToken(token);
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

        memoryAuthCache.values().removeIf(s -> userId.equals(s.userId()));

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
