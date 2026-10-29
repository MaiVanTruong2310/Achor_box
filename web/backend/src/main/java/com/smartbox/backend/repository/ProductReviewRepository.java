package com.smartbox.backend.repository;

import com.smartbox.backend.entity.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, UUID> {
    List<ProductReview> findAllByOrderByCreatedAtDesc();
    List<ProductReview> findByStatusOrderByCreatedAtDesc(String status);
    List<ProductReview> findByProductIdOrderByCreatedAtDesc(UUID productId);
    long countByStatus(String status);
}

