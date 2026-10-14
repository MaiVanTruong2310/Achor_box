package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    @org.springframework.data.jpa.repository.Query(value="""
        SELECT * FROM public.profiles p WHERE
        (:role='' OR CAST(p.role AS text)=:role) AND (:locked IS NULL OR p.is_locked=:locked) AND
        (:search='' OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\')
        ORDER BY p.created_at DESC,p.id DESC
        """, countQuery="""
        SELECT count(*) FROM public.profiles p WHERE
        (:role='' OR CAST(p.role AS text)=:role) AND (:locked IS NULL OR p.is_locked=:locked) AND
        (:search='' OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\')
        """,nativeQuery=true)
    org.springframework.data.domain.Page<Profile> search(@org.springframework.data.repository.query.Param("search") String search,
        @org.springframework.data.repository.query.Param("pattern") String pattern,@org.springframework.data.repository.query.Param("role") String role,
        @org.springframework.data.repository.query.Param("locked") Boolean locked,org.springframework.data.domain.Pageable pageable);
    List<Profile> findAllByOrderByCreatedAtDesc();
    Optional<Profile> findFirstByEmailOrderByCreatedAtDesc(String email);
    List<Profile> findAllByEmail(String email);
    boolean existsByEmail(String email);
}

