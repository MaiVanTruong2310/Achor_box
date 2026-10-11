package com.smartbox.backend;

import com.smartbox.backend.config.JwtAuthenticationFilter;
import com.smartbox.backend.dto.request.LoginRequest;
import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.ProfileRepository;
import com.smartbox.backend.security.SupabaseAuthGateway;
import com.smartbox.backend.service.AuthService;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.ModelAndView;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SecurityTests {
    SupabaseAuthGateway provider;ProfileRepository profiles;JwtAuthenticationFilter filter;
    UUID user=UUID.randomUUID();
    @BeforeEach void setup(){
        provider=mock(SupabaseAuthGateway.class);profiles=mock(ProfileRepository.class);
        filter=new JwtAuthenticationFilter(provider,profiles,(req,res,handler,error)->{res.setStatus(((AppException)error).getCode());return new ModelAndView();});
    }
    @AfterEach void cleanup(){SecurityContextHolder.clearContext();}
    int request(String method,String path,String token) throws Exception {
        var req=new MockHttpServletRequest(method,path);var res=new MockHttpServletResponse();
        if(token!=null)req.addHeader("Authorization","Bearer "+token);
        var reached=new AtomicBoolean();filter.doFilter(req,res,(r,s)->reached.set(true));
        return reached.get()?200:res.getStatus();
    }
    void profile(String role,boolean locked){when(provider.identity("access")).thenReturn(user);when(profiles.findById(user)).thenReturn(Optional.of(Profile.builder().id(user).role(role).isLocked(locked).build()));}
    @Test void privateGetRequiresToken() throws Exception {assertEquals(401,request("GET","/api/orders",null));assertEquals(401,request("GET","/api/users",null));assertEquals(401,request("GET","/api/devices",null));assertEquals(401,request("GET","/api/audit-logs",null));}
    @Test void publicCatalogAndHmacCallbackDoNotRequireJwt() throws Exception {assertEquals(200,request("GET","/api/products",null));assertEquals(200,request("POST","/api/payments/callback","gateway-specific-header"));verifyNoInteractions(provider);}
    @Test void customerCannotMutateAdminResources() throws Exception {profile("customer",false);assertEquals(403,request("PUT","/api/products/"+UUID.randomUUID(),"access"));assertEquals(403,request("GET","/api/users","access"));assertEquals(403,request("PATCH","/api/orders/"+UUID.randomUUID()+"/status","access"));}
    @Test void roleIsLoadedFromDatabaseAndLockedAccountDenied() throws Exception {profile("product_manager",false);assertEquals(200,request("PUT","/api/products/"+UUID.randomUUID(),"access"));profile("product_manager",true);assertEquals(401,request("PUT","/api/products/"+UUID.randomUUID(),"access"));}
    @Test void providerFailureFailsClosed() throws Exception {when(provider.identity("refresh-token")).thenThrow(new UnauthorizedException("INVALID_ACCESS_TOKEN"));assertEquals(401,request("GET","/api/orders","refresh-token"));}
    @Test void knownDemoPasswordCannotBypassProvider(){
        var request=LoginRequest.builder().email("somebody@smartbox.test").password("Admin@123456").build();
        when(provider.password(anyString(),anyString())).thenThrow(new UnauthorizedException("BAD_PASSWORD"));
        assertThrows(UnauthorizedException.class,()->new AuthService(provider,profiles).login(request));verifyNoInteractions(profiles);
    }
}
