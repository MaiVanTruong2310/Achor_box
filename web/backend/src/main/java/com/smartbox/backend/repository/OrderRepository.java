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
            (CAST(pm.status AS text)=:payment OR pm.provider=:payment))) AND
            (:isPo = false OR EXISTS (
                SELECT 1 FROM public.order_items oi 
                JOIN public.products pr ON pr.id = oi.product_id 
                LEFT JOIN public.product_categories c ON c.id = pr.category_id 
                WHERE oi.order_id = o.id AND (c.manager_id = :poId OR pr.manager_id = :poId)
            ))
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
            (CAST(pm.status AS text)=:payment OR pm.provider=:payment))) AND
            (:isPo = false OR EXISTS (
                SELECT 1 FROM public.order_items oi 
                JOIN public.products pr ON pr.id = oi.product_id 
                LEFT JOIN public.product_categories c ON c.id = pr.category_id 
                WHERE oi.order_id = o.id AND (c.manager_id = :poId OR pr.manager_id = :poId)
            ))
            """,
        nativeQuery = true
    )
    Page<Order> search(
        @Param("search") String search,
        @Param("pattern") String pattern,
        @Param("status") String status,
        @Param("payment") String payment,
        @Param("isPo") boolean isPo,
        @Param("poId") UUID poId,
        Pageable pageable
    );

    default Page<Order> search(String search, String pattern, String status, String payment, Pageable pageable) {
        return search(search, pattern, status, payment, false, null, pageable);
    }

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"customer"})
    List<Order> findAllByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"customer"})
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByStatus(String status);

    @Query(value = "SELECT CAST(status AS text), count(*) FROM public.orders GROUP BY status", nativeQuery = true)
    List<Object[]> countGroupByStatus();

    @Query(value = """
        SELECT CAST(o.status AS text), count(*) 
        FROM public.orders o 
        WHERE EXISTS (
            SELECT 1 FROM public.order_items oi 
            JOIN public.products pr ON pr.id = oi.product_id 
            LEFT JOIN public.product_categories c ON c.id = pr.category_id 
            WHERE oi.order_id = o.id AND (c.manager_id = :poId OR pr.manager_id = :poId)
        ) 
        GROUP BY o.status
        """, nativeQuery = true)
    List<Object[]> countGroupByStatusForPo(@Param("poId") UUID poId);
}

