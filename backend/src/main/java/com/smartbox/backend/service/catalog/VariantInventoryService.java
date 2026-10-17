package com.smartbox.backend.service.catalog;

import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;

@Service
@RequiredArgsConstructor
public class VariantInventoryService {

    private final CommerceRepository db;
    private final CurrentActor actors;

    @Transactional
    public Map<String, Object> adjust(UUID product, UUID variant, Integer delta) {
        return adjust(product, variant, delta, "MANUAL_ADJUSTMENT");
    }

    @Transactional
    public Map<String, Object> adjust(UUID product, UUID variant, Integer delta, String reason) {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager");
        if (delta == null || delta == 0 || delta < -100000 || delta > 100000) {
            throw new BadRequestException("INVALID_STOCK_DELTA");
        }
        db.one("SELECT id FROM public.product_variants WHERE id=? AND product_id=? FOR UPDATE", variant, product);
        if (db.update("UPDATE public.product_variants SET stock_quantity=stock_quantity+? WHERE id=? AND CAST(stock_quantity AS bigint)+?>=0 AND CAST(stock_quantity AS bigint)+?<=2147483647", delta, variant, delta, delta) != 1) {
            throw new ConflictException("INSUFFICIENT_STOCK_OR_LIMIT");
        }
        String actualReason = (reason != null && !reason.isBlank()) ? reason.trim() : "MANUAL_ADJUSTMENT";
        db.update("INSERT INTO public.inventory_movements VALUES(?,?,NULL,?,?,?,?)", UUID.randomUUID(), variant, delta, actualReason, actor.id(), now());
        db.audit(actor.id(), "STOCK_ADJUSTED", "product_variants", variant, Integer.toString(delta) + " (" + actualReason + ")");
        return db.one("SELECT id,product_id,stock_quantity FROM public.product_variants WHERE id=?", variant);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> movements() {
        actors.get().requireRoles("super_admin", "product_manager");
        return db.list("""
            SELECT m.id, m.variant_id AS "variantId", v.product_id AS "productId", p.name AS "productName",
            v.sku, v.variant_name AS "variantName", m.delta, m.reason, m.created_at AS "createdAt",
            m.actor_id AS "actorId", a.full_name AS "actorName", a.email AS "actorEmail", a.role AS "actorRole",
            v.stock_quantity - SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC, m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "previousStock",
            v.stock_quantity - SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC, m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) + m.delta AS "newStock"
            FROM public.inventory_movements m
            JOIN public.product_variants v ON v.id = m.variant_id
            JOIN public.products p ON p.id = v.product_id
            LEFT JOIN public.profiles a ON a.id = m.actor_id
            ORDER BY m.created_at DESC, m.id DESC LIMIT 500
            """);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> movementsPaged(int page, int size) {
        actors.get().requireRoles("super_admin", "product_manager");
        int limit = Math.max(1, Math.min(size, 100));
        int offset = Math.max(0, page) * limit;

        Long total = ((Number) db.one("SELECT count(*) AS total FROM public.inventory_movements").get("total")).longValue();

        List<Map<String, Object>> content = db.list("""
            SELECT m.id, m.variant_id AS "variantId", v.product_id AS "productId", p.name AS "productName",
            v.sku, v.variant_name AS "variantName", m.delta, m.reason, m.created_at AS "createdAt",
            m.actor_id AS "actorId", a.full_name AS "actorName", a.email AS "actorEmail", a.role AS "actorRole",
            v.stock_quantity - SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC, m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "previousStock",
            v.stock_quantity - SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC, m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) + m.delta AS "newStock"
            FROM public.inventory_movements m
            JOIN public.product_variants v ON v.id = m.variant_id
            JOIN public.products p ON p.id = v.product_id
            LEFT JOIN public.profiles a ON a.id = m.actor_id
            ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?
            """, limit, offset);

        int totalPages = (int) Math.ceil((double) total / limit);
        return Map.of(
            "content", content,
            "totalElements", total,
            "totalPages", Math.max(1, totalPages),
            "pageNumber", page,
            "pageSize", limit
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> movementsByProduct(UUID productId) {
        actors.get().requireRoles("super_admin", "product_manager");
        return db.list("""
            SELECT m.id, m.variant_id AS "variantId", v.product_id AS "productId", p.name AS "productName",
            v.sku, v.variant_name AS "variantName", m.delta, m.reason, m.created_at AS "createdAt",
            m.actor_id AS "actorId", a.full_name AS "actorName", a.email AS "actorEmail", a.role AS "actorRole",
            v.stock_quantity - SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC, m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "previousStock",
            v.stock_quantity - SUM(m.delta) OVER(PARTITION BY m.variant_id ORDER BY m.created_at DESC, m.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) + m.delta AS "newStock"
            FROM public.inventory_movements m
            JOIN public.product_variants v ON v.id = m.variant_id
            JOIN public.products p ON p.id = v.product_id
            LEFT JOIN public.profiles a ON a.id = m.actor_id
            WHERE p.id = ?
            ORDER BY m.created_at DESC, m.id DESC LIMIT 500
            """, productId);
    }
}
