package com.smartbox.backend.repository;

import com.smartbox.backend.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    @Query(
        value = """
            SELECT o.* FROM public.orders o
            LEFT JOIN public.profiles p ON p.id=o.user_id
            LEFT JOIN public.shipments s ON s.order_id=o.id
            WHERE
            (:status='' OR CAST(o.status AS text)=:status) AND
            (:search='' OR lower(CAST(o.id AS text)) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(s.tracking_number, o.tracking_number, '')) LIKE :pattern ESCAPE '\\') AND
            (:payment='' OR EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND
            (CAST(pm.status AS text)=:payment OR pm.provider=:payment)))
            ORDER BY o.created_at DESC, o.id DESC
            """,
        countQuery = """
            SELECT count(*) FROM public.orders o
            LEFT JOIN public.profiles p ON p.id=o.user_id
            LEFT JOIN public.shipments s ON s.order_id=o.id
            WHERE
            (:status='' OR CAST(o.status AS text)=:status) AND
            (:search='' OR lower(CAST(o.id AS text)) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(s.tracking_number, o.tracking_number, '')) LIKE :pattern ESCAPE '\\') AND
            (:payment='' OR EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND
            (CAST(pm.status AS text)=:payment OR pm.provider=:payment)))
            """,
        nativeQuery = true
    )
    Page<Order> search(
        @Param("search") String search,
        @Param("pattern") String pattern,
        @Param("status") String status,
        @Param("payment") String payment,
        Pageable pageable
    );

    List<Order> findAllByOrderByCreatedAtDesc();

    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByStatus(String status);

    @Query(value = "SELECT CAST(status AS text), count(*) FROM public.orders GROUP BY status", nativeQuery = true)
    List<Object[]> countGroupByStatus();
}

