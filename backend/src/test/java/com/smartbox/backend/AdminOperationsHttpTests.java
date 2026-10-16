package com.smartbox.backend;

import com.smartbox.backend.service.warranty.ClaimImageStorage;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminOperationsHttpTests extends BackendApplicationTests {
    @Override protected ResponseEntity<Map> call(String path,HttpMethod method,String token,Object body,String key,String version){
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);if(token!=null)headers.setBearerAuth(token);if(key!=null)headers.set("Idempotency-Key",key);if(version!=null)headers.set("If-Match",version);
        return http.exchange(java.net.URI.create(http.getRootUri()+path),method,new HttpEntity<>(body,headers),Map.class);
    }
    @MockitoBean ClaimImageStorage storage;
    UUID actor(String role,String token){var id=profile(role);when(identity.identity(token)).thenReturn(id);return id;}
    UUID warranty(UUID owner,boolean active){
        UUID device=UUID.randomUUID(),warranty=UUID.randomUUID();
        jdbc.update("INSERT INTO public.devices(id,owner_id,serial_number,mqtt_topic_id) VALUES(?,?,?,?)",device,owner,"CLAIM-"+device,"delivery_box/claim-"+device);
        jdbc.update("INSERT INTO public.warranties(id,device_id,start_date,end_date,status) VALUES(?,?,CURRENT_DATE-1,CURRENT_DATE+?,CAST('active' AS public.warranty_status))",warranty,device,active?30:-1);return warranty;
    }
    Map<String,Object> postClaim(UUID warranty,String token,String key,List<UUID> images,int status){
        var result=call("/api/customer/warranty-claims",HttpMethod.POST,token,Map.of("warrantyId",warranty,"description","Khóa điện tử không mở được.","imageIds",images),key,null);assertEquals(status,result.getStatusCode().value(),Objects.toString(result.getBody()));return result.getBody();
    }
    @Test void claimOwnershipExpiryIdempotencyAndPrivateNotes(){
        UUID owner=actor("customer","claim-customer"),other=actor("customer","claim-other");actor("super_admin","claim-admin");
        UUID warranty=warranty(owner,true),image=UUID.randomUUID();
        jdbc.update("INSERT INTO public.warranty_claim_images(id,owner_id,warranty_id,public_id,secure_url,created_at) VALUES(?,?,?,?,?,now())",image,owner,warranty,"test-"+image,"https://res.cloudinary.com/test/image/upload/claim.png");
        String key=UUID.randomUUID().toString();var claim=postClaim(warranty,"claim-customer",key,List.of(image),200);
        assertEquals(claim.get("id"),postClaim(warranty,"claim-customer",key,List.of(image),200).get("id"));
        postClaim(warranty,"claim-customer",key,List.of(),409);
        postClaim(warranty,"claim-other",UUID.randomUUID().toString(),List.of(),404);
        postClaim(warranty,"claim-customer",UUID.randomUUID().toString(),List.of(image),409);
        postClaim(warranty(owner,false),"claim-customer",UUID.randomUUID().toString(),List.of(),409);
        assertEquals(404,call("/api/customer/warranty-claims/"+claim.get("id"),HttpMethod.GET,"claim-other",null,null,null).getStatusCode().value());
        assertEquals(200,call("/api/warranties/claims/"+claim.get("id")+"/notes",HttpMethod.PATCH,"claim-admin",Map.of("notes","Ghi chú riêng hỗ trợ"),null,null).getStatusCode().value());
        var view=call("/api/customer/warranty-claims/"+claim.get("id"),HttpMethod.GET,"claim-customer",null,null,null).getBody();
        assertFalse(view.containsKey("internalNotes"));assertEquals(1,((List<?>)view.get("images")).size());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.warranty_claims WHERE customer_id=?",Integer.class,owner));
        var list=call("/api/customer/warranty-claims?page=0&size=1",HttpMethod.GET,"claim-customer",null,null,null);assertEquals(1,((Number)list.getBody().get("totalElements")).intValue());
        postClaim(warranty,"claim-admin",UUID.randomUUID().toString(),List.of(),403);
    }
    @Test void uploadOwnershipAndProviderFailureDoNotPersistFakeImages(){
        UUID owner=actor("customer","upload-owner");actor("customer","upload-other");UUID warranty=warranty(owner,true);
        when(storage.upload(any())).thenReturn(new ClaimImageStorage.StoredImage("uploaded-id","https://res.cloudinary.com/test/image/upload/image.png"));
        assertEquals(404,upload(warranty,"upload-other").getStatusCode().value());verify(storage,never()).upload(any());
        var result=upload(warranty,"upload-owner");assertEquals(200,result.getStatusCode().value());assertNotNull(result.getBody().get("id"));
        when(storage.upload(any())).thenThrow(new com.smartbox.backend.exception.AppException(502,"CLOUDINARY_UPLOAD_FAILED"));
        assertEquals(502,upload(warranty,"upload-owner").getStatusCode().value());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.warranty_claim_images WHERE warranty_id=?",Integer.class,warranty));
    }
    @Test void assignedTechnicianOnlyReadsAndChangesOwnClaims(){
        UUID owner=actor("customer","tech-claim-owner"),tech=actor("technician","claim-tech"),other=actor("technician","claim-tech-other");actor("product_manager","claim-support");
        var claim=postClaim(warranty(owner,true),"tech-claim-owner",UUID.randomUUID().toString(),List.of(),200);
        assertEquals(200,call("/api/warranties/claims/"+claim.get("id")+"/assign",HttpMethod.PATCH,"claim-support",Map.of("technicianId",tech),null,null).getStatusCode().value());
        var mine=call("/api/warranties/claims/paged",HttpMethod.GET,"claim-tech",null,null,null).getBody();assertEquals(1,((Number)mine.get("totalElements")).intValue());
        var theirs=call("/api/warranties/claims/paged",HttpMethod.GET,"claim-tech-other",null,null,null).getBody();assertEquals(0,((Number)theirs.get("totalElements")).intValue());
        assertEquals(403,call("/api/warranties/claims/"+claim.get("id")+"/status",HttpMethod.PATCH,"claim-tech-other",Map.of("status","resolved"),null,null).getStatusCode().value());
        assertEquals(200,call("/api/warranties/claims/"+claim.get("id")+"/status",HttpMethod.PATCH,"claim-tech",Map.of("status","resolved"),null,null).getStatusCode().value());
    }
    ResponseEntity<Map> upload(UUID warranty,String token){
        var form=new org.springframework.util.LinkedMultiValueMap<String,Object>();form.add("file",new org.springframework.core.io.ByteArrayResource(new byte[]{1,2,3}){@Override public String getFilename(){return "claim.png";}});
        var headers=new HttpHeaders();headers.setBearerAuth(token);headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return http.exchange("/api/customer/warranties/"+warranty+"/images",HttpMethod.POST,new HttpEntity<>(form,headers),Map.class);
    }
    @Test void settingsCrudIsRoleRestrictedAndProtectsUsedCategories(){
        actor("super_admin","settings-admin");actor("product_manager","settings-product");
        var payload=Map.of("name","Danh mục kiểm thử","slug","test-"+UUID.randomUUID());
        assertEquals(403,call("/api/settings/categories",HttpMethod.POST,"settings-product",payload,null,null).getStatusCode().value());
        var category=call("/api/settings/categories",HttpMethod.POST,"settings-admin",payload,null,null).getBody();String path="/api/settings/categories/"+category.get("id");
        assertEquals(200,call(path,HttpMethod.PUT,"settings-admin",Map.of("name","Đổi tên","slug",payload.get("slug")),null,null).getStatusCode().value());
        UUID product=UUID.randomUUID();jdbc.update("INSERT INTO public.products(id,category_id,sku,name,price) VALUES(?,?,?,?,0)",product,UUID.fromString(category.get("id").toString()),"S-"+product,"Kiểm thử");
        assertEquals(409,call(path,HttpMethod.DELETE,"settings-admin",null,null,null).getStatusCode().value());
        var free=call("/api/settings/categories",HttpMethod.POST,"settings-admin",Map.of("name","Xóa được","slug","free-"+UUID.randomUUID()),null,null).getBody();
        assertEquals(204,call("/api/settings/categories/"+free.get("id"),HttpMethod.DELETE,"settings-admin",null,null,null).getStatusCode().value());
        var shipping=call("/api/settings/shipping-methods",HttpMethod.POST,"settings-admin",Map.of("name","Giao và lắp nội bộ","fee",0,"isActive",true),null,null).getBody();
        assertEquals(400,call("/api/settings/shipping-methods/"+shipping.get("id"),HttpMethod.PUT,"settings-admin",Map.of("name","Lỗi phí","fee",-1,"isActive",true),null,null).getStatusCode().value());
        assertEquals(200,call("/api/settings/shipping-methods/"+shipping.get("id"),HttpMethod.PUT,"settings-admin",Map.of("name","Giao nội bộ đổi tên","fee",100,"isActive",true),null,null).getStatusCode().value());
        assertEquals(204,call("/api/settings/shipping-methods/"+shipping.get("id"),HttpMethod.DELETE,"settings-admin",null,null,null).getStatusCode().value());
        assertEquals(false,jdbc.queryForObject("SELECT is_active FROM public.shipping_methods WHERE id=?",Boolean.class,UUID.fromString(shipping.get("id").toString())));
        var payment=call("/api/settings/payment-methods",HttpMethod.POST,"settings-admin",Map.of("name","Giả lập kiểm thử","isActive",true),null,null).getBody();
        assertEquals(200,call("/api/settings/payment-methods/"+payment.get("id"),HttpMethod.PUT,"settings-admin",Map.of("name","Giả lập đổi tên","isActive",true),null,null).getStatusCode().value());
        assertEquals(204,call("/api/settings/payment-methods/"+payment.get("id"),HttpMethod.DELETE,"settings-admin",null,null,null).getStatusCode().value());
    }
    @Test void searchIsServerPagedEscapesWildcardsAndValidatesFilters(){
        actor("super_admin","search-admin");UUID a=actor("customer","search-customer");
        String unique="Search"+UUID.randomUUID();jdbc.update("UPDATE public.profiles SET full_name=?,email=?,phone=? WHERE id=?",unique+"%",unique+"@test.invalid","0987654321",a);
        for(String term:List.of(unique,unique+"@test.invalid","0987654321",unique+"%")){
            var result=call("/api/users/paged?page=0&size=1&role=customer&search="+java.net.URLEncoder.encode(term,java.nio.charset.StandardCharsets.UTF_8),HttpMethod.GET,"search-admin",null,null,null);
            assertEquals(200,result.getStatusCode().value(),Objects.toString(result.getBody()));assertEquals(1,((Number)result.getBody().get("totalElements")).intValue(),term+" "+result.getBody());
        }
        UUID order=UUID.randomUUID();jdbc.update("INSERT INTO public.orders(id,user_id,status,total) VALUES(?,?,CAST('pending' AS public.order_status),0)",order,a);
        var result=call("/api/orders/paged?search="+unique+"&status=pending&size=1",HttpMethod.GET,"search-admin",null,null,null);
        assertEquals(200,result.getStatusCode().value(),Objects.toString(result.getBody()));assertEquals(1,((Number)result.getBody().get("totalElements")).intValue());
        assertEquals(0,((Number)call("/api/orders/paged?search="+unique+"&status=completed",HttpMethod.GET,"search-admin",null,null,null).getBody().get("totalElements")).intValue());
        for(String path:List.of("/api/users/paged?page=-1","/api/users/paged?size=101","/api/users/paged?role=bad","/api/orders/paged?status=bad"))assertEquals(400,call(path,HttpMethod.GET,"search-admin",null,null,null).getStatusCode().value());
        assertEquals(403,call("/api/orders/paged",HttpMethod.GET,"search-customer",null,null,null).getStatusCode().value());
    }
    @Test void metadataCannotOverwriteReservedStockAndAdjustmentsAreJournaled(){
        UUID admin=actor("product_manager","stock-manager");UUID customer=actor("customer","stock-customer");
        String sku="STOCK-"+UUID.randomUUID();var payload=Map.of("name","Kho kiểm thử","sku",sku,"price",10000,"variants",List.of(Map.of("sku",sku+"-M","variantName","M","stockQuantity",10)));
        var created=call("/api/products",HttpMethod.POST,"stock-manager",payload,null,null);assertEquals(200,created.getStatusCode().value(),Objects.toString(created.getBody()));UUID product=UUID.fromString(created.getBody().get("id").toString());
        var variant=(Map<?,?>)((List<?>)created.getBody().get("variants")).getFirst();UUID vid=UUID.fromString(variant.get("id").toString());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.inventory_movements WHERE variant_id=? AND reason='INITIAL_STOCK'",Integer.class,vid));
        var draft=call("/api/orders",HttpMethod.POST,"stock-customer",Map.of("shippingAddress","Địa chỉ thử nghiệm","items",List.of(Map.of("variantId",vid,"quantity",2))),null,null);assertEquals(201,draft.getStatusCode().value(),Objects.toString(draft.getBody()));
        assertEquals(409,call("/api/products/"+product,HttpMethod.PUT,"stock-manager",Map.of("variants",List.of(Map.of("id",vid,"sku",sku+"-M","variantName","M","stockQuantity",10))),null,null).getStatusCode().value());
        assertEquals(8,jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?",Integer.class,vid));
        String path="/api/products/"+product+"/variants/"+vid+"/stock";
        assertEquals(200,call(path,HttpMethod.PATCH,"stock-manager",Map.of("delta",3),null,null).getStatusCode().value());
        assertEquals(409,call(path,HttpMethod.PATCH,"stock-manager",Map.of("delta",-12),null,null).getStatusCode().value());
        assertEquals(403,call(path,HttpMethod.PATCH,"stock-customer",Map.of("delta",1),null,null).getStatusCode().value());
        assertEquals(200,call("/api/orders/"+draft.getBody().get("id")+"/cancel",HttpMethod.POST,"stock-customer",Map.of("reason","Hủy kiểm thử"),null,null).getStatusCode().value());
        assertEquals(13,jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?",Integer.class,vid));
        assertEquals(13,jdbc.queryForObject("SELECT sum(delta) FROM public.inventory_movements WHERE variant_id=?",Integer.class,vid));
        assertTrue(jdbc.queryForObject("SELECT count(*) FROM public.audit_logs WHERE actor_id=? AND action='STOCK_ADJUSTED'",Integer.class,admin)>0);
    }
}
