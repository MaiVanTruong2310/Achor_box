package com.smartbox.backend;

import com.smartbox.backend.dto.request.commerce.CommerceRequests;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.security.CurrentActor.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MultiPoApprovalWorkflowTests extends CommerceIntegrationTests {

    private final UUID po1 = UUID.randomUUID();
    private final UUID po2 = UUID.randomUUID();
    private UUID product1;
    private UUID variant1;
    private UUID product2;
    private UUID variant2;

    @BeforeEach
    void setupMultiPo() {
        jdbc.update("INSERT INTO public.profiles(id,email,full_name) VALUES(?,'po1@smartbox.test','Quản lý PO 1')", po1);
        jdbc.update("INSERT INTO public.profiles(id,email,full_name) VALUES(?,'po2@smartbox.test','Quản lý PO 2')", po2);

        product1 = UUID.randomUUID();
        variant1 = UUID.randomUUID();
        jdbc.update("INSERT INTO public.products(id,name,price,manager_id,is_active) VALUES(?,'Sản phẩm PO 1',1000000,?,true)", product1, po1);
        jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,'Model A','SKU-PO1',0,10)", variant1, product1);

        product2 = UUID.randomUUID();
        variant2 = UUID.randomUUID();
        jdbc.update("INSERT INTO public.products(id,name,price,manager_id,is_active) VALUES(?,'Sản phẩm PO 2',2000000,?,true)", product2, po2);
        jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,'Model B','SKU-PO2',0,10)", variant2, product2);
    }

    private UUID createMultiItemOrder() {
        actors.customer();
        var orderRes = orders.create(new CommerceRequests.CreateOrder("Địa chỉ khách hàng", List.of(
                new CommerceRequests.Item(variant1, 1),
                new CommerceRequests.Item(variant2, 2)
        )));
        return UUID.fromString(orderRes.get("id").toString());
    }

    @Test
    void bothPoApprove_orderBecomesAwaitingPayment_andPaymentSucceeds() {
        UUID orderId = createMultiItemOrder();
        assertEquals(9, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant1));
        assertEquals(8, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant2));

        // Checkout before PO approval is strictly blocked
        assertThrows(ConflictException.class, () -> payments.checkout(orderId, "key-before-approval"));

        UUID ticketId = jdbc.queryForObject("SELECT id FROM public.approval_tickets WHERE order_id=?", UUID.class, orderId);
        List<Map<String, Object>> itemApprovals = jdbc.queryForList("SELECT id, order_item_id, manager_id FROM public.order_item_approvals WHERE ticket_id=?", ticketId);
        assertEquals(2, itemApprovals.size());

        UUID item1 = itemApprovals.stream().filter(m -> po1.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();
        UUID item2 = itemApprovals.stream().filter(m -> po2.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();

        // PO 2 cannot approve item 1
        actors.actor.set(new Actor(po2, "product_manager"));
        assertThrows(ConflictException.class, () -> tickets.actItem(ticketId, item1, "APPROVE", null));

        // PO 1 approves item 1
        actors.actor.set(new Actor(po1, "product_manager"));
        tickets.actItem(ticketId, item1, "APPROVE", "PO 1 đồng ý sản phẩm 1");
        assertEquals("PENDING", jdbc.queryForObject("SELECT status FROM public.approval_tickets WHERE id=?", String.class, ticketId));
        assertEquals("pending", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));

        // PO 2 approves item 2 -> All approved -> Order moves to awaiting_payment
        actors.actor.set(new Actor(po2, "product_manager"));
        tickets.actItem(ticketId, item2, "APPROVE", "PO 2 đồng ý sản phẩm 2");
        assertEquals("APPROVED", jdbc.queryForObject("SELECT status FROM public.approval_tickets WHERE id=?", String.class, ticketId));
        assertEquals("awaiting_payment", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));

        // Customer checkouts and pays
        actors.customer();
        var checkout = payments.checkout(orderId, "multi-po-checkout");
        UUID paymentId = UUID.fromString(checkout.get("paymentId").toString());
        BigDecimal amount = new BigDecimal(checkout.get("amount").toString());
        var callback = new CommerceRequests.Callback(paymentId, orderId, amount, "SUCCESS", payments.sign(paymentId, orderId, amount, "SUCCESS"));
        payments.callback(callback);

        assertEquals("confirmed", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));
        assertEquals(1, count("shipments"));
    }

    @Test
    void onePoRejects_customerAcceptsRemainingItems_orderRecalculatedAndPaid() {
        UUID orderId = createMultiItemOrder();
        UUID ticketId = jdbc.queryForObject("SELECT id FROM public.approval_tickets WHERE order_id=?", UUID.class, orderId);
        List<Map<String, Object>> itemApprovals = jdbc.queryForList("SELECT id, order_item_id, manager_id FROM public.order_item_approvals WHERE ticket_id=?", ticketId);
        UUID item1 = itemApprovals.stream().filter(m -> po1.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();
        UUID item2 = itemApprovals.stream().filter(m -> po2.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();

        // PO 1 approves item 1
        actors.actor.set(new Actor(po1, "product_manager"));
        tickets.actItem(ticketId, item1, "APPROVE", "Đạt chuẩn");

        // PO 2 rejects item 2
        actors.actor.set(new Actor(po2, "product_manager"));
        tickets.actItem(ticketId, item2, "REJECT", "Tạm hết linh kiện lắp ráp");

        assertEquals("PARTIALLY_REJECTED", jdbc.queryForObject("SELECT status FROM public.approval_tickets WHERE id=?", String.class, ticketId));
        assertEquals("customer_decision_pending", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));

        // Customer cannot checkout while decision is pending
        actors.customer();
        assertThrows(ConflictException.class, () -> payments.checkout(orderId, "key-blocked"));

        // Customer accepts remaining items
        var decisionRes = tickets.customerDecision(orderId, true);
        assertEquals("awaiting_payment", decisionRes.get("status"));
        assertEquals("awaiting_payment", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));
        assertEquals("APPROVED", jdbc.queryForObject("SELECT status FROM public.approval_tickets WHERE id=?", String.class, ticketId));

        // Rejected item stock was released (+2 back to variant2)
        assertEquals(9, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant1));
        assertEquals(10, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant2));

        // Order total was recalculated from 5,000,000 down to 1,000,000
        BigDecimal total = jdbc.queryForObject("SELECT total FROM public.orders WHERE id=?", BigDecimal.class, orderId);
        assertEquals(0, new BigDecimal("1000000").compareTo(total));

        // Customer proceeds to checkout and payment
        var checkout = payments.checkout(orderId, "customer-decision-accept");
        UUID paymentId = UUID.fromString(checkout.get("paymentId").toString());
        BigDecimal amount = new BigDecimal(checkout.get("amount").toString());
        assertEquals(0, new BigDecimal("1000000").compareTo(amount));

        var callback = new CommerceRequests.Callback(paymentId, orderId, amount, "SUCCESS", payments.sign(paymentId, orderId, amount, "SUCCESS"));
        payments.callback(callback);
        assertEquals("confirmed", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));
    }

    @Test
    void onePoRejects_customerDeclines_orderCancelledAndAllStockReleased() {
        UUID orderId = createMultiItemOrder();
        UUID ticketId = jdbc.queryForObject("SELECT id FROM public.approval_tickets WHERE order_id=?", UUID.class, orderId);
        List<Map<String, Object>> itemApprovals = jdbc.queryForList("SELECT id, order_item_id, manager_id FROM public.order_item_approvals WHERE ticket_id=?", ticketId);
        UUID item1 = itemApprovals.stream().filter(m -> po1.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();
        UUID item2 = itemApprovals.stream().filter(m -> po2.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();

        actors.actor.set(new Actor(po1, "product_manager"));
        tickets.actItem(ticketId, item1, "APPROVE", "Đạt chuẩn");

        actors.actor.set(new Actor(po2, "product_manager"));
        tickets.actItem(ticketId, item2, "REJECT", "Hết hàng");

        // Customer declines to proceed with partial order
        actors.customer();
        var decisionRes = tickets.customerDecision(orderId, false);
        assertEquals("cancelled", decisionRes.get("status"));
        assertEquals("cancelled", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));
        assertEquals("CANCELLED", jdbc.queryForObject("SELECT status FROM public.approval_tickets WHERE id=?", String.class, ticketId));

        // ALL stock is fully released
        assertEquals(10, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant1));
        assertEquals(10, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant2));
    }

    @Test
    void bothPoReject_orderAutomaticallyCancelledWithoutCustomerPrompt() {
        UUID orderId = createMultiItemOrder();
        UUID ticketId = jdbc.queryForObject("SELECT id FROM public.approval_tickets WHERE order_id=?", UUID.class, orderId);
        List<Map<String, Object>> itemApprovals = jdbc.queryForList("SELECT id, order_item_id, manager_id FROM public.order_item_approvals WHERE ticket_id=?", ticketId);
        UUID item1 = itemApprovals.stream().filter(m -> po1.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();
        UUID item2 = itemApprovals.stream().filter(m -> po2.equals(m.get("manager_id"))).map(m -> (UUID) m.get("order_item_id")).findFirst().orElseThrow();

        actors.actor.set(new Actor(po1, "product_manager"));
        tickets.actItem(ticketId, item1, "REJECT", "Không giao khu vực này");

        actors.actor.set(new Actor(po2, "product_manager"));
        tickets.actItem(ticketId, item2, "REJECT", "Hết hàng toàn bộ");

        assertEquals("cancelled", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, orderId));
        assertEquals("REJECTED", jdbc.queryForObject("SELECT status FROM public.approval_tickets WHERE id=?", String.class, ticketId));
        assertEquals(10, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant1));
        assertEquals(10, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant2));
    }

    @Test
    void inventoryAdjustmentAuditLogStoresActorDetailsAndHistory() {
        actors.actor.set(new Actor(po1, "product_manager"));
        inventory.adjust(product1, variant1, 15, "Nhập kho đợt 2 từ nhà xưởng");

        assertEquals(25, jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?", Integer.class, variant1));

        var movements = inventory.movementsByProduct(product1);
        assertFalse(movements.isEmpty());

        var latest = movements.getFirst();
        assertEquals(variant1, latest.get("variantId"));
        assertEquals("SKU-PO1", latest.get("sku"));
        assertEquals(15, ((Number) latest.get("delta")).intValue());
        assertEquals(10, ((Number) latest.get("previousStock")).intValue());
        assertEquals(25, ((Number) latest.get("newStock")).intValue());
        assertEquals("Nhập kho đợt 2 từ nhà xưởng", latest.get("reason"));
        assertEquals(po1.toString(), latest.get("actorId").toString());
        assertEquals("Quản lý PO 1", latest.get("actorName"));
        assertEquals("po1@smartbox.test", latest.get("actorEmail"));
        assertNotNull(latest.get("createdAt"));
    }
}
