package com.smartbox.backend.service.admin;

import com.smartbox.backend.dto.request.admin.AdminSettingsRequests.Category;
import com.smartbox.backend.dto.request.admin.AdminSettingsRequests.Payment;
import com.smartbox.backend.dto.request.admin.AdminSettingsRequests.Shipping;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Quản lý danh mục cấu hình hệ thống (danh mục sản phẩm, phương thức thanh toán, giao vận).
 * Danh mục thanh toán chỉ mang tính chất cấu hình tham khảo; provider thanh toán thực tế do backend quyết định.
 */
@Service
@RequiredArgsConstructor
public class AdminSettingsService {

    private final CommerceRepository db;
    private final CurrentActor actors;

    private String table(String kind) {
        return switch (kind) {
            case "categories" -> "product_categories";
            case "payment-methods" -> "payment_methods";
            case "shipping-methods" -> "shipping_methods";
            default -> throw new BadRequestException("INVALID_SETTING_KIND");
        };
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String kind) {
        actors.get().requireRoles("super_admin", "product_manager");
        return db.list("SELECT * FROM public." + table(kind) + " ORDER BY name, id");
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "categories", allEntries = true),
            @CacheEvict(value = "system_settings", allEntries = true)
    })
    public Map<String, Object> category(UUID id, Category request) {
        var actor = actors.get();
        actor.requireRoles("super_admin", "product_manager");
        boolean create = (id == null);

        if (create) {
            id = UUID.randomUUID();
            db.update("INSERT INTO public.product_categories(id, name, slug, description) VALUES(?, ?, ?, ?)",
                    id, request.name().trim(), request.slug(), request.description());
        } else {
            db.one("SELECT id FROM public.product_categories WHERE id = ? FOR UPDATE", id);
            db.update("UPDATE public.product_categories SET name = ?, slug = ?, description = ? WHERE id = ?",
                    request.name().trim(), request.slug(), request.description(), id);
        }

        db.audit(actor.id(), create ? "SETTING_CREATED" : "SETTING_UPDATED", "product_categories", id, request.slug());
        return db.one("SELECT * FROM public.product_categories WHERE id = ?", id);
    }

    @Transactional
    @CacheEvict(value = "system_settings", allEntries = true)
    public Map<String, Object> payment(UUID id, Payment request) {
        var actor = actors.get();
        actor.requireRoles("super_admin");
        boolean create = (id == null);

        if (create) {
            id = UUID.randomUUID();
            db.update("INSERT INTO public.payment_methods(id, name, is_active) VALUES(?, ?, ?)",
                    id, request.name().trim(), request.isActive());
        } else {
            db.one("SELECT id FROM public.payment_methods WHERE id = ? FOR UPDATE", id);
            db.update("UPDATE public.payment_methods SET name = ?, is_active = ? WHERE id = ?",
                    request.name().trim(), request.isActive(), id);
        }

        db.audit(actor.id(), create ? "SETTING_CREATED" : "SETTING_UPDATED", "payment_methods", id, request.name().trim());
        return db.one("SELECT * FROM public.payment_methods WHERE id = ?", id);
    }

    @Transactional
    @CacheEvict(value = "system_settings", allEntries = true)
    public Map<String, Object> shipping(UUID id, Shipping request) {
        var actor = actors.get();
        actor.requireRoles("super_admin");
        boolean create = (id == null);

        if (create) {
            id = UUID.randomUUID();
            db.update("INSERT INTO public.shipping_methods(id, name, fee, is_active) VALUES(?, ?, ?, ?)",
                    id, request.name().trim(), request.fee(), request.isActive());
        } else {
            db.one("SELECT id FROM public.shipping_methods WHERE id = ? FOR UPDATE", id);
            db.update("UPDATE public.shipping_methods SET name = ?, fee = ?, is_active = ? WHERE id = ?",
                    request.name().trim(), request.fee(), request.isActive(), id);
        }

        db.audit(actor.id(), create ? "SETTING_CREATED" : "SETTING_UPDATED", "shipping_methods", id, "INTERNAL_DELIVERY_INSTALLATION");
        return db.one("SELECT * FROM public.shipping_methods WHERE id = ?", id);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "categories", allEntries = true),
            @CacheEvict(value = "system_settings", allEntries = true)
    })
    public void delete(String kind, UUID id) {
        var actor = actors.get();
        actor.requireRoles("super_admin");
        String table = table(kind);
        db.one("SELECT id FROM public." + table + " WHERE id = ? FOR UPDATE", id);

        if ("categories".equals(kind)) {
            if (!db.list("SELECT id FROM public.products WHERE category_id = ? UNION ALL SELECT id FROM public.warranty_policies WHERE category_id = ?", id, id).isEmpty()) {
                throw new ConflictException("CATEGORY_IN_USE");
            }
            db.update("DELETE FROM public.product_categories WHERE id = ?", id);
        } else {
            db.update("UPDATE public." + table + " SET is_active = false WHERE id = ?", id);
        }

        db.audit(actor.id(), "categories".equals(kind) ? "SETTING_DELETED" : "SETTING_DISABLED", table, id, kind);
    }
}
