package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    List<Profile> findAllByOrderByCreatedAtDesc();
    Optional<Profile> findFirstByEmailOrderByCreatedAtDesc(String email);
    List<Profile> findAllByEmail(String email);
    boolean existsByEmail(String email);
}

