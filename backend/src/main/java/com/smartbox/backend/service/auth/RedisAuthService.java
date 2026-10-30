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
    private final Map<UUID, java.util.Set<String>> memoryUserTokens = new ConcurrentHashMap<>();
    private final Map<UUID, Long> memoryUserRevoked = new ConcurrentHashMap<>();

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

        // Xóa cờ thu hồi phiên trước đó (nếu có) khi người dùng đăng nhập lại thành công
        clearUserRevocation(userId);

        String tokenHash = hashToken(token);
        long ttl = expiresInSeconds > 0 ? expiresInSeconds : 86400;

        // Lưu vào in-memory set token của user
        memoryUserTokens.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(tokenHash);

        try {
            if (redis != null) {
                String sessionKey = "auth:session:" + userId;
                String val = String.format("{\"tokenHash\":\"%s\",\"email\":\"%s\",\"role\":\"%s\",\"loginTime\":\"%s\"}",
                        tokenHash, email != null ? email : "", role != null ? role : "", Instant.now());
                redis.opsForValue().set(sessionKey, val, ttl, TimeUnit.SECONDS);

                // Lưu vào set token của user trong Redis
                String userTokensKey = "auth:user_tokens:" + userId;
                redis.opsForSet().add(userTokensKey, tokenHash);
                redis.expire(userTokensKey, ttl, TimeUnit.SECONDS);

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
        memoryUserTokens.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(tokenHash);

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

                String userTokensKey = "auth:user_tokens:" + userId;
                redis.opsForSet().add(userTokensKey, tokenHash);
                redis.expire(userTokensKey, ttl, TimeUnit.SECONDS);
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
     * Xóa đánh dấu thu hồi phiên người dùng khi họ đăng nhập lại thành công.
     */
    public void clearUserRevocation(UUID userId) {
        if (userId == null) return;
        memoryUserRevoked.remove(userId);
        try {
            if (redis != null) {
                redis.delete("auth:user_revoked:" + userId);
            }
        } catch (Exception ex) {
            log.debug("Không thể xóa user revoked trên Redis: {}", ex.getMessage());
        }
    }

    /**
     * Kiểm tra xem toàn bộ phiên làm việc của user có đang bị thu hồi (đổi role/khóa tài khoản) hay không.
     */
    public boolean isUserRevoked(UUID userId) {
        if (!enabled || userId == null) return false;
        if (memoryUserRevoked.containsKey(userId)) {
            return true;
        }
        try {
            if (redis != null) {
                Boolean hasKey = redis.hasKey("auth:user_revoked:" + userId);
                return Boolean.TRUE.equals(hasKey);
            }
        } catch (Exception ex) {
            log.debug("Không thể kiểm tra user revoked trên Redis: {}", ex.getMessage());
        }
        return false;
    }

    /**
     * Thu hồi toàn bộ phiên đăng nhập của người dùng và đưa tất cả token hiện tại vào Blacklist.
     * Áp dụng khi: Đổi vai trò / quyền hạn (Role changed), Khóa tài khoản (Account locked), Đổi mật khẩu.
     */
    public void blacklistUserTokens(UUID userId, String reason) {
        if (!enabled || userId == null) return;
        log.info("[AUTH] Đang thu hồi và blacklist toàn bộ token của User ID: {} do: {}", userId, reason);

        long ttl = 86400; // 24 giờ
        String revokeReason = (reason != null && !reason.isBlank()) ? reason : "REVOKED";
        java.util.Set<String> tokenHashes = new java.util.HashSet<>();

        // 1. Quét từ In-Memory User Tokens
        java.util.Set<String> memTokens = memoryUserTokens.remove(userId);
        if (memTokens != null) {
            tokenHashes.addAll(memTokens);
        }

        // 2. Quét từ In-Memory Auth Cache
        for (Map.Entry<String, CachedUserSession> entry : memoryAuthCache.entrySet()) {
            if (entry.getValue() != null && userId.equals(entry.getValue().userId())) {
                tokenHashes.add(entry.getKey());
            }
        }

        // 3. Đọc từ Redis Set: auth:user_tokens:{userId}
        try {
            if (redis != null) {
                String userTokensKey = "auth:user_tokens:" + userId;
                java.util.Set<String> redisTokens = redis.opsForSet().members(userTokensKey);
                if (redisTokens != null) {
                    tokenHashes.addAll(redisTokens);
                }
                redis.delete(userTokensKey);
            }
        } catch (Exception ex) {
            log.debug("Lỗi khi đọc user_tokens từ Redis: {}", ex.getMessage());
        }

        // 4. Đọc từ Redis session key: auth:session:{userId}
        try {
            if (redis != null) {
                String sessionKey = "auth:session:" + userId;
                String sessionVal = redis.opsForValue().get(sessionKey);
                if (sessionVal != null && !sessionVal.isBlank()) {
                    try {
                        Map<?, ?> map = objectMapper.readValue(sessionVal, Map.class);
                        Object hashObj = map.get("tokenHash");
                        if (hashObj != null) {
                            tokenHashes.add(hashObj.toString());
                        }
                    } catch (Exception e) {
                        log.debug("Không thể parse session JSON: {}", e.getMessage());
                    }
                }
                redis.delete(sessionKey);
            }
        } catch (Exception ex) {
            log.debug("Lỗi khi đọc session từ Redis: {}", ex.getMessage());
        }

        // 5. Đưa tất cả tokenHash tìm được vào Blacklist (cả Redis và Memory) & xóa cache
        for (String th : tokenHashes) {
            if (th == null || th.isBlank()) continue;
            memoryAuthCache.remove(th);
            memoryBlacklist.put(th, Instant.now().plusSeconds(ttl));

            try {
                if (redis != null) {
                    redis.delete("auth:token:" + th);
                    redis.opsForValue().set("auth:blacklist:" + th, "REVOKED_" + revokeReason, ttl, TimeUnit.SECONDS);
                }
            } catch (Exception ex) {
                log.debug("Lỗi khi đưa tokenHash {} vào Redis blacklist: {}", th, ex.getMessage());
            }
        }

        // 6. Đánh dấu user-level revoked để chặn bất kỳ token hợp lệ nào chưa kịp vào danh sách hash
        memoryUserRevoked.put(userId, System.currentTimeMillis());
        try {
            if (redis != null) {
                redis.opsForValue().set("auth:user_revoked:" + userId, String.valueOf(System.currentTimeMillis()), ttl, TimeUnit.SECONDS);
            }
        } catch (Exception ex) {
            log.debug("Lỗi khi lưu user_revoked vào Redis: {}", ex.getMessage());
        }

        log.info("[AUTH] Đã blacklist {} token cho User ID: {}. Người dùng cần đăng nhập lại để nhận quyền mới.",
                tokenHashes.size(), userId);
    }

    /**
     * Hủy phiên làm việc của người dùng (khi đổi mật khẩu hoặc đăng xuất toàn bộ thiết bị).
     */
    public void revokeUserSession(UUID userId) {
        if (!enabled || userId == null) return;
        blacklistUserTokens(userId, "SESSION_REVOKED");
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
