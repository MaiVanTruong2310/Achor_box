package com.smartbox.backend.repository;

import com.smartbox.backend.entity.WarrantyClaim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, UUID> {

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    List<WarrantyClaim> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    List<WarrantyClaim> findByAssignedToOrderByCreatedAtDesc(UUID assignedTo);

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    Page<WarrantyClaim> findByAssignedTo(UUID assignedTo, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    Page<WarrantyClaim> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    @Query("SELECT c FROM WarrantyClaim c JOIN c.warranty w WHERE w.deviceId IN :deviceIds ORDER BY c.createdAt DESC")
    List<WarrantyClaim> findByDeviceIds(@Param("deviceIds") Collection<UUID> deviceIds);

    long countByStatusIn(List<String> statuses);
}
