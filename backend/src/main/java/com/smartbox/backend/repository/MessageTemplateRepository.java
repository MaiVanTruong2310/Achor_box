package com.smartbox.backend.repository;

import com.smartbox.backend.model.MessageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, UUID> {
    Optional<MessageTemplate> findByCode(String code);
}
