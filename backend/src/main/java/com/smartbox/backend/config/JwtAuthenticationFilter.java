package com.smartbox.backend.config;

import com.smartbox.backend.exception.ForbiddenException;
import com.smartbox.backend.exception.UnauthorizedException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Component
@Order(1)
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final HandlerExceptionResolver resolver;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthenticationFilter(JwtProvider jwtProvider,
                                   @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
        this.jwtProvider = jwtProvider;
        this.resolver = resolver;
    }

    // Danh sách các URL công khai cho phép truy cập tự do (không cần token)
    private static final List<String> PUBLIC_URL_PATTERNS = Arrays.asList(
            "/api/auth/login",
            "/api/auth/refresh-token",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/v3/api-docs",
            "/error",
            "/favicon.ico"
    );

    // Danh sách các URL cho phép xem thông tin bằng phương thức GET (không cần token)
    private static final List<String> PUBLIC_GET_URL_PATTERNS = Arrays.asList(
            "/api/dashboard/**",
            "/api/products/**",
            "/api/content/**",
            "/api/promotions/**",
            "/api/warranties/**",
            "/api/devices/**",
            "/api/orders/**",
            "/api/users/**",
            "/api/settings/**",
            "/api/audit-logs/**"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // 1. Cho phép tất cả request OPTIONS (CORS Preflight) đi qua
        if ("OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Kiểm tra các URL công khai cố định (Login, Refresh-Token, Swagger)
        for (String pattern : PUBLIC_URL_PATTERNS) {
            if (pathMatcher.match(pattern, path)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        // 3. Kiểm tra các URL xem thông tin công khai bằng GET (Sản phẩm, Bài viết, Khuyến mãi)
        if ("GET".equalsIgnoreCase(method)) {
            for (String pattern : PUBLIC_GET_URL_PATTERNS) {
                if (pathMatcher.match(pattern, path)) {
                    filterChain.doFilter(request, response);
                    return;
                }
            }
        }

        // 4. Nếu không thuộc các URL công khai -> BẮT BUỘC PHẢI CÓ JWT TOKEN
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            resolver.resolveException(request, response, null,
                    new UnauthorizedException("Truy cập bị từ chối: Thao tác này yêu cầu đăng nhập. Vui lòng đính kèm Bearer JWT Token vào Header 'Authorization'!"));
            return;
        }

        String token = authHeader.substring(7).trim();

        if (!jwtProvider.validateToken(token)) {
            resolver.resolveException(request, response, null,
                    new UnauthorizedException("Token xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại để lấy token mới!"));
            return;
        }

        // 5. Token hợp lệ -> Trích xuất claims và kiểm tra phân quyền RBAC
        try {
            UUID userId = jwtProvider.extractUserId(token);
            String email = jwtProvider.extractEmail(token);
            String role = jwtProvider.extractRole(token);

            request.setAttribute("CURRENT_USER_ID", userId);
            request.setAttribute("CURRENT_USER_EMAIL", email);
            request.setAttribute("CURRENT_USER_ROLE", role);

            // Kiểm tra phân quyền RBAC: Nếu role là "customer" cố truy cập API nhạy cảm của quản trị viên
            if ("customer".equalsIgnoreCase(role)) {
                if (path.startsWith("/api/users/staff") || path.startsWith("/api/audit-logs") || path.contains("/toggle-lock") || path.contains("/role")) {
                    resolver.resolveException(request, response, null,
                            new ForbiddenException("Truy cập bị cấm (403 Forbidden): Tài khoản khách hàng không có quyền thực thi thao tác quản trị nội bộ này!"));
                    return;
                }
            }
        } catch (Exception e) {
            log.warn("Không thể trích xuất claims từ token: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
