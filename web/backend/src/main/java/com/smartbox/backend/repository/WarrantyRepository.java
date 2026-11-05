package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Warranty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarrantyRepository extends JpaRepository<Warranty, UUID> {
    List<Warranty> findAll();

    @Query("SELECT w FROM Warranty w LEFT JOIN FETCH w.orderItem WHERE w.deviceId = :deviceId")
    Optional<Warranty> findByDeviceId(@Param("deviceId") UUID deviceId);
}
