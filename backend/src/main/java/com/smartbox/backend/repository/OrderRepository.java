package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    @org.springframework.data.jpa.repository.Query(value="""
        SELECT o.* FROM public.orders o LEFT JOIN public.profiles p ON p.id=o.user_id WHERE
        (:status='' OR CAST(o.status AS text)=:status) AND
        (:search='' OR lower(CAST(o.id AS text)) LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(o.tracking_number,'')) LIKE :pattern ESCAPE '\\') AND
        (:payment='' OR EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND
        (CAST(pm.status AS text)=:payment OR pm.provider=:payment)))
        ORDER BY o.created_at DESC,o.id DESC
        """,countQuery="""
        SELECT count(*) FROM public.orders o LEFT JOIN public.profiles p ON p.id=o.user_id WHERE
        (:status='' OR CAST(o.status AS text)=:status) AND
        (:search='' OR lower(CAST(o.id AS text)) LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\'
        OR lower(COALESCE(o.tracking_number,'')) LIKE :pattern ESCAPE '\\') AND
        (:payment='' OR EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND
        (CAST(pm.status AS text)=:payment OR pm.provider=:payment)))
        """,nativeQuery=true)
    org.springframework.data.domain.Page<Order> search(@org.springframework.data.repository.query.Param("search") String search,
        @org.springframework.data.repository.query.Param("pattern") String pattern,@org.springframework.data.repository.query.Param("status") String status,
        @org.springframework.data.repository.query.Param("payment") String payment,org.springframework.data.domain.Pageable pageable);
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByStatus(String status);
}

