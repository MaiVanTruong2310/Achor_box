package com.smartbox.backend.repository;

import com.smartbox.backend.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {
    List<Device> findAllByOrderByCreatedAtDesc();
    List<Device> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    Optional<Device> findBySerialNumber(String serialNumber);
    long countByStatus(String status);
}
