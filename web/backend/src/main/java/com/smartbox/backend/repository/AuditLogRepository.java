package com.smartbox.backend.repository;

import com.smartbox.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @EntityGraph(attributePaths = {"actor"})
    List<AuditLog> findTop50ByOrderByCreatedAtDesc();

    @Override
    @EntityGraph(attributePaths = {"actor"})
    Page<AuditLog> findAll(Pageable pageable);
}

