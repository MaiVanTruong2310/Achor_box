package com.smartbox.backend.security;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/** Password verification and token revocation stay with the existing auth.users provider. */
@Component
public class SupabaseAuthGateway {
    private final RestClient client;
    private final String key;
    private final String url;
    private final String serviceKey;
    public SupabaseAuthGateway(@Value("${smartbox.supabase.url:}") String url,@Value("${smartbox.supabase.anon-key:}") String key,@Value("${smartbox.supabase.service-role-key:}") String serviceKey) {
        this.url=url;this.key=key;this.serviceKey=serviceKey;
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.client=RestClient.builder().baseUrl(url.isBlank()?"http://localhost":url+"/auth/v1").requestFactory(factory).build();
    }
    private void configured() {if(url.isBlank()||key.isBlank()) throw new AppException(503,"AUTH_PROVIDER_NOT_CONFIGURED");}
    public Map<String,Object> password(String email,String password) {return exchange("password",Map.of("email",email,"password",password));}
    public Map<String,Object> refresh(String refreshToken) {return exchange("refresh_token",Map.of("refresh_token",refreshToken));}
    @SuppressWarnings("unchecked")
    public void register(String email,String password,String name,String phone,String redirect) {
        configured();
        try{client.post().uri(builder->builder.path("/signup").queryParam("redirect_to",redirect).build()).header("apikey",key)
            .body(Map.of("email",email,"password",password,"data",Map.of("full_name",name,"phone",phone==null?"":phone)))
            .retrieve().toBodilessEntity();}
        catch(RestClientResponseException ex){if(ex.getStatusCode().value()==429)throw new AppException(429,"AUTH_RATE_LIMITED");throw new AppException(400,"AUTH_REGISTRATION_FAILED");}
        catch(org.springframework.web.client.ResourceAccessException ex){throw new AppException(503,"AUTH_PROVIDER_UNAVAILABLE");}
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> user(String token) {
        configured();
        try{return client.get().uri("/user").header("apikey",key).header("Authorization","Bearer "+token).retrieve().body(Map.class);}
        catch(RestClientResponseException ex){throw new UnauthorizedException("INVALID_ACCESS_TOKEN");}
        catch(org.springframework.web.client.ResourceAccessException ex){throw new AppException(503,"AUTH_PROVIDER_UNAVAILABLE");}
    }
    public void updatePassword(String token,String password){
        configured();
        try{client.put().uri("/user").header("apikey",key).header("Authorization","Bearer "+token).body(Map.of("password",password)).retrieve().toBodilessEntity();}
        catch(RestClientResponseException ex){throw new AppException(400,"AUTH_PASSWORD_UPDATE_FAILED");}
        catch(org.springframework.web.client.ResourceAccessException ex){throw new AppException(503,"AUTH_PROVIDER_UNAVAILABLE");}
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> verifyRecovery(String hash){
        configured();
        try{return client.post().uri("/verify").header("apikey",key).body(Map.of("type","recovery","token_hash",hash)).retrieve().body(Map.class);}
        catch(RestClientResponseException ex){throw new UnauthorizedException("RECOVERY_LINK_INVALID_OR_EXPIRED");}
        catch(org.springframework.web.client.ResourceAccessException ex){throw new AppException(503,"AUTH_PROVIDER_UNAVAILABLE");}
    }
    @SuppressWarnings("unchecked")
    private Map<String,Object> exchange(String grant,Map<String,String> body) {
        configured();
        try {return client.post().uri("/token?grant_type="+grant).header("apikey",key).body(body).retrieve().body(Map.class);}
        catch(RestClientResponseException ex) {throw new UnauthorizedException("Thông tin đăng nhập hoặc refresh token không hợp lệ");}
        catch(org.springframework.web.client.ResourceAccessException ex) {throw new AppException(503,"AUTH_PROVIDER_UNAVAILABLE");}
    }
    @SuppressWarnings("unchecked")
    public UUID identity(String token) {
        configured();
        try {
            var user=client.get().uri("/user").header("apikey",key).header("Authorization","Bearer "+token).retrieve().body(Map.class);
            if(user==null||user.get("id")==null) throw new UnauthorizedException("INVALID_ACCESS_TOKEN");
            return UUID.fromString(user.get("id").toString());
        } catch(RestClientResponseException|IllegalArgumentException ex) {throw new UnauthorizedException("INVALID_ACCESS_TOKEN");}
        catch(org.springframework.web.client.ResourceAccessException ex) {throw new AppException(503,"AUTH_PROVIDER_UNAVAILABLE");}
    }
    public void logout(String token) {
        configured();
        try {client.post().uri("/logout").header("apikey",key).header("Authorization","Bearer "+token).retrieve().toBodilessEntity();}
        catch(RestClientResponseException ex) {throw new UnauthorizedException("INVALID_ACCESS_TOKEN");}
    }
    @SuppressWarnings("unchecked")
    public UUID createStaff(String email,String password,String name) {
        configured();if(serviceKey.isBlank())throw new AppException(503,"AUTH_ADMIN_NOT_CONFIGURED");
        try {
            var user=client.post().uri("/admin/users").header("apikey",serviceKey).header("Authorization","Bearer "+serviceKey)
                .body(Map.of("email",email,"password",password,"email_confirm",true,"user_metadata",Map.of("full_name",name)))
                .retrieve().body(Map.class);
            if(user==null||user.get("id")==null)throw new IllegalStateException("AUTH_ADMIN_INVALID_RESPONSE");
            return UUID.fromString(user.get("id").toString());
        }catch(RestClientResponseException ex){throw new AppException(409,"AUTH_ACCOUNT_CREATION_FAILED");}
    }
    /** Compensation is restricted to a user created by the current provisioning call. */
    public void deleteProvisionedUser(UUID id) {
        if(serviceKey.isBlank())throw new AppException(503,"AUTH_ADMIN_NOT_CONFIGURED");
        client.delete().uri("/admin/users/"+id).header("apikey",serviceKey).header("Authorization","Bearer "+serviceKey).retrieve().toBodilessEntity();
    }
    public void recovery(String email) {
        recovery(email,null);
    }
    public void recovery(String email,String redirect) {
        configured();
        try{client.post().uri(builder->{builder.path("/recover");if(redirect!=null)builder.queryParam("redirect_to",redirect);return builder.build();}).header("apikey",key).body(Map.of("email",email)).retrieve().toBodilessEntity();}
        catch(RestClientResponseException ex){if(ex.getStatusCode().value()==429)throw new AppException(429,"AUTH_RATE_LIMITED");throw new AppException(503,"AUTH_RECOVERY_UNAVAILABLE");}
        catch(org.springframework.web.client.ResourceAccessException ex){throw new AppException(503,"AUTH_PROVIDER_UNAVAILABLE");}
    }
}
