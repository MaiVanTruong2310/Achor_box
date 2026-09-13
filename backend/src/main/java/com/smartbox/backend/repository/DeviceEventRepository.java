package com.smartbox.backend.repository;

import com.smartbox.backend.model.DeviceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeviceEventRepository extends JpaRepository<DeviceEvent, UUID> {
    List<DeviceEvent> findTop50ByOrderByCreatedAtDesc();
    List<DeviceEvent> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId);
}
