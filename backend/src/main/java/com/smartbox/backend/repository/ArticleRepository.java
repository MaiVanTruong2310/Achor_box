package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArticleRepository extends JpaRepository<Article, UUID> {
    List<Article> findAllByOrderByCreatedAtDesc();
    List<Article> findByCategoryOrderByCreatedAtDesc(String category);
    List<Article> findByStatusOrderByCreatedAtDesc(String status);
    Optional<Article> findBySlug(String slug);
    boolean existsBySlug(String slug);
    long countByStatus(String status);
}

