package com.smartbox.backend.service.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.request.catalog.ProductVariantRequest;
import com.smartbox.backend.entity.ProductVariant;
import com.smartbox.backend.exception.BadRequestException;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class VariantSpecifications {

    private VariantSpecifications() {}

    private static final ObjectMapper JSON = new ObjectMapper();

    private static void positive(BigDecimal value) {
        if (value != null && (value.signum() <= 0 || value.compareTo(new BigDecimal("100000")) > 0)) {
            throw new BadRequestException("INVALID_PHYSICAL_SPECIFICATION");
        }
    }

    public static void apply(ProductVariant v, ProductVariantRequest r) {
        String size = r.getSize() != null ? r.getSize() : v.getSize();
        Integer capacity = r.getCapacityLiter() != null ? r.getCapacityLiter() : v.getCapacityLiter();
        if (size != null && !Set.of("S", "M", "L").contains(size)) {
            throw new BadRequestException("INVALID_VARIANT_SIZE");
        }
        if (capacity != null && (capacity <= 0 || capacity > 10000)) {
            throw new BadRequestException("INVALID_VARIANT_CAPACITY");
        }
        if (size != null && capacity != null && !capacity.equals(Map.of("S", 45, "M", 85, "L", 150).get(size))) {
            throw new BadRequestException("SIZE_CAPACITY_MISMATCH");
        }
        if (r.getSize() != null) {
            v.setSize(size);
        }
        if (r.getCapacityLiter() != null) {
            v.setCapacityLiter(capacity);
        }
        for (BigDecimal value : Arrays.asList(r.getWidthCm(), r.getHeightCm(), r.getDepthCm(), r.getWeightKg(), r.getMaxLoadKg())) {
            positive(value);
        }
        if (r.getWarrantyMonths() != null && (r.getWarrantyMonths() < 1 || r.getWarrantyMonths() > 120)) {
            throw new BadRequestException("INVALID_WARRANTY_MONTHS");
        }
        String tier = r.getModelTier() != null ? r.getModelTier() : v.getModelTier();
        if (tier != null && !Set.of("BASE", "PRO").contains(tier)) {
            throw new BadRequestException("INVALID_MODEL_TIER");
        }
        if (tier != null && r.getHasWeightSensor() != null && r.getHasWeightSensor() != tier.equals("PRO")) {
            throw new BadRequestException("MODEL_SENSOR_MISMATCH");
        }
        if (r.getModelTier() != null) {
            v.setModelTier(tier);
        }
        if (tier != null) {
            v.setHasWeightSensor(tier.equals("PRO"));
        } else if (r.getHasWeightSensor() != null) {
            v.setHasWeightSensor(r.getHasWeightSensor());
        }
        if (r.getWidthCm() != null) v.setWidthCm(r.getWidthCm());
        if (r.getHeightCm() != null) v.setHeightCm(r.getHeightCm());
        if (r.getDepthCm() != null) v.setDepthCm(r.getDepthCm());
        if (r.getWeightKg() != null) v.setWeightKg(r.getWeightKg());
        if (r.getMaxLoadKg() != null) v.setMaxLoadKg(r.getMaxLoadKg());
        if (r.getWarrantyMonths() != null) v.setWarrantyMonths(r.getWarrantyMonths());
        if (r.getImages() != null) {
            if (r.getImages().size() > 10 || r.getImages().stream().anyMatch(url -> url == null || url.length() > 2048 || !(url.startsWith("https://") || url.startsWith("http://") || (url.startsWith("/") && !url.startsWith("//"))))) {
                throw new BadRequestException("INVALID_VARIANT_IMAGES");
            }
            try {
                v.setVariantImages(JSON.writeValueAsString(r.getImages()));
            } catch (Exception ex) {
                throw new IllegalStateException(ex);
            }
        }
    }

    public static List<String> images(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return JSON.readValue(value, new TypeReference<List<String>>() {});
        } catch (Exception ex) {
            throw new IllegalStateException("INVALID_VARIANT_IMAGES", ex);
        }
    }
}
