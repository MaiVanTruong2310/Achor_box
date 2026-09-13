package com.smartbox.backend.repository;

import com.smartbox.backend.model.WarrantyClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, UUID> {
    List<WarrantyClaim> findAllByOrderByCreatedAtDesc();
    long countByStatusIn(List<String> statuses);
}
