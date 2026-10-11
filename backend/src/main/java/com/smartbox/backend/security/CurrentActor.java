package com.smartbox.backend.security;

import com.smartbox.backend.exception.ForbiddenException;
import com.smartbox.backend.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.util.Set;
import java.util.UUID;

@Component
public class CurrentActor {
    public record Actor(UUID id, String role) {
        public void requireOwner(UUID owner) {
            if (!id.equals(owner)) throw new ForbiddenException("Không có quyền truy cập đơn hàng/thiết bị này");
        }
        public void requireRoles(String... roles) {
            if (!Set.of(roles).contains(role)) throw new ForbiddenException("Vai trò không có quyền thực hiện thao tác");
        }
        public boolean staff() { return !"customer".equals(role); }
    }
    public Actor get() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs))
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        HttpServletRequest req = attrs.getRequest();
        UUID id = (UUID) req.getAttribute("CURRENT_USER_ID");
        String role = (String) req.getAttribute("CURRENT_USER_ROLE");
        if (id == null || role == null) throw new UnauthorizedException("Yêu cầu đăng nhập");
        return new Actor(id, role);
    }
}
