package com.smartbox.backend.config;

import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.ProfileRepository;
import com.smartbox.backend.security.SupabaseAuthGateway;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;
import java.io.IOException;
import java.util.*;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final SupabaseAuthGateway provider;
    private final ProfileRepository profiles;
    private final HandlerExceptionResolver errors;
    private final com.smartbox.backend.service.CustomerIdentityService identities;
    public JwtAuthenticationFilter(SupabaseAuthGateway provider,ProfileRepository profiles,@Qualifier("handlerExceptionResolver") HandlerExceptionResolver errors,com.smartbox.backend.service.CustomerIdentityService identities) {
        this.provider=provider;this.profiles=profiles;this.errors=errors;this.identities=identities;
    }
    public static boolean publicPath(HttpServletRequest request) {
        String path=request.getRequestURI();
        if("OPTIONS".equals(request.getMethod())) return true;
        if(path.startsWith("/swagger-ui")||path.startsWith("/v3/api-docs")||Set.of("/error","/favicon.ico").contains(path))return true;
        if("POST".equals(request.getMethod()) && Set.of("/api/auth/login","/api/auth/refresh-token","/api/auth/register","/api/auth/forgot-password","/api/auth/reset-password","/api/payments/callback").contains(path))return true;
        return "GET".equals(request.getMethod()) && (path.equals("/api/payments/vnpay/ipn")||path.equals("/api/payments/vnpay/return")||path.equals("/api/payments/mode")||path.equals("/api/products")||path.equals("/api/products/categories")||path.matches("/api/products/[0-9a-fA-F-]{36}/variants"));
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        if(publicPath(request) && (request.getHeader("Authorization")==null || "POST".equals(request.getMethod()) || "OPTIONS".equals(request.getMethod()))) {chain.doFilter(request,response);return;}
        try {
            String header=request.getHeader("Authorization");
            if(header==null||!header.startsWith("Bearer "))throw new UnauthorizedException("Yêu cầu Bearer access token");
            UUID id=provider.identity(header.substring(7));
            var profile=profiles.findById(id).orElseGet(()->{
                var user=provider.user(header.substring(7));
                if(user==null||!id.toString().equals(Objects.toString(user.get("id"))))throw new UnauthorizedException("INVALID_ACCESS_TOKEN");
                return identities.ensure(user);
            });
            if(Boolean.TRUE.equals(profile.getIsLocked())) throw new UnauthorizedException("ACCOUNT_LOCKED");
            String role=profile.getRole();
            if(!Set.of("super_admin","product_manager","support_agent","technician","accountant","customer").contains(role)) throw new ForbiddenException("INVALID_ROLE");
            authorize(request,role);
            request.setAttribute("CURRENT_USER_ID",id);request.setAttribute("CURRENT_USER_ROLE",role);request.setAttribute("CURRENT_USER_EMAIL",profile.getEmail());
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(id,null,List.of(new SimpleGrantedAuthority("ROLE_"+role))));
        } catch(AppException ex) {errors.resolveException(request,response,null,ex);return;}
        catch(Exception ex) {errors.resolveException(request,response,null,new UnauthorizedException("INVALID_ACCESS_TOKEN"));return;}
        chain.doFilter(request,response);
    }
    private void authorize(HttpServletRequest req,String role) {
        String path=req.getRequestURI();boolean read="GET".equals(req.getMethod());
        if(publicPath(req) || path.startsWith("/api/auth/"))return;
        Set<String> allowed;
        if(path.startsWith("/api/users")&&(path.endsWith("/role")||path.equals("/api/users/staff"))) allowed=Set.of("super_admin");
        else if(path.startsWith("/api/users")) allowed=Set.of("super_admin","support_agent");
        else if(path.startsWith("/api/audit-logs")) allowed=read?Set.of("super_admin","accountant"):Set.of("super_admin");
        else if(path.startsWith("/api/settings")) allowed=Set.of("super_admin");
        else if(path.startsWith("/api/products")) allowed=read?Set.of("super_admin","product_manager","support_agent","accountant"):Set.of("super_admin","product_manager");
        else if(path.startsWith("/api/promotions")) allowed=read?Set.of("super_admin","product_manager","support_agent","accountant"):Set.of("super_admin","product_manager");
        else if(path.startsWith("/api/content")) allowed=Set.of("super_admin","product_manager");
        else if(path.startsWith("/api/warranties")) allowed=Set.of("super_admin","support_agent","technician");
        else if((path.equals("/api/orders") && read) || path.equals("/api/orders/paged")) allowed=Set.of("super_admin","support_agent","accountant");
        else if(path.matches("/api/orders/[^/]+/(status|tracking)")) allowed=Set.of("super_admin","support_agent");
        else if(path.startsWith("/api/dashboard")||path.startsWith("/api/reports")||path.equals("/api/admin/dashboard"))allowed=Set.of("super_admin","accountant");
        else if(path.equals("/api/devices")||path.equals("/api/devices/paged")||path.equals("/api/devices/events")||path.matches("/api/devices/[^/]+/status"))allowed=Set.of("super_admin","technician");
        else return; // Customer-facing services enforce ownership and action-specific roles.
        if(!allowed.contains(role)) throw new ForbiddenException("Vai trò không có quyền truy cập chức năng này");
    }
}
