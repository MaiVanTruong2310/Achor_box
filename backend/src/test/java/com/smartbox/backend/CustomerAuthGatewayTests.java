package com.smartbox.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.security.SupabaseAuthGateway;
import com.smartbox.backend.exception.*;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class CustomerAuthGatewayTests {
    HttpServer server;SupabaseAuthGateway gateway;
    AtomicReference<Map<?,?>> body=new AtomicReference<>();AtomicReference<String> route=new AtomicReference<>(),authorization=new AtomicReference<>();
    volatile int status=200;volatile String response="{}";
    @BeforeEach void start() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/auth/v1",request->{
            route.set(request.getRequestMethod()+" "+request.getRequestURI());authorization.set(request.getRequestHeaders().getFirst("Authorization"));
            assertEquals("test-anon-key",request.getRequestHeaders().getFirst("apikey"));
            byte[] input=request.getRequestBody().readAllBytes();if(input.length>0)body.set(new ObjectMapper().readValue(input,Map.class));
            byte[] output=response.getBytes(StandardCharsets.UTF_8);request.getResponseHeaders().set("Content-Type","application/json");request.sendResponseHeaders(status,output.length);request.getResponseBody().write(output);request.close();
        });server.start();gateway=new SupabaseAuthGateway("http://127.0.0.1:"+server.getAddress().getPort(),"test-anon-key","");
    }
    @AfterEach void stop(){server.stop(0);}
    @Test void signupUsesAnonProviderAndOnlyWhitelistedMetadata(){
        gateway.register("customer@smartbox.test","password-123","Tên khách","0912345678","http://localhost:5174/login");
        assertTrue(route.get().startsWith("POST /auth/v1/signup?redirect_to="));assertNull(authorization.get());
        var data=(Map<?,?>)body.get().get("data");assertEquals(Set.of("full_name","phone"),data.keySet());assertFalse(body.get().containsKey("role"));assertFalse(body.get().containsKey("email_confirm"));
    }
    @Test void recoveryVerificationFixesTypeAndPasswordUsesOnlyReturnedSession(){
        response="{\"access_token\":\"verified-recovery-token\"}";
        var session=gateway.verifyRecovery("one-use-hash");assertEquals(Map.of("type","recovery","token_hash","one-use-hash"),body.get());assertEquals("POST /auth/v1/verify",route.get());
        response="{}";gateway.updatePassword(session.get("access_token").toString(),"new-password-123");
        assertEquals("PUT /auth/v1/user",route.get());assertEquals("Bearer verified-recovery-token",authorization.get());assertEquals(Map.of("password","new-password-123"),body.get());
    }
    @Test void expiredProofAndUnavailableOrLimitedProviderNeverSucceed(){
        status=403;response="{\"msg\":\"expired\"}";assertThrows(UnauthorizedException.class,()->gateway.verifyRecovery("expired"));
        status=429;assertEquals(429,assertThrows(AppException.class,()->gateway.register("a@b.test","password-123","Khách","","http://localhost/login")).getCode());
        status=503;assertEquals(503,assertThrows(AppException.class,()->gateway.recovery("a@b.test","http://localhost/reset-password")).getCode());
    }
    @Test void recoveryRequestUsesConfiguredRedirect(){gateway.recovery("a@b.test","http://localhost:5174/reset-password");assertTrue(route.get().startsWith("POST /auth/v1/recover?redirect_to="));assertEquals(Map.of("email","a@b.test"),body.get());}
}
