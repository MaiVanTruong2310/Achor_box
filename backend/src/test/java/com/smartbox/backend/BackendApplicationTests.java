package com.smartbox.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.BeforeAll;
import java.nio.charset.StandardCharsets;

@SpringBootTest(properties={"smartbox.jobs.enabled=false","smartbox.mqtt.enabled=false","smartbox.fcm.enabled=false","smartbox.payment.hmac-secret=test-http-only-secret-at-least-thirty-two-characters","smartbox.cors.origins=http://localhost:5174"},webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker=true)
class BackendApplicationTests {

    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("smartbox_startup_test").withUsername("startup_test").withPassword("test-only-not-a-real-credential")
        .withInitScript("full-schema.sql");

    @DynamicPropertySource static void database(DynamicPropertyRegistry props) {
        props.add("spring.datasource.url",POSTGRES::getJdbcUrl);props.add("spring.datasource.username",POSTGRES::getUsername);props.add("spring.datasource.password",POSTGRES::getPassword);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.core.env.Environment environment;
    @Autowired org.springframework.boot.test.web.client.TestRestTemplate http;
    @Autowired com.smartbox.backend.repository.ProfileRepository profiles;
    @Autowired com.smartbox.backend.repository.ProductRepository products;
    @org.springframework.test.context.bean.override.mockito.MockitoBean com.smartbox.backend.security.SupabaseAuthGateway identity;
    @Autowired com.smartbox.backend.service.PaymentService payments;

    @BeforeAll static void migrate(@Autowired JdbcTemplate jdbc) throws Exception {
        for(String migration:java.util.List.of("001_order_enum.sql","002_commerce.sql","003_iot.sql","004_delivery_installation.sql","005_installation_completion_guard.sql","006_customer_account.sql","007_tracking_warranty_variant_specs.sql","008_customer_warranty_claims.sql","009_vnpay_sandbox.sql","010_sales_invoices.sql"))
            jdbc.execute(new String(BackendApplicationTests.class.getResourceAsStream("/db/migration/"+migration).readAllBytes(),StandardCharsets.UTF_8));
    }

	@Test
    void contextLoads() throws Exception {
        org.junit.jupiter.api.Assertions.assertNotNull(jdbc.queryForObject("SELECT count(*) FROM public.email_outbox",Integer.class));
        org.junit.jupiter.api.Assertions.assertEquals(401,http.getForEntity("/api/orders",String.class).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(200,http.getForEntity("/api/products",String.class).getStatusCode().value());
        var id=java.util.UUID.randomUUID();jdbc.update("INSERT INTO auth.users(id) VALUES(?)",id);
        var profile=com.smartbox.backend.entity.Profile.builder().id(id).email("jpa@smartbox.test").fullName("Kiểm thử JPA").role("customer").build();
        profiles.saveAndFlush(profile);
        org.junit.jupiter.api.Assertions.assertEquals("customer",profiles.findById(id).orElseThrow().getRole());
        var product=products.saveAndFlush(com.smartbox.backend.entity.Product.builder().sku("JPA-TEST").name("SmartBox kiểm thử JPA").price(java.math.BigDecimal.valueOf(1000000)).images("[\"test.png\"]").build());
        org.junit.jupiter.api.Assertions.assertTrue(products.findById(product.getId()).orElseThrow().getImages().contains("test.png"));
        var spec=http.getForObject("/v3/api-docs",java.util.Map.class);
        var paths=(java.util.Map<?,?>)spec.get("paths");
        long operationCount=paths.values().stream().map(java.util.Map.class::cast).flatMap(p->p.keySet().stream()).filter(k->java.util.Set.of("get","post","put","patch","delete").contains(k)).count();
        org.junit.jupiter.api.Assertions.assertTrue(operationCount >= 128);
        long installationOperations=paths.entrySet().stream().filter(e->e.getKey().toString().startsWith("/api/delivery-installations") || e.getKey().toString().endsWith("/delivery-installation"))
            .map(e->(java.util.Map<?,?>)e.getValue()).flatMap(p->p.keySet().stream()).filter(k->java.util.Set.of("get","post","put","patch","delete").contains(k)).count();
        org.junit.jupiter.api.Assertions.assertEquals(17,installationOperations);
        org.junit.jupiter.api.Assertions.assertTrue(paths.containsKey("/api/delivery-installations/{id}/acceptance"));
        var output=java.nio.file.Path.of("build/audit/delivery-installation-openapi.json");java.nio.file.Files.createDirectories(output.getParent());
        java.nio.file.Files.writeString(output,new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(spec));
	}

    @Test void dashboardHttpUsesRolesDateValidationAndDemoGate(){
        var staff=profile("super_admin");var accountant=profile("accountant");var customer=profile("customer");
        org.mockito.Mockito.when(identity.identity("dashboard-staff")).thenReturn(staff);
        org.mockito.Mockito.when(identity.identity("dashboard-accountant")).thenReturn(accountant);
        org.mockito.Mockito.when(identity.identity("dashboard-customer")).thenReturn(customer);
        String path="/api/admin/dashboard?date=2026-10-07";
        org.junit.jupiter.api.Assertions.assertEquals(401,call(path,org.springframework.http.HttpMethod.GET,null,null,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(403,call(path,org.springframework.http.HttpMethod.GET,"dashboard-customer",null,null,null).getStatusCode().value());
        for(String token:java.util.List.of("dashboard-staff","dashboard-accountant")) {
            var result=call(path,org.springframework.http.HttpMethod.GET,token,null,null,null);
            org.junit.jupiter.api.Assertions.assertEquals(200,result.getStatusCode().value());
            org.junit.jupiter.api.Assertions.assertEquals("2026-10-07",result.getBody().get("date"));
            org.junit.jupiter.api.Assertions.assertEquals(false,result.getBody().get("partial"));
            org.junit.jupiter.api.Assertions.assertTrue(result.getBody().containsKey("top5Variants"));
            org.junit.jupiter.api.Assertions.assertTrue(result.getBody().containsKey("lowStockVariants"));
        }
        org.junit.jupiter.api.Assertions.assertEquals(environment.acceptsProfiles(org.springframework.core.env.Profiles.of("demo"))?200:400,call(path+"&mode=sequential",org.springframework.http.HttpMethod.GET,"dashboard-staff",null,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(400,call("/api/admin/dashboard?date=invalid",org.springframework.http.HttpMethod.GET,"dashboard-staff",null,null,null).getStatusCode().value());
    }

    @Test void deliveryHttpUsesDatabaseRolesScopesHeadersAndValidation(){
        java.util.UUID customer=profile("customer"),staff=profile("super_admin"),tech=profile("technician"),other=profile("technician");
        org.mockito.Mockito.when(identity.identity("customer-test")).thenReturn(customer);
        org.mockito.Mockito.when(identity.identity("staff-test")).thenReturn(staff);
        org.mockito.Mockito.when(identity.identity("tech-test")).thenReturn(tech);
        org.mockito.Mockito.when(identity.identity("other-test")).thenReturn(other);
        var product=products.saveAndFlush(com.smartbox.backend.entity.Product.builder().sku("HTTP-"+java.util.UUID.randomUUID()).name("Thiết bị kiểm thử HTTP").price(java.math.BigDecimal.valueOf(1000)).images("[]").isActive(true).build());
        var variant=java.util.UUID.randomUUID();jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,'Kiểm thử',?,0,2)",variant,product.getId(),"HTTP-V-"+variant);
        var created=call("/api/orders",org.springframework.http.HttpMethod.POST,"customer-test",java.util.Map.of("shippingAddress","Địa chỉ kiểm thử HTTP","items",java.util.List.of(java.util.Map.of("variantId",variant.toString(),"quantity",1))),null,null);
        org.junit.jupiter.api.Assertions.assertEquals(201,created.getStatusCode().value());var order=java.util.UUID.fromString(created.getBody().get("id").toString());
        var checkout=call("/api/orders/"+order+"/checkout",org.springframework.http.HttpMethod.POST,"customer-test",null,"checkout-http",null).getBody();
        var payment=java.util.UUID.fromString(checkout.get("paymentId").toString());var amount=new java.math.BigDecimal(checkout.get("amount").toString());
        var callback=java.util.Map.of("paymentId",payment.toString(),"orderId",order.toString(),"amount",amount,"result","SUCCESS","signature",payments.sign(payment,order,amount,"SUCCESS"));
        org.junit.jupiter.api.Assertions.assertEquals(200,call("/api/payments/callback",org.springframework.http.HttpMethod.POST,null,callback,null,null).getStatusCode().value());
        var ticket=jdbc.queryForObject("SELECT id FROM public.approval_tickets WHERE order_id=?",java.util.UUID.class,order);
        org.junit.jupiter.api.Assertions.assertEquals(200,call("/api/tickets/"+ticket+"/approve",org.springframework.http.HttpMethod.POST,"staff-test",null,null,null).getStatusCode().value());
        String assignment="/api/orders/"+order+"/delivery-installation";
        org.junit.jupiter.api.Assertions.assertEquals(400,call(assignment,org.springframework.http.HttpMethod.POST,"staff-test",java.util.Map.of("assignedTo",tech.toString()),java.util.UUID.randomUUID().toString(),null).getStatusCode().value());
        var job=call(assignment,org.springframework.http.HttpMethod.POST,"staff-test",java.util.Map.of("assignedTo",tech.toString(),"scheduledAt",java.time.OffsetDateTime.now().plusDays(1).toString()),java.util.UUID.randomUUID().toString(),null);
        org.junit.jupiter.api.Assertions.assertEquals(201,job.getStatusCode().value());String path="/api/delivery-installations/"+job.getBody().get("id");
        org.junit.jupiter.api.Assertions.assertEquals(403,call(path,org.springframework.http.HttpMethod.GET,"other-test",null,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(403,call("/api/delivery-installations",org.springframework.http.HttpMethod.GET,"tech-test",null,null,null).getStatusCode().value());
        var customerView=call(assignment,org.springframework.http.HttpMethod.GET,"customer-test",null,null,null).getBody();
        org.junit.jupiter.api.Assertions.assertFalse(customerView.containsKey("customer"));org.junit.jupiter.api.Assertions.assertFalse(customerView.containsKey("installationNote"));
        org.junit.jupiter.api.Assertions.assertEquals(400,call(path+"/start",org.springframework.http.HttpMethod.POST,"tech-test",null,java.util.UUID.randomUUID().toString(),null).getStatusCode().value());
        var started=call(path+"/start",org.springframework.http.HttpMethod.POST,"tech-test",null,java.util.UUID.randomUUID().toString(),"0");
        org.junit.jupiter.api.Assertions.assertEquals(200,started.getStatusCode().value());org.junit.jupiter.api.Assertions.assertEquals("IN_PROGRESS",started.getBody().get("status"));
        org.junit.jupiter.api.Assertions.assertEquals(409,call("/api/orders/"+order+"/shipment/deliver",org.springframework.http.HttpMethod.POST,"staff-test",null,null,null).getStatusCode().value());
        var headers=new org.springframework.http.HttpHeaders();headers.setOrigin("http://localhost:5174");headers.setAccessControlRequestMethod(org.springframework.http.HttpMethod.POST);headers.setAccessControlRequestHeaders(java.util.List.of("Authorization","If-Match","Idempotency-Key"));
        var preflight=http.exchange(path+"/start",org.springframework.http.HttpMethod.OPTIONS,new org.springframework.http.HttpEntity<>(headers),String.class);
        org.junit.jupiter.api.Assertions.assertEquals(200,preflight.getStatusCode().value());org.junit.jupiter.api.Assertions.assertTrue(preflight.getHeaders().getAccessControlAllowHeaders().stream().anyMatch(h->h.equalsIgnoreCase("If-Match")));
    }
    @Test void publicRegistrationProvisionsOnlyCustomerAfterVerifiedLogin(){
        var request=java.util.Map.of("email","new@smartbox.test","password","strong-pass-123","fullName","Khách mới","phone","0912345678","role","super_admin");
        org.junit.jupiter.api.Assertions.assertEquals(200,call("/api/auth/register",org.springframework.http.HttpMethod.POST,null,request,null,null).getStatusCode().value());
        org.mockito.Mockito.verify(identity).register("new@smartbox.test","strong-pass-123","Khách mới","0912345678","http://localhost:5174/login");
        org.junit.jupiter.api.Assertions.assertEquals(400,call("/api/auth/register",org.springframework.http.HttpMethod.POST,null,java.util.Map.of("email","bad","password","123","fullName",""),null,null).getStatusCode().value());
        var id=java.util.UUID.randomUUID();jdbc.update("INSERT INTO auth.users(id) VALUES(?)",id);
        org.mockito.Mockito.when(identity.password("new@smartbox.test","strong-pass-123")).thenReturn(java.util.Map.of("user",java.util.Map.of("id",id.toString(),"email","new@smartbox.test","user_metadata",java.util.Map.of("full_name","Khách mới","role","super_admin")),"access_token","new-access","refresh_token","new-refresh","expires_in",3600));
        var login=call("/api/auth/login",org.springframework.http.HttpMethod.POST,null,java.util.Map.of("email","new@smartbox.test","password","strong-pass-123"),null,null);
        org.junit.jupiter.api.Assertions.assertEquals(200,login.getStatusCode().value());org.junit.jupiter.api.Assertions.assertEquals("customer",login.getBody().get("role"));
        org.junit.jupiter.api.Assertions.assertEquals("customer",profiles.findById(id).orElseThrow().getRole());
    }
    @Test void customerProfileAddressHttpUsesOwnershipAndWhitelistedFields(){
        java.util.UUID owner=profile("customer"),other=profile("customer"),staff=profile("super_admin");
        org.mockito.Mockito.when(identity.identity("address-owner")).thenReturn(owner);org.mockito.Mockito.when(identity.identity("address-other")).thenReturn(other);org.mockito.Mockito.when(identity.identity("address-staff")).thenReturn(staff);
        String originalEmail=profiles.findById(owner).orElseThrow().getEmail();
        var updated=call("/api/customer/profile",org.springframework.http.HttpMethod.PUT,"address-owner",java.util.Map.of("fullName","Tên mới","phone","0912345678","role","super_admin","email","attacker@smartbox.test","isLocked",true),null,null);
        org.junit.jupiter.api.Assertions.assertEquals(200,updated.getStatusCode().value());org.junit.jupiter.api.Assertions.assertEquals(originalEmail,updated.getBody().get("email"));org.junit.jupiter.api.Assertions.assertFalse(updated.getBody().containsKey("role"));
        org.junit.jupiter.api.Assertions.assertEquals("customer",profiles.findById(owner).orElseThrow().getRole());org.junit.jupiter.api.Assertions.assertFalse(profiles.findById(owner).orElseThrow().getIsLocked());
        var body=java.util.Map.of("label","Nhà","recipientName","Người nhận","phone","0912345678","addressLine","Địa chỉ kiểm thử","isDefault",true);
        var created=call("/api/customer/addresses",org.springframework.http.HttpMethod.POST,"address-owner",body,null,null);
        org.junit.jupiter.api.Assertions.assertEquals(201,created.getStatusCode().value());String path="/api/customer/addresses/"+created.getBody().get("id");
        org.junit.jupiter.api.Assertions.assertEquals(404,call(path,org.springframework.http.HttpMethod.PUT,"address-other",body,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(404,call(path,org.springframework.http.HttpMethod.DELETE,"address-other",null,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(403,call("/api/customer/profile",org.springframework.http.HttpMethod.GET,"address-staff",null,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(401,call("/api/customer/profile",org.springframework.http.HttpMethod.GET,null,null,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(400,call("/api/customer/addresses",org.springframework.http.HttpMethod.POST,"address-owner",java.util.Map.of("label","Nhà","recipientName","","phone","x","addressLine",""),null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(204,call(path,org.springframework.http.HttpMethod.DELETE,"address-owner",null,null,null).getStatusCode().value());
    }
    @Test void passwordHttpRequiresReauthenticationOrVerifiedRecovery(){
        var owner=profile("customer");org.mockito.Mockito.when(identity.identity("password-owner")).thenReturn(owner);
        String email=profiles.findById(owner).orElseThrow().getEmail();
        org.mockito.Mockito.when(identity.password(email,"wrong-password")).thenThrow(new com.smartbox.backend.exception.UnauthorizedException("BAD_PASSWORD"));
        org.junit.jupiter.api.Assertions.assertEquals(401,call("/api/auth/change-password",org.springframework.http.HttpMethod.POST,"password-owner",java.util.Map.of("currentPassword","wrong-password","newPassword","new-password-123"),null,null).getStatusCode().value());
        org.mockito.Mockito.when(identity.password(email,"current-password")).thenReturn(java.util.Map.of("user",java.util.Map.of("id",owner.toString()),"access_token","reauthenticated-password-session"));
        org.junit.jupiter.api.Assertions.assertEquals(200,call("/api/auth/change-password",org.springframework.http.HttpMethod.POST,"password-owner",java.util.Map.of("currentPassword","current-password","newPassword","new-password-123"),null,null).getStatusCode().value());
        org.mockito.Mockito.verify(identity).updatePassword("reauthenticated-password-session","new-password-123");org.mockito.Mockito.verify(identity).logout("reauthenticated-password-session");
        org.junit.jupiter.api.Assertions.assertEquals(200,call("/api/auth/forgot-password",org.springframework.http.HttpMethod.POST,null,java.util.Map.of("email","unknown@smartbox.test"),null,null).getStatusCode().value());
        org.mockito.Mockito.verify(identity).recovery("unknown@smartbox.test","http://localhost:5174/reset-password");
        org.mockito.Mockito.when(identity.verifyRecovery("expired-hash")).thenThrow(new com.smartbox.backend.exception.UnauthorizedException("RECOVERY_LINK_INVALID_OR_EXPIRED"));
        org.junit.jupiter.api.Assertions.assertEquals(401,call("/api/auth/reset-password",org.springframework.http.HttpMethod.POST,null,java.util.Map.of("tokenHash","expired-hash","newPassword","new-password-123"),null,null).getStatusCode().value());
        org.mockito.Mockito.when(identity.verifyRecovery("valid-recovery-hash")).thenReturn(java.util.Map.of("access_token","verified-recovery-session"));
        org.junit.jupiter.api.Assertions.assertEquals(200,call("/api/auth/reset-password",org.springframework.http.HttpMethod.POST,null,java.util.Map.of("tokenHash","valid-recovery-hash","newPassword","reset-password-123"),null,null).getStatusCode().value());
        org.mockito.Mockito.verify(identity).updatePassword("verified-recovery-session","reset-password-123");
        org.junit.jupiter.api.Assertions.assertEquals(400,call("/api/auth/reset-password",org.springframework.http.HttpMethod.POST,null,java.util.Map.of("tokenHash","valid-recovery-hash","newPassword","123"),null,null).getStatusCode().value());
    }
    @Test void firstVerifiedBearerRequestProvisionsCustomerWithoutTrustingMetadataRole(){
        var id=java.util.UUID.randomUUID();jdbc.update("INSERT INTO auth.users(id) VALUES(?)",id);
        org.mockito.Mockito.when(identity.identity("first-access")).thenReturn(id);
        org.mockito.Mockito.when(identity.user("first-access")).thenReturn(java.util.Map.of("id",id.toString(),"email","first@smartbox.test","user_metadata",java.util.Map.of("full_name","Khách mới","role","super_admin")));
        org.junit.jupiter.api.Assertions.assertEquals(200,call("/api/customer/profile",org.springframework.http.HttpMethod.GET,"first-access",null,null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals("customer",profiles.findById(id).orElseThrow().getRole());
        org.junit.jupiter.api.Assertions.assertEquals(403,call("/api/users",org.springframework.http.HttpMethod.GET,"first-access",null,null,null).getStatusCode().value());
    }
    @Test void variantSpecificationsHttpRoundTripsValidatesAndProtectsRegisteredCapabilities(){
        var manager=profile("product_manager");org.mockito.Mockito.when(identity.identity("spec-manager")).thenReturn(manager);
        var product=products.saveAndFlush(com.smartbox.backend.entity.Product.builder().sku("SPECS-"+java.util.UUID.randomUUID()).name("Sản phẩm thông số").price(java.math.BigDecimal.valueOf(1000)).images("[]").isActive(true).build());
        var variant=java.util.UUID.randomUUID();jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,'M',?,0,2)",variant,product.getId(),"SPECS-V-"+variant);
        String path="/api/products/"+product.getId()+"/variants/"+variant+"/specifications";
        var body=java.util.Map.of("modelTier","PRO","widthCm",32.5,"heightCm",50,"depthCm",40,"capacityLiter",85,"size","M","warrantyMonths",24,"images",java.util.List.of("/products/pro.png"));
        var response=call(path,org.springframework.http.HttpMethod.PATCH,"spec-manager",body,null,null);org.junit.jupiter.api.Assertions.assertEquals(200,response.getStatusCode().value());org.junit.jupiter.api.Assertions.assertEquals(true,response.getBody().get("hasWeightSensor"));org.junit.jupiter.api.Assertions.assertEquals(24,response.getBody().get("warrantyMonths"));
        org.junit.jupiter.api.Assertions.assertEquals(400,call(path,org.springframework.http.HttpMethod.PATCH,"spec-manager",java.util.Map.of("widthCm",0),null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(400,call(path,org.springframework.http.HttpMethod.PATCH,"spec-manager",java.util.Map.of("images",java.util.List.of("javascript:bad")),null,null).getStatusCode().value());
        jdbc.update("INSERT INTO public.devices(id,product_id,product_variant_id,serial_number,mqtt_topic_id) VALUES(?,?,?,?,?)",java.util.UUID.randomUUID(),product.getId(),variant,"SPEC-SERIAL-"+variant,"delivery_box/spec-"+variant);
        org.junit.jupiter.api.Assertions.assertEquals(409,call(path,org.springframework.http.HttpMethod.PATCH,"spec-manager",java.util.Map.of("modelTier","BASE"),null,null).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(new java.math.BigDecimal("32.5"),jdbc.queryForObject("SELECT width_cm FROM public.product_variants WHERE id=?",java.math.BigDecimal.class,variant));
        var variants=http.getForEntity("/api/products/"+product.getId()+"/variants",java.util.List.class);org.junit.jupiter.api.Assertions.assertEquals(200,variants.getStatusCode().value());org.junit.jupiter.api.Assertions.assertEquals("PRO",((java.util.Map<?,?>)variants.getBody().getFirst()).get("modelTier"));
    }
    protected java.util.UUID profile(String role){
        var id=java.util.UUID.randomUUID();jdbc.update("INSERT INTO auth.users(id) VALUES(?)",id);
        profiles.saveAndFlush(com.smartbox.backend.entity.Profile.builder().id(id).email(id+"@smartbox.test").fullName("Người dùng kiểm thử HTTP").role(role).isLocked(false).build());return id;
    }
    protected org.springframework.http.ResponseEntity<java.util.Map> call(String path,org.springframework.http.HttpMethod method,String token,Object body,String key,String version){
        var headers=new org.springframework.http.HttpHeaders();headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        if(token!=null)headers.setBearerAuth(token);if(key!=null)headers.set("Idempotency-Key",key);if(version!=null)headers.set("If-Match",version);
        return http.exchange(path,method,new org.springframework.http.HttpEntity<>(body,headers),java.util.Map.class);
    }

}
