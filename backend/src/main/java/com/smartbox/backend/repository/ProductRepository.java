package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
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

    @EntityGraph(attributePaths = {"category"})
    List<Product> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"category"})
    List<Product> findByCategoryIdOrderByCreatedAtDesc(UUID categoryId);

    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByCategoryId(UUID categoryId, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"category"})
    Page<Product> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE (:categoryId IS NULL OR p.categoryId = :categoryId) " +
           "AND (:query IS NULL OR :query = '' " +
           "OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Product> searchProducts(@Param("categoryId") UUID categoryId, @Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Optional<Product> findBySku(String sku);
}
