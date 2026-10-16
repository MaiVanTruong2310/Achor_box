package com.smartbox.backend;

import com.smartbox.backend.service.auth.RedisAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Kiểm thử Redis Authentication & Rate Limiting Service")
class RedisAuthServiceTests {

    private RedisAuthService redisAuthService;

    @BeforeEach
    void setUp() {
        // Khởi tạo RedisAuthService không có Redis server thật -> kích hoạt cơ chế In-Memory Fallback tự động
        redisAuthService = new RedisAuthService(null);
        ReflectionTestUtils.setField(redisAuthService, "enabled", true);
        ReflectionTestUtils.setField(redisAuthService, "maxLoginAttempts", 5);
        ReflectionTestUtils.setField(redisAuthService, "lockoutMinutes", 15);
    }

    @Test
    @DisplayName("Đăng nhập sai dưới 5 lần không bị khóa, đạt 5 lần thì bị khóa")
    void testFailedLoginAttemptLockout() {
        String testUser = "user@smartbox.vn";

        assertFalse(redisAuthService.isLoginLocked(testUser), "Ban đầu tài khoản không bị khóa");

        // Thử sai 4 lần
        for (int i = 1; i <= 4; i++) {
            int attempts = redisAuthService.recordFailedLogin(testUser);
            assertEquals(i, attempts);
            assertFalse(redisAuthService.isLoginLocked(testUser), "Dưới 5 lần vẫn chưa bị khóa");
        }

        // Lần thứ 5 -> Khóa tài khoản
        int fifthAttempt = redisAuthService.recordFailedLogin(testUser);
        assertEquals(5, fifthAttempt);
        assertTrue(redisAuthService.isLoginLocked(testUser), "Đã đủ 5 lần đăng nhập sai, tài khoản phải bị khóa");
        assertTrue(redisAuthService.getRemainingLockTimeMinutes(testUser) > 0, "Thời gian khóa phải lớn hơn 0 phút");

        // Đăng nhập thành công -> Reset bộ đếm
        redisAuthService.resetFailedAttempts(testUser);
        assertFalse(redisAuthService.isLoginLocked(testUser), "Sau khi reset, tài khoản không còn bị khóa");
    }

    @Test
    @DisplayName("Token đưa vào Blacklist khi đăng xuất phải bị từ chối")
    void testTokenBlacklistOnLogout() {
        String sampleToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample-token-content";

        assertFalse(redisAuthService.isTokenBlacklisted(sampleToken), "Token mới không nằm trong blacklist");

        // Người dùng đăng xuất -> Blacklist token
        redisAuthService.blacklistToken(sampleToken, 3600);
        assertTrue(redisAuthService.isTokenBlacklisted(sampleToken), "Token sau khi đăng xuất phải nằm trong blacklist");

        // Token khác không bị ảnh hưởng
        assertFalse(redisAuthService.isTokenBlacklisted("another-valid-token"), "Token khác không bị ảnh hưởng");
    }

    @Test
    @DisplayName("Lưu và xóa phiên làm việc User Session")
    void testUserSessionManagement() {
        UUID userId = UUID.randomUUID();
        String sampleToken = "jwt-session-token-" + userId;

        assertDoesNotThrow(() -> redisAuthService.saveSession(userId, sampleToken, 3600, "user@smartbox.vn", "customer"));
        assertDoesNotThrow(() -> redisAuthService.revokeUserSession(userId));
    }
}
