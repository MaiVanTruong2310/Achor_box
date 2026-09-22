package com.smartbox.backend.repository;

import com.smartbox.backend.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {
    List<ProductVariant> findByProductIdOrderByPriceDeltaAsc(UUID productId);
    Optional<ProductVariant> findBySku(String sku);
    void deleteByProductId(UUID productId);
}
