package com.smartbox.backend;

import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.exception.ForbiddenException;
import com.smartbox.backend.security.CurrentActor.Actor;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class ApprovalTicketPermissionsTests extends CommerceIntegrationTests {
    @Test void productManagerCanReadAndApprovePaidTicketExactlyOnce() {
        UUID order = order(1);
        UUID ticket = ticket();
        actors.actor.set(new Actor(STAFF,"product_manager"));
        assertEquals(1,tickets.list(0,20).size());
        assertEquals("PENDING",tickets.detail(ticket).get("status"));
        assertEquals("APPROVED",tickets.act(ticket,"APPROVE",null).get("status"));
        assertEquals("awaiting_payment",jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?",String.class,order));
        assertThrows(ConflictException.class,()->tickets.act(ticket,"APPROVE",null));
        actors.customer();
        payments.callback(callback(order,"po-approve","SUCCESS"));
        assertEquals("confirmed",jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?",String.class,order));
        assertEquals(1,count("shipments"));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.ticket_history WHERE action='APPROVE'",Integer.class));
    }
    @Test void poCanReturnAndRejectWhileTechnicianCannotReview() {
        UUID order=order(1);UUID ticket=ticket();
        actors.actor.set(new Actor(STAFF,"technician"));
        assertThrows(ForbiddenException.class,()->tickets.list(0,20));assertThrows(ForbiddenException.class,()->tickets.detail(ticket));assertThrows(ForbiddenException.class,()->tickets.act(ticket,"APPROVE",null));
        actors.actor.set(new Actor(STAFF,"product_manager"));assertEquals("RETURNED",tickets.act(ticket,"RETURN","Cần bổ sung thông tin").get("status"));
        actors.actor.set(new Actor(CUSTOMER,"customer"));assertEquals("PENDING",tickets.act(ticket,"RESUBMIT","Đã bổ sung").get("status"));
        actors.actor.set(new Actor(STAFF,"product_manager"));assertEquals("REJECTED",tickets.act(ticket,"REJECT","Không đủ điều kiện").get("status"));
        assertEquals("cancelled",jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?",String.class,order));assertEquals(0,count("refunds"));assertEquals(0,count("shipments"));
    }
    @Test void superAdminCanReadAndApproveTicketAndActItem() {
        UUID order = order(1);
        UUID ticket = ticket();
        UUID orderItemId = jdbc.queryForObject("SELECT id FROM public.order_items WHERE order_id=?", UUID.class, order);

        // Technician and customer are forbidden
        actors.actor.set(new Actor(STAFF, "technician"));
        assertThrows(ForbiddenException.class, () -> tickets.list(0, 20));
        assertThrows(ForbiddenException.class, () -> tickets.detail(ticket));
        assertThrows(ForbiddenException.class, () -> tickets.act(ticket, "APPROVE", null));
        assertThrows(ForbiddenException.class, () -> tickets.actItem(ticket, orderItemId, "APPROVE", null));

        actors.customer();
        assertThrows(ForbiddenException.class, () -> tickets.list(0, 20));
        assertThrows(ForbiddenException.class, () -> tickets.act(ticket, "APPROVE", null));
        assertThrows(ForbiddenException.class, () -> tickets.actItem(ticket, orderItemId, "APPROVE", null));
        actors.actor.set(new Actor(UUID.randomUUID(), "customer"));
        assertThrows(ForbiddenException.class, () -> tickets.detail(ticket));

        // Super admin can read and act on whole ticket
        actors.actor.set(new Actor(STAFF, "super_admin"));
        assertEquals(1, tickets.list(0, 20).size());
        assertEquals("PENDING", tickets.detail(ticket).get("status"));
        assertEquals("APPROVED", tickets.act(ticket, "APPROVE", null).get("status"));
        assertEquals("awaiting_payment", jdbc.queryForObject("SELECT CAST(status AS varchar) FROM public.orders WHERE id=?", String.class, order));

        // Super admin can act on item for another order
        UUID order2 = order(1);
        UUID ticket2 = jdbc.queryForObject("SELECT id FROM public.approval_tickets WHERE order_id=?", UUID.class, order2);
        UUID orderItemId2 = jdbc.queryForObject("SELECT id FROM public.order_items WHERE order_id=?", UUID.class, order2);
        actors.actor.set(new Actor(STAFF, "super_admin"));
        assertEquals("APPROVED", tickets.actItem(ticket2, orderItemId2, "APPROVE", "Super Admin phê duyệt sản phẩm").get("status"));
    }
}

