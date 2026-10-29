package com.smartbox.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class CustomerDirectoryHttpTests extends BackendApplicationTests {
    @Override protected ResponseEntity<Map> call(String path,HttpMethod method,String token,Object body,String key,String version){
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);if(token!=null)headers.setBearerAuth(token);if(key!=null)headers.set("Idempotency-Key",key);if(version!=null)headers.set("If-Match",version);
        return http.exchange(java.net.URI.create(http.getRootUri()+path),method,new HttpEntity<>(body,headers),Map.class);
    }
    void admin(){when(identity.identity("crm-admin")).thenReturn(profile("super_admin"));}
    Map<String,Object> body(String name,String email,boolean login){var body=new HashMap<String,Object>();body.put("fullName",name);body.put("email",email);body.put("phone","0900000001");body.put("address","Địa chỉ kiểm thử");body.put("notes","CRM test");body.put("createLogin",login);return body;}
    void externalAuthUser(UUID id) throws Exception {try(var connection=jdbc.getDataSource().getConnection();var insert=connection.prepareStatement("INSERT INTO auth.users(id) VALUES(?)")){connection.setAutoCommit(true);insert.setObject(1,id);insert.executeUpdate();}}
    @Test void contactOnlyCreatesNoLoginAndSupportsSearchArchiveAndIdempotency(){
        admin();String email="contact-"+UUID.randomUUID()+"@smartbox.test";var request=body("Khách độc lập",email,false);String key=UUID.randomUUID().toString();
        var created=call("/api/admin/customers",HttpMethod.POST,"crm-admin",request,key,null);assertEquals(201,created.getStatusCode().value());UUID id=UUID.fromString(created.getBody().get("id").toString());
        assertNull(created.getBody().get("profileId"));assertFalse(created.getBody().containsKey("password"));assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.profiles WHERE email=?",Integer.class,email));verify(identity,never()).createCustomer(eq(email),anyString(),anyString());
        assertEquals(id.toString(),call("/api/admin/customers",HttpMethod.POST,"crm-admin",request,key,null).getBody().get("id"));
        var changed=new HashMap<>(request);changed.put("fullName","Khác");assertEquals(409,call("/api/admin/customers",HttpMethod.POST,"crm-admin",changed,key,null).getStatusCode().value());
        String filter="/api/admin/customers?search="+email+"&account=without";assertEquals(1,((List<?>)call(filter,HttpMethod.GET,"crm-admin",null,null,null).getBody().get("content")).size());
        var update=new HashMap<>(request);update.put("archived",true);assertEquals(200,call("/api/admin/customers/"+id,HttpMethod.PUT,"crm-admin",update,null,null).getStatusCode().value());
        assertEquals(0,((List<?>)call(filter,HttpMethod.GET,"crm-admin",null,null,null).getBody().get("content")).size());assertEquals(1,((List<?>)call(filter+"&state=archived",HttpMethod.GET,"crm-admin",null,null,null).getBody().get("content")).size());
        var invalid=body("Invalid","bad-email",false);assertEquals(400,call("/api/admin/customers",HttpMethod.POST,"crm-admin",invalid,UUID.randomUUID().toString(),null).getStatusCode().value());
        assertEquals(401,call("/api/admin/customers",HttpMethod.GET,null,null,null,null).getStatusCode().value());
        when(identity.identity("crm-tech")).thenReturn(profile("technician"));assertEquals(403,call("/api/admin/customers",HttpMethod.GET,"crm-tech",null,null,null).getStatusCode().value());
    }
    @Test void optionalLoginCreatesCustomerOnlyAndUsernameAuthenticates() throws Exception {
        admin();String username="crm"+UUID.randomUUID().toString().replace("-","").substring(0,12),email=username+"@smartbox.test";UUID user=UUID.randomUUID();String password="CustomerDemo8!";
        when(identity.createCustomer(eq(email),eq(password),anyString())).thenAnswer(invocation->{externalAuthUser(user);return user;});
        var request=body("Khách có tài khoản",email,true);request.put("username",username.toUpperCase(Locale.ROOT));request.put("password",password);request.put("role","super_admin");
        var response=call("/api/admin/customers",HttpMethod.POST,"crm-admin",request,UUID.randomUUID().toString(),null);assertEquals(201,response.getStatusCode().value(),Objects.toString(response.getBody()));
        UUID customer=UUID.fromString(response.getBody().get("id").toString());assertEquals(user.toString(),response.getBody().get("profileId"));assertEquals(username,response.getBody().get("username"));assertEquals("customer",jdbc.queryForObject("SELECT role::text FROM public.profiles WHERE id=?",String.class,user));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.customers WHERE profile_id=?",Integer.class,user));assertFalse(response.getBody().toString().contains(password));
        when(identity.password(email,password)).thenReturn(Map.of("user",Map.of("id",user.toString(),"email",email),"access_token","test-access","refresh_token","test-refresh","expires_in",3600));
        var login=call("/api/auth/login",HttpMethod.POST,null,Map.of("email",username.toUpperCase(Locale.ROOT),"password",password),null,null);assertEquals(200,login.getStatusCode().value());assertEquals("customer",login.getBody().get("role"));verify(identity).password(email,password);
        var duplicate=new HashMap<>(request);duplicate.put("email","other-"+email);assertEquals(409,call("/api/admin/customers",HttpMethod.POST,"crm-admin",duplicate,UUID.randomUUID().toString(),null).getStatusCode().value());
        duplicate.put("email",email);duplicate.put("username","other"+username);assertEquals(409,call("/api/admin/customers",HttpMethod.POST,"crm-admin",duplicate,UUID.randomUUID().toString(),null).getStatusCode().value());
        when(identity.identity("crm-po")).thenReturn(profile("product_manager"));assertEquals(403,call("/api/admin/customers",HttpMethod.POST,"crm-po",request,UUID.randomUUID().toString(),null).getStatusCode().value());
        var plain=body("PO tạo liên hệ","po-"+UUID.randomUUID()+"@smartbox.test",false);assertEquals(201,call("/api/admin/customers",HttpMethod.POST,"crm-po",plain,UUID.randomUUID().toString(),null).getStatusCode().value());
        assertEquals(403,call("/api/users/paged",HttpMethod.GET,"crm-po",null,null,null).getStatusCode().value());
        var edit=body("Đổi tên",email,false);edit.put("archived",false);assertEquals(200,call("/api/admin/customers/"+customer,HttpMethod.PUT,"crm-admin",edit,null,null).getStatusCode().value());assertEquals("Đổi tên",jdbc.queryForObject("SELECT full_name FROM public.profiles WHERE id=?",String.class,user));
        edit.put("email","unverified@smartbox.test");assertEquals(409,call("/api/admin/customers/"+customer,HttpMethod.PUT,"crm-admin",edit,null,null).getStatusCode().value());
        assertEquals(401,call("/api/auth/login",HttpMethod.POST,null,Map.of("email","unknown_crm_user","password",password),null,null).getStatusCode().value());
    }
    @Test void failedDatabaseProvisioningCompensatesOnlyNewAuthUser() throws Exception {
        admin();String username="race"+UUID.randomUUID().toString().replace("-","").substring(0,12),email=username+"@smartbox.test";UUID fresh=UUID.randomUUID(),competing=UUID.randomUUID();
        when(identity.createCustomer(eq(email),anyString(),anyString())).thenAnswer(invocation->{
            externalAuthUser(fresh);externalAuthUser(competing);
            try(var connection=jdbc.getDataSource().getConnection();var insert=connection.prepareStatement("INSERT INTO public.profiles(id,email,username,role) VALUES(?,?,?,CAST('customer' AS public.user_role))")){connection.setAutoCommit(true);insert.setObject(1,competing);insert.setString(2,"competing-"+email);insert.setString(3,username);insert.executeUpdate();}return fresh;
        });
        var request=body("Race test",email,true);request.put("username",username);request.put("password","CustomerDemo8!");String key=UUID.randomUUID().toString();
        assertEquals(409,call("/api/admin/customers",HttpMethod.POST,"crm-admin",request,key,null).getStatusCode().value());verify(identity).deleteProvisionedUser(fresh);verify(identity,never()).deleteProvisionedUser(competing);
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.customers WHERE creation_key=?",Integer.class,UUID.fromString(key)));assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.profiles WHERE id=?",Integer.class,competing));
    }
    @Test void retiredRolesCannotBeAssignedOrProvisioned(){
        admin();UUID target=profile("customer");
        for(String retired:List.of("support_agent","accountant")){
            assertEquals(400,call("/api/users/"+target+"/role",HttpMethod.PATCH,"crm-admin",Map.of("role",retired),null,null).getStatusCode().value());
            assertEquals(400,call("/api/users/staff",HttpMethod.POST,"crm-admin",Map.of("role",retired,"fullName","Retired role","email","retired@smartbox.test","initialPassword","StaffTestOnly123!"),null,null).getStatusCode().value());
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE public.profiles SET role=CAST(? AS public.user_role) WHERE id=?",retired,target));
        }
    }
}
