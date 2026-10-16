package com.smartbox.backend.service.catalog;

import com.smartbox.backend.dto.request.catalog.ProductVariantRequest;
import com.smartbox.backend.dto.response.catalog.ProductVariantResponse;
import com.smartbox.backend.entity.ProductVariant;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.mapper.ProductVariantMapper;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.repository.ProductVariantRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.commerce.OrderWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VariantSpecificationService {

    private final ProductVariantRepository variants;
    private final CommerceRepository db;
    private final CurrentActor actors;

    public void applyTo(ProductVariant v, ProductVariantRequest r) {
        boolean previous = v.getHasWeightSensor() != null
                ? v.getHasWeightSensor()
                : Boolean.TRUE.equals(db.one("SELECT has_weight_sensor FROM public.products WHERE id=?", v.getProductId()).get("has_weight_sensor"));
        boolean next = r.getModelTier() != null
                ? "PRO".equals(r.getModelTier())
                : r.getHasWeightSensor() != null ? r.getHasWeightSensor() : previous;

        if (v.getId() != null && next != previous && !db.list("SELECT id FROM public.devices WHERE product_variant_id=?", v.getId()).isEmpty()) {
            throw new ConflictException("REGISTERED_VARIANT_CAPABILITY_IMMUTABLE");
        }
        VariantSpecifications.apply(v, r);
    }

    @Transactional
    public ProductVariantResponse update(UUID product, UUID id, ProductVariantRequest request) {
        actors.get().requireRoles("super_admin", "product_manager");
        ProductVariant v = variants.findLockedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Biến thể", "id", id));

        if (!product.equals(v.getProductId())) {
            throw new BadRequestException("VARIANT_PRODUCT_MISMATCH");
        }

        applyTo(v, request);
        v = variants.saveAndFlush(v);
        var price = OrderWorkflowService.money(db.one("SELECT price FROM public.products WHERE id=?", product).get("price"));
        db.audit(actors.get().id(), "VARIANT_SPECIFICATIONS_UPDATED", "product_variants", id, "Cập nhật thông số kỹ thuật");
        return ProductVariantMapper.toResponse(v, price);
    }
}
