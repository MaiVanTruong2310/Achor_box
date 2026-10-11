package com.smartbox.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.common.ApiResponse;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component @Order(-90) @RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private record Window(long start,int count){}
    private final Map<String,Window> windows=new ConcurrentHashMap<>();
    private final ObjectMapper json;
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        String path=req.getRequestURI();
        if(!"POST".equals(req.getMethod())||!java.util.Set.of("/api/auth/login","/api/auth/refresh-token","/api/payments/callback").contains(path)){chain.doFilter(req,res);return;}
        long now=System.nanoTime();String key=req.getRemoteAddr()+":"+path;
        Window window=windows.compute(key,(ignored,previous)->previous==null||now-previous.start()>60_000_000_000L?new Window(now,1):new Window(previous.start(),previous.count()+1));
        int maximum=path.contains("payments")?120:10;
        if(window.count()>maximum||windows.size()>10000){res.setStatus(429);res.setHeader("Retry-After","60");res.setContentType("application/json;charset=UTF-8");json.writeValue(res.getWriter(),ApiResponse.error(429,"RATE_LIMITED"));return;}
        chain.doFilter(req,res);
    }
    @Scheduled(fixedDelay=60000) public void cleanup(){long now=System.nanoTime();windows.entrySet().removeIf(e->now-e.getValue().start()>60_000_000_000L);}
}
