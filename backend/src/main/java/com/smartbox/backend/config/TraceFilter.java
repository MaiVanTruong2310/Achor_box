package com.smartbox.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;

@Component
@Order(-100)
public class TraceFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        String incoming=req.getHeader("X-Trace-Id");
        String trace=incoming!=null&&incoming.matches("[A-Za-z0-9_-]{1,64}")?incoming:UUID.randomUUID().toString();
        MDC.put("traceId",trace);res.setHeader("X-Trace-Id",trace);
        try {chain.doFilter(req,res);}finally{MDC.remove("traceId");}
    }
}
