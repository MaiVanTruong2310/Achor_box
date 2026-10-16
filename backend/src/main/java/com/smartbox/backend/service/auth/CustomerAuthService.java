package com.smartbox.backend.service.auth;

import com.smartbox.backend.dto.request.customer.CustomerRequests;
import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.UnauthorizedException;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.security.SupabaseAuthGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerAuthService {

    private final SupabaseAuthGateway provider;
    private final CurrentActor actors;
    private final CustomerAccountService accounts;

    @Value("${smartbox.shop-url:http://localhost:5174}")
    private String shopUrl;

    private String redirect(String path) {
        try {
            var uri = URI.create(shopUrl);
            if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getQuery() != null || uri.getFragment() != null) {
                throw new IllegalArgumentException();
            }
            return shopUrl.replaceAll("/+$", "") + path;
        } catch (IllegalArgumentException ex) {
            throw new AppException(503, "AUTH_REDIRECT_NOT_CONFIGURED");
        }
    }

    private void revoke(String token) {
        try {
            provider.logout(token);
        } catch (RuntimeException ex) {
            log.warn("Password updated or attempted; provider session revocation unavailable");
        }
    }

    public Map<String, Object> register(CustomerRequests.Register request) {
        provider.register(request.email().trim().toLowerCase(Locale.ROOT), request.password(), request.fullName().trim(), request.phone(), redirect("/login"));
        return Map.of("message", "Nếu email đủ điều kiện đăng ký, hãy kiểm tra email xác nhận rồi đăng nhập. Nếu đã có tài khoản, hãy đăng nhập hoặc đặt lại mật khẩu.", "requiresLogin", true);
    }

    public Map<String, Object> forgot(CustomerRequests.ForgotPassword request) {
        provider.recovery(request.email().trim().toLowerCase(Locale.ROOT), redirect("/reset-password"));
        return Map.of("message", "Nếu tài khoản tồn tại, bạn sẽ nhận email hướng dẫn đặt lại mật khẩu.");
    }

    public Map<String, Object> change(CustomerRequests.ChangePassword request) {
        actors.get().requireRoles("customer");
        var profile = accounts.profile();
        var session = provider.password(profile.get("email").toString(), request.currentPassword());
        if (!(session.get("user") instanceof Map<?, ?> user) || !actors.get().id().toString().equals(Objects.toString(user.get("id")))) {
            throw new UnauthorizedException("PASSWORD_CONFIRMATION_FAILED");
        }
        // Use the reauthenticated session, so an older bearer session cannot authorize a different account.
        try {
            provider.updatePassword(session.get("access_token").toString(), request.newPassword());
        } finally {
            if (session.get("access_token") != null) {
                revoke(session.get("access_token").toString());
            }
        }
        return Map.of("message", "Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
    }

    public Map<String, Object> reset(CustomerRequests.ResetPassword request) {
        var session = provider.verifyRecovery(request.tokenHash());
        if (session == null || session.get("access_token") == null) {
            throw new UnauthorizedException("RECOVERY_LINK_INVALID_OR_EXPIRED");
        }
        String token = session.get("access_token").toString();
        try {
            provider.updatePassword(token, request.newPassword());
        } finally {
            revoke(token);
        }
        return Map.of("message", "Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.");
    }
}
