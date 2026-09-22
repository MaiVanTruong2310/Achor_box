package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Banner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BannerRepository extends JpaRepository<Banner, UUID> {
    List<Banner> findAllByOrderByDisplayOrderAscCreatedAtDesc();
    List<Banner> findByPositionOrderByDisplayOrderAsc(String position);
    List<Banner> findByIsActiveTrueOrderByDisplayOrderAsc();
    long countByIsActiveTrue();
}

