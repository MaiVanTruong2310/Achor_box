package com.smartbox.backend.repository;

import com.smartbox.backend.entity.ProductVariant;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from ProductVariant e where e.id = :id")
    Optional<ProductVariant> findLockedById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from ProductVariant e where e.productId = :id order by e.id")
    List<ProductVariant> findAllLockedByProductId(@Param("id") UUID id);

    List<ProductVariant> findByProductIdOrderByPriceDeltaAsc(UUID productId);

    List<ProductVariant> findByProductIdInOrderByPriceDeltaAsc(java.util.Collection<UUID> productIds);

    Optional<ProductVariant> findBySku(String sku);

    void deleteByProductId(UUID productId);
}
