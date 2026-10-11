package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Product e where e.id = :id")
    java.util.Optional<Product> findLockedById(@org.springframework.data.repository.query.Param("id") UUID id);

    List<Product> findAllByOrderByCreatedAtDesc();
    Optional<Product> findBySku(String sku);
}

