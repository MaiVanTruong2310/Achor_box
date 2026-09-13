package com.smartbox.backend.repository;

import com.smartbox.backend.model.ShippingMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ShippingMethodRepository extends JpaRepository<ShippingMethod, UUID> {
}
