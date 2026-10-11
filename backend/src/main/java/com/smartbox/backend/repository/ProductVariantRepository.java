package com.smartbox.backend.repository;

import com.smartbox.backend.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from ProductVariant e where e.id = :id")
    java.util.Optional<ProductVariant> findLockedById(@org.springframework.data.repository.query.Param("id") UUID id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from ProductVariant e where e.productId = :id order by e.id")
    List<ProductVariant> findAllLockedByProductId(@org.springframework.data.repository.query.Param("id") UUID id);

    List<ProductVariant> findByProductIdOrderByPriceDeltaAsc(UUID productId);
    Optional<ProductVariant> findBySku(String sku);
    void deleteByProductId(UUID productId);
}
