package com.smartbox.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "product_variants", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "variant_name", nullable = false)
    private String variantName;

    @Column(name = "sku", nullable = false, unique = true)
    private String sku;

    @Column(name = "price_delta", nullable = false)
    @Builder.Default
    private BigDecimal priceDelta = BigDecimal.ZERO;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "size")
    private String size;

    @Column(name = "capacity_liter")
    private Integer capacityLiter;

    @Column(name = "model_tier")
    private String modelTier;

    @Column(name = "width_cm")
    private BigDecimal widthCm;

    @Column(name = "height_cm")
    private BigDecimal heightCm;

    @Column(name = "depth_cm")
    private BigDecimal depthCm;

    @Column(name = "weight_kg")
    private BigDecimal weightKg;

    @Column(name = "max_load_kg")
    private BigDecimal maxLoadKg;

    @Column(name = "has_weight_sensor")
    private Boolean hasWeightSensor;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(name = "images")
    private String variantImages;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;
}
