package com.smartbox.backend.repository;

import com.smartbox.backend.model.Warranty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarrantyRepository extends JpaRepository<Warranty, UUID> {
    List<Warranty> findAll();
    Optional<Warranty> findByDeviceId(UUID deviceId);
}
