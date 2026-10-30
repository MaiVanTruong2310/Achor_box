package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {

    @EntityGraph(attributePaths = {"owner", "product"})
    List<Device> findAllByOrderByCreatedAtDesc();

    @Override
    @EntityGraph(attributePaths = {"owner", "product"})
    Page<Device> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"owner", "product"})
    List<Device> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    @EntityGraph(attributePaths = {"owner", "product"})
    Optional<Device> findBySerialNumber(String serialNumber);

    long countByStatus(String status);
}
