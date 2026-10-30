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

    @Test
    @DisplayName("Khi thay đổi vai trò (Role Change), toàn bộ token hiện tại bị đưa vào Blacklist và yêu cầu đăng nhập lại")
    void testBlacklistUserTokensOnRoleChange() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        String tokenA1 = "token-user-a-device-1";
        String tokenA2 = "token-user-a-device-2";
        String tokenB = "token-user-b-device-1";

        // 1. Giả lập 2 user đăng nhập và lưu session / cache
        redisAuthService.saveSession(userA, tokenA1, 3600, "userA@smartbox.vn", "customer");
        redisAuthService.cacheAuthSession(tokenA1, userA, "customer", "userA@smartbox.vn", "User A", false, 1800);
        redisAuthService.cacheAuthSession(tokenA2, userA, "customer", "userA@smartbox.vn", "User A", false, 1800);

        redisAuthService.saveSession(userB, tokenB, 3600, "userB@smartbox.vn", "technician");
        redisAuthService.cacheAuthSession(tokenB, userB, "technician", "userB@smartbox.vn", "User B", false, 1800);

        assertFalse(redisAuthService.isTokenBlacklisted(tokenA1));
        assertFalse(redisAuthService.isTokenBlacklisted(tokenA2));
        assertFalse(redisAuthService.isTokenBlacklisted(tokenB));
        assertFalse(redisAuthService.isUserRevoked(userA));
        assertFalse(redisAuthService.isUserRevoked(userB));

        // 2. Admin thay đổi quyền của User A -> đưa toàn bộ token của User A vào blacklist
        redisAuthService.blacklistUserTokens(userA, "ROLE_CHANGED_TO_technician");

        // 3. Toàn bộ token hiện tại của User A phải nằm trong blacklist
        assertTrue(redisAuthService.isTokenBlacklisted(tokenA1), "Token 1 của User A phải nằm trong blacklist");
        assertTrue(redisAuthService.isTokenBlacklisted(tokenA2), "Token 2 của User A phải nằm trong blacklist");
        assertTrue(redisAuthService.isUserRevoked(userA), "User A phải ở trạng thái revoked (yêu cầu đăng nhập lại)");
        assertNull(redisAuthService.getCachedAuthSession(tokenA1), "Cache phiên làm việc của token cũ phải bị xóa");

        // 4. User B hoàn toàn không bị ảnh hưởng
        assertFalse(redisAuthService.isTokenBlacklisted(tokenB), "Token của User B không bị ảnh hưởng");
        assertFalse(redisAuthService.isUserRevoked(userB), "User B không bị thu hồi");
        assertNotNull(redisAuthService.getCachedAuthSession(tokenB), "Cache của User B vẫn hoạt động bình thường");

        // 5. User A đăng nhập lại -> nhận token mới hợp lệ, trạng thái revoked được xóa
        String newTokenA = "new-token-user-a-after-login";
        redisAuthService.saveSession(userA, newTokenA, 3600, "userA@smartbox.vn", "technician");

        assertFalse(redisAuthService.isUserRevoked(userA), "Sau khi đăng nhập lại, cờ revoked của User A được gỡ");
        assertFalse(redisAuthService.isTokenBlacklisted(newTokenA), "Token mới không bị blacklist");
        assertTrue(redisAuthService.isTokenBlacklisted(tokenA1), "Token cũ trước đó vẫn vĩnh viễn bị blacklist");
    }
}
