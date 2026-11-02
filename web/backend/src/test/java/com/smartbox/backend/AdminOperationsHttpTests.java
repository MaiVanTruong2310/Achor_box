package com.smartbox.backend;

import com.smartbox.backend.service.storage.ImageStorage;
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
    @MockitoBean ImageStorage storage;
    UUID actor(String role,String token){var id=profile(role);when(identity.identity(token)).thenReturn(id);return id;}
    UUID warranty(UUID owner,boolean active){
        UUID device=UUID.randomUUID(),warranty=UUID.randomUUID();
        jdbc.update("INSERT INTO public.devices(id,owner_id,serial_number,mqtt_topic_id) VALUES(?,?,?,?)",device,owner,"CLAIM-"+device,"delivery_box/claim-"+device);
        jdbc.update("INSERT INTO public.warranties(id,device_id,start_date,end_date,status) VALUES(?,?,CURRENT_DATE-1,CURRENT_DATE+?,CAST('active' AS public.warranty_status))",warranty,device,active?30:-1);return warranty;
    }
    Map<String,Object> postClaim(UUID warranty,String token,String key,List<UUID> images,int status){
        var result=call("/api/customer/warranty-claims",HttpMethod.POST,token,Map.of("warrantyId",warranty,"description","Khóa điện tử không mở được.","imageIds",images),key,null);assertEquals(status,result.getStatusCode().value(),Objects.toString(result.getBody()));return result.getBody();
    }
    @org.springframework.beans.factory.annotation.Autowired com.smartbox.backend.service.warranty.CustomerWarrantyClaimService claimService;
    String serialOf(UUID warranty){return jdbc.queryForObject("SELECT d.serial_number FROM public.devices d JOIN public.warranties w ON w.device_id=d.id WHERE w.id=?",String.class,warranty);}
    UUID image(UUID owner,UUID warranty,String age){UUID id=UUID.randomUUID();jdbc.update("INSERT INTO public.warranty_claim_images(id,owner_id,warranty_id,public_id,secure_url,created_at) VALUES(?,?,?,?,?,now()-CAST(? AS interval))",id,owner,warranty,"warranty-claims/"+UUID.randomUUID()+".png","https://project.test/storage/v1/object/public/warranty-claims/x.png",age);return id;}
    @Test void publicLookupShowsOnlyValidityAndIsRateLimited(){
        UUID owner=actor("customer","lookup-owner"),device=UUID.randomUUID(),warranty=UUID.randomUUID();
        String serial="DBX-"+device.toString().substring(0,12).toUpperCase();
        jdbc.update("INSERT INTO public.devices(id,owner_id,serial_number,mqtt_topic_id) VALUES(?,?,?,?)",device,owner,serial,"delivery_box/lookup-"+device);
        jdbc.update("INSERT INTO public.warranties(id,device_id,start_date,end_date,status) VALUES(?,?,CURRENT_DATE-1,CURRENT_DATE+30,CAST('active' AS public.warranty_status))",warranty,device);
        var found=call("/api/public/warranty-lookup?serial="+serial.toLowerCase(),HttpMethod.GET,null,null,null,null);
        assertEquals(200,found.getStatusCode().value(),Objects.toString(found.getBody()));
        assertEquals(Set.of("serialNumber","productName","valid","startDate","endDate","remainingDays"),found.getBody().keySet());
        assertEquals(true,found.getBody().get("valid"));
        assertEquals(404,call("/api/public/warranty-lookup?serial=DBX-UNKNOWN0000",HttpMethod.GET,null,null,null,null).getStatusCode().value());
        assertEquals(400,call("/api/public/warranty-lookup?serial=x'%20or%201=1",HttpMethod.GET,null,null,null,null).getStatusCode().value());
        assertEquals(401,call("/api/warranties/lookup?serial="+serial,HttpMethod.GET,null,null,null,null).getStatusCode().value());
        int status=200;for(int i=0;i<30 && status!=429;i++)status=call("/api/public/warranty-lookup?serial="+serial,HttpMethod.GET,null,null,null,null).getStatusCode().value();
        assertEquals(429,status);
    }
    @Test void customerCanFilterWarrantiesBySerial(){
        UUID owner=actor("customer","filter-owner");UUID first=warranty(owner,true);warranty(owner,true);
        var page=call("/api/customer/warranties?serial="+serialOf(first).toLowerCase(),HttpMethod.GET,"filter-owner",null,null,null).getBody();
        assertEquals(1,((Number)page.get("totalElements")).intValue());
        assertEquals(2,((Number)call("/api/customer/warranties",HttpMethod.GET,"filter-owner",null,null,null).getBody().get("totalElements")).intValue());
    }
    @Test void unattachedImagesCanBeDeletedAndAreSwept(){
        UUID owner=actor("customer","img-owner");actor("customer","img-other");UUID warranty=warranty(owner,true);
        UUID fresh=image(owner,warranty,"1 minute"),stale=image(owner,warranty,"25 hours"),kept=image(owner,warranty,"2 minutes");
        String path="/api/customer/warranties/"+warranty+"/images/"+fresh;
        assertEquals(404,call(path,HttpMethod.DELETE,"img-other",null,null,null).getStatusCode().value());
        assertEquals(200,call(path,HttpMethod.DELETE,"img-owner",null,null,null).getStatusCode().value());
        assertEquals(404,call(path,HttpMethod.DELETE,"img-owner",null,null,null).getStatusCode().value());
        verify(storage,times(1)).delete(startsWith("warranty-claims/"));
        postClaim(warranty,"img-owner",UUID.randomUUID().toString(),List.of(stale),404);
        postClaim(warranty,"img-owner",UUID.randomUUID().toString(),List.of(kept),200);
        assertEquals(404,call("/api/customer/warranties/"+warranty+"/images/"+kept,HttpMethod.DELETE,"img-owner",null,null,null).getStatusCode().value());
        claimService.sweepOrphanImages();
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.warranty_claim_images WHERE id=?",Integer.class,stale));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.warranty_claim_images WHERE id=?",Integer.class,kept));
        verify(storage,times(2)).delete(startsWith("warranty-claims/"));
    }
    @Test void claimOwnershipExpiryIdempotencyAndPrivateNotes(){
        UUID owner=actor("customer","claim-customer"),other=actor("customer","claim-other");actor("super_admin","claim-admin");
        UUID warranty=warranty(owner,true),image=UUID.randomUUID();
        jdbc.update("INSERT INTO public.warranty_claim_images(id,owner_id,warranty_id,public_id,secure_url,created_at) VALUES(?,?,?,?,?,now())",image,owner,warranty,"warranty-claims/"+image+".png","https://project.test/storage/v1/object/public/warranty-claims/"+image+".png");
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
        when(storage.upload(any(),any())).thenReturn(new ImageStorage.StoredImage("warranty-claims/"+UUID.randomUUID()+".png","https://project.test/storage/v1/object/public/warranty-claims/image.png"));
        assertEquals(404,upload(warranty,"upload-other").getStatusCode().value());verify(storage,never()).upload(any(),any());
        var result=upload(warranty,"upload-owner");assertEquals(200,result.getStatusCode().value());assertNotNull(result.getBody().get("id"));
        when(storage.upload(any(),any())).thenThrow(new com.smartbox.backend.exception.AppException(502,"STORAGE_UPLOAD_FAILED"));
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
    @Test void colorsAndPaidWarrantyPlansArePricedAndSnapshottedByServer(){
        actor("product_manager","plan-manager");actor("customer","plan-customer");
        String sku="PLAN-"+UUID.randomUUID();
        var variants=List.of(Map.of("sku",sku+"-GRAY","variantName","45 L Xám","stockQuantity",5,"warrantyMonths",12,"colorName","Xám than","colorHex","#4B4846"));
        var created=call("/api/products",HttpMethod.POST,"plan-manager",Map.of("name","Hộp kiểm thử gói","sku",sku,"price",2000000,"variants",variants),null,null);
        assertEquals(200,created.getStatusCode().value(),Objects.toString(created.getBody()));
        var variant=(Map<?,?>)((List<?>)created.getBody().get("variants")).getFirst();UUID vid=UUID.fromString(variant.get("id").toString());
        assertEquals("Xám than",variant.get("colorName"));assertEquals("#4B4846",variant.get("colorHex"));
        var badColor=List.of(Map.of("sku",sku+"-BAD","variantName","Sai màu","stockQuantity",1,"colorHex","red"));
        assertEquals(400,call("/api/products",HttpMethod.POST,"plan-manager",Map.of("name","Sai màu","sku",sku+"-X","price",1,"variants",badColor),null,null).getStatusCode().value());
        UUID plan=UUID.randomUUID(),retired=UUID.randomUUID();
        jdbc.update("INSERT INTO public.warranty_plans(id,code,name,extra_months,price,sort_order,is_active) VALUES(?,?,?,12,490000,1,true)",plan,"T-"+plan,"Gói bảo hành +12 tháng");
        jdbc.update("INSERT INTO public.warranty_plans(id,code,name,extra_months,price,sort_order,is_active) VALUES(?,?,?,6,290000,0,false)",retired,"T-"+retired,"Gói cũ");
        var listed=http.exchange(java.net.URI.create(http.getRootUri()+"/api/warranty-plans"),HttpMethod.GET,null,List.class);
        assertEquals(200,listed.getStatusCode().value());
        assertTrue(listed.getBody().stream().anyMatch(p->plan.toString().equals(((Map<?,?>)p).get("id"))));
        assertTrue(listed.getBody().stream().noneMatch(p->retired.toString().equals(((Map<?,?>)p).get("id"))));
        var pricing=call("/api/pricing/calculate",HttpMethod.POST,null,Map.of("items",List.of(Map.of("variantId",vid,"quantity",2,"warrantyPlanId",plan))),null,null);
        assertEquals(200,pricing.getStatusCode().value(),Objects.toString(pricing.getBody()));
        var detail=(Map<?,?>)((List<?>)pricing.getBody().get("itemDetails")).getFirst();
        assertEquals(0,new java.math.BigDecimal(detail.get("unitPrice").toString()).compareTo(new java.math.BigDecimal("2490000")));
        assertEquals(24,((Number)detail.get("warrantyMonths")).intValue());
        assertEquals(400,call("/api/pricing/calculate",HttpMethod.POST,null,Map.of("items",List.of(Map.of("variantId",vid,"quantity",1,"warrantyPlanId",retired))),null,null).getStatusCode().value());
        var conflict=List.of(Map.of("variantId",vid,"quantity",1,"warrantyPlanId",plan),Map.of("variantId",vid,"quantity",1));
        assertEquals(400,call("/api/orders",HttpMethod.POST,"plan-customer",Map.of("shippingAddress","Địa chỉ thử nghiệm","items",conflict),null,null).getStatusCode().value());
        assertEquals(5,jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?",Integer.class,vid));
        var order=call("/api/orders",HttpMethod.POST,"plan-customer",Map.of("shippingAddress","Địa chỉ thử nghiệm","items",List.of(Map.of("variantId",vid,"quantity",2,"warrantyPlanId",plan))),null,null);
        assertEquals(201,order.getStatusCode().value(),Objects.toString(order.getBody()));
        var item=jdbc.queryForMap("SELECT unit_price,warranty_months_snapshot,warranty_plan_id,warranty_plan_price,warranty_extra_months,variant_name_snapshot FROM public.order_items WHERE variant_id=?",vid);
        assertEquals(0,new java.math.BigDecimal(item.get("unit_price").toString()).compareTo(new java.math.BigDecimal("2490000")));
        assertEquals(24,((Number)item.get("warranty_months_snapshot")).intValue());
        assertEquals(plan,item.get("warranty_plan_id"));
        assertEquals(12,((Number)item.get("warranty_extra_months")).intValue());
        assertTrue(item.get("variant_name_snapshot").toString().endsWith("Gói bảo hành +12 tháng"));
        assertEquals(3,jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?",Integer.class,vid));
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
