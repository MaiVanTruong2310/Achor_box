package com.smartbox.backend;

import com.smartbox.backend.dto.request.*;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class CustomerAccountIntegrationTests extends CommerceIntegrationTests {
    @Autowired CustomerAccountService accounts;
    @Autowired CustomerOrderService customerOrders;
    CustomerRequests.Address address(String recipient,boolean def){return new CustomerRequests.Address("Nhà",recipient,"0912345678","Địa chỉ giao và lắp đặt", "Gọi trước khi đến",def);}
    @Test void addressOwnershipDefaultsAndDeletionAreScoped(){
        var first=accounts.saveAddress(null,address("Người nhận",false));var second=accounts.saveAddress(null,address("Người nhận 2",true));
        assertEquals(1,accounts.addresses().stream().filter(a->Boolean.TRUE.equals(a.get("isDefault"))).count());
        actors.actor.set(new com.smartbox.backend.security.CurrentActor.Actor(STAFF,"customer"));
        assertEquals(0,accounts.addresses().size());
        assertThrows(ResourceNotFoundException.class,()->accounts.saveAddress(uuid(first.get("id")),address("Tấn công",true)));
        assertThrows(ResourceNotFoundException.class,()->accounts.deleteAddress(uuid(first.get("id"))));
        actors.customer();accounts.deleteAddress(uuid(second.get("id")));assertEquals(first.get("id"),accounts.addresses().getFirst().get("id"));assertEquals(true,accounts.addresses().getFirst().get("isDefault"));
    }
    @Test void savedAddressAndProfileEditsCannotChangeOrderSnapshot(){
        var saved=accounts.saveAddress(null,address("Người nhận ban đầu",true));UUID addressId=uuid(saved.get("id"));
        var order=orders.create(new CommerceRequests.CreateOrder(null,List.of(new CommerceRequests.Item(variant,1)),addressId,null));UUID id=uuid(order.get("id"));
        accounts.saveAddress(addressId,new CustomerRequests.Address("Nơi khác","Người mới","0999999999","Địa chỉ khác",null,true));
        payments.checkout(id,"snapshot-checkout");
        accounts.updateProfile(new CustomerRequests.ProfileUpdate("Hồ sơ mới","0988888888"));accounts.deleteAddress(addressId);
        var view=customerOrders.detail(id);var snapshot=(Map<?,?>)view.get("shippingAddressSnapshot");
        assertEquals("Người nhận ban đầu",snapshot.get("recipientName"));assertEquals("0912345678",snapshot.get("phone"));assertEquals("Địa chỉ giao và lắp đặt",snapshot.get("addressLine"));
        assertEquals("Địa chỉ giao và lắp đặt",view.get("shippingAddress"));assertNull(view.get("deliveryInstallation"));
        assertEquals(addressId,jdbc.queryForObject("SELECT source_address_id FROM public.orders WHERE id=?",UUID.class,id));
        assertThrows(ConflictException.class,()->payments.checkout(id,"different-key"));
        assertEquals(id.toString(),((Map<?,?>)((List<?>)customerOrders.list(0,20).get("content")).getFirst()).get("id").toString());
    }
    @Test void foreignAddressAndOrderRejectWithoutReservingStock(){
        var saved=accounts.saveAddress(null,address("Chủ địa chỉ",true));UUID id=order(1);int before=stock();
        actors.actor.set(new com.smartbox.backend.security.CurrentActor.Actor(STAFF,"customer"));
        assertThrows(ResourceNotFoundException.class,()->orders.create(new CommerceRequests.CreateOrder(null,List.of(new CommerceRequests.Item(variant,1)),uuid(saved.get("id")),null)));
        assertEquals(before,stock());assertThrows(ForbiddenException.class,()->customerOrders.detail(id));assertEquals(0L,customerOrders.list(0,20).get("totalElements"));
        actors.staff();assertThrows(ForbiddenException.class,()->accounts.profile());assertThrows(ForbiddenException.class,()->customerOrders.list(0,20));
    }
    @Test void explicitAddressSnapshotAndMissingSourceValidation(){
        var created=orders.create(new CommerceRequests.CreateOrder(null,List.of(new CommerceRequests.Item(variant,1)),null,address("Người khác",false)));
        assertEquals("Người khác",((Map<?,?>)created.get("shippingAddressSnapshot")).get("recipientName"));
        int before=stock();assertThrows(BadRequestException.class,()->orders.create(new CommerceRequests.CreateOrder(null,List.of(new CommerceRequests.Item(variant,1)))));assertEquals(before,stock());
        assertThrows(BadRequestException.class,()->orders.create(new CommerceRequests.CreateOrder("Trùng",List.of(new CommerceRequests.Item(variant,1)),null,address("Trùng",false))));
    }
    @Test void addressLimitAndInvalidPagination(){
        for(int i=0;i<20;i++)accounts.saveAddress(null,address("Người nhận "+i,false));
        assertThrows(ConflictException.class,()->accounts.saveAddress(null,address("21",false)));assertEquals(20,accounts.addresses().size());
        assertThrows(BadRequestException.class,()->customerOrders.list(-1,20));assertThrows(BadRequestException.class,()->customerOrders.list(0,101));
    }
    @Test void existingDraftSnapshotsAtCheckoutWithoutRewritingHistoricalOrders(){
        UUID id=order(1);jdbc.update("UPDATE public.orders SET shipping_address_snapshot=NULL WHERE id=?",id);
        accounts.updateProfile(new CustomerRequests.ProfileUpdate("Liên hệ lúc checkout","0911111111"));payments.checkout(id,"pre-migration-draft");
        accounts.updateProfile(new CustomerRequests.ProfileUpdate("Liên hệ thay đổi","0922222222"));
        var snapshot=(Map<?,?>)customerOrders.detail(id).get("shippingAddressSnapshot");assertEquals("Liên hệ lúc checkout",snapshot.get("recipientName"));assertEquals("0911111111",snapshot.get("phone"));
    }
    static UUID uuid(Object id){return UUID.fromString(id.toString());}
}
