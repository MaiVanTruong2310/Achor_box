package com.smartbox.backend.service;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.now;

@Service
@RequiredArgsConstructor
public class VariantInventoryService {
    private final CommerceRepository db;
    private final CurrentActor actors;
    @Transactional
    public Map<String,Object> adjust(UUID product,UUID variant,Integer delta) {
        var actor=actors.get();actor.requireRoles("super_admin","product_manager");
        if(delta==null||delta==0||delta < -100000||delta>100000)throw new BadRequestException("INVALID_STOCK_DELTA");
        db.one("SELECT id FROM public.product_variants WHERE id=? AND product_id=? FOR UPDATE",variant,product);
        if(db.update("UPDATE public.product_variants SET stock_quantity=stock_quantity+? WHERE id=? AND CAST(stock_quantity AS bigint)+?>=0 AND CAST(stock_quantity AS bigint)+?<=2147483647",delta,variant,delta,delta)!=1)
            throw new ConflictException("INSUFFICIENT_STOCK_OR_LIMIT");
        db.update("INSERT INTO public.inventory_movements VALUES(?,?,NULL,?,?,?,?)",UUID.randomUUID(),variant,delta,"MANUAL_ADJUSTMENT",actor.id(),now());
        db.audit(actor.id(),"STOCK_ADJUSTED","product_variants",variant,Integer.toString(delta));
        return db.one("SELECT id,product_id,stock_quantity FROM public.product_variants WHERE id=?",variant);
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> movements() {
        actors.get().requireRoles("super_admin","product_manager","accountant");
        return db.list("""
            SELECT m.id,m.variant_id AS "variantId",v.product_id AS "productId",p.name AS "productName",v.sku,
            m.delta,m.reason,m.created_at AS "createdAt",a.full_name AS "actorName",
            v.stock_quantity-SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC,m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "previousStock",
            v.stock_quantity-SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC,m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)+m.delta AS "newStock"
            FROM public.inventory_movements m JOIN public.product_variants v ON v.id=m.variant_id
            JOIN public.products p ON p.id=v.product_id LEFT JOIN public.profiles a ON a.id=m.actor_id
            ORDER BY m.created_at DESC,m.id DESC LIMIT 500
            """);
    }
}

