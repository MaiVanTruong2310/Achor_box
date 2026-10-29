package com.smartbox.backend.repository;

import com.smartbox.backend.entity.WarrantyClaim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, UUID> {

    List<WarrantyClaim> findAllByOrderByCreatedAtDesc();

    List<WarrantyClaim> findByAssignedToOrderByCreatedAtDesc(UUID assignedTo);

    Page<WarrantyClaim> findByAssignedTo(UUID assignedTo, Pageable pageable);

    long countByStatusIn(List<String> statuses);
}

