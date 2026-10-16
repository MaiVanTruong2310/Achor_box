package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Product e where e.id = :id")
    Optional<Product> findLockedById(@Param("id") UUID id);

    List<Product> findAllByOrderByCreatedAtDesc();

    List<Product> findByCategoryIdOrderByCreatedAtDesc(UUID categoryId);

    Page<Product> findByCategoryId(UUID categoryId, Pageable pageable);

    Optional<Product> findBySku(String sku);
}
