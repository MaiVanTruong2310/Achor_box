package com.smartbox.backend.repository;

import com.smartbox.backend.entity.FaqItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FaqRepository extends JpaRepository<FaqItem, UUID> {
    List<FaqItem> findAllByOrderByDisplayOrderAscCreatedAtDesc();
    List<FaqItem> findByCategoryOrderByDisplayOrderAsc(String category);
    List<FaqItem> findByIsPublishedTrueOrderByDisplayOrderAsc();
    long countByIsPublishedTrue();
}

