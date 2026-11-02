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
            WHERE
            (:status='' OR CAST(o.status AS text)=:status) AND
            (:search='' OR lower(CAST(o.id AS text)) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(o.tracking_number, '')) LIKE :pattern ESCAPE '\\'
            OR EXISTS(SELECT 1 FROM public.shipments s WHERE s.order_id=o.id AND lower(COALESCE(s.tracking_number,'')) LIKE :pattern ESCAPE '\\')) AND
            (:payment=''
             OR (:payment='success' AND (o.paid_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND pm.status='success')))
             OR (:payment='pending' AND o.paid_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND pm.status IN ('success','refunded','refund_required')))
             OR (:payment='refunded' AND EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND pm.status IN ('refunded','refund_required')))
             OR (:payment NOT IN ('success','pending','refunded') AND EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND
                 (CAST(pm.status AS text)=:payment OR pm.provider=:payment)))) AND
            (:isPo = false OR EXISTS (
                SELECT 1 FROM public.order_items oi 
                JOIN public.products pr ON pr.id = oi.product_id 
                LEFT JOIN public.product_categories c ON c.id = pr.category_id 
                WHERE oi.order_id = o.id AND (c.manager_id = :poId OR pr.manager_id = :poId)
            ))
            ORDER BY
              CASE WHEN :sort='total_asc' THEN o.total END ASC,
              CASE WHEN :sort='total_desc' THEN o.total END DESC,
              CASE WHEN :sort='customer_asc' THEN lower(COALESCE(p.full_name,'')) END ASC,
              CASE WHEN :sort='customer_desc' THEN lower(COALESCE(p.full_name,'')) END DESC,
              CASE WHEN :sort='status_asc' THEN CAST(o.status AS text) END ASC,
              CASE WHEN :sort='status_desc' THEN CAST(o.status AS text) END DESC,
              CASE WHEN :sort='created_at_asc' THEN o.created_at END ASC,
              o.created_at DESC, o.id DESC
            """,
        countQuery = """
            SELECT count(*) FROM public.orders o
            LEFT JOIN public.profiles p ON p.id=o.user_id
            WHERE
            (:status='' OR CAST(o.status AS text)=:status) AND
            (:search='' OR lower(CAST(o.id AS text)) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.full_name,'')) LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(p.email,'')) LIKE :pattern ESCAPE '\\' OR COALESCE(p.phone,'') LIKE :pattern ESCAPE '\\'
            OR lower(COALESCE(o.tracking_number, '')) LIKE :pattern ESCAPE '\\'
            OR EXISTS(SELECT 1 FROM public.shipments s WHERE s.order_id=o.id AND lower(COALESCE(s.tracking_number,'')) LIKE :pattern ESCAPE '\\')) AND
            (:payment=''
             OR (:payment='success' AND (o.paid_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND pm.status='success')))
             OR (:payment='pending' AND o.paid_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND pm.status IN ('success','refunded','refund_required')))
             OR (:payment='refunded' AND EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND pm.status IN ('refunded','refund_required')))
             OR (:payment NOT IN ('success','pending','refunded') AND EXISTS(SELECT 1 FROM public.payments pm WHERE pm.order_id=o.id AND
                 (CAST(pm.status AS text)=:payment OR pm.provider=:payment)))) AND
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
        @Param("sort") String sort,
        Pageable pageable
    );

    default Page<Order> search(String search, String pattern, String status, String payment, Pageable pageable) {
        return search(search, pattern, status, payment, false, null, "", pageable);
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

    /** total, completed, paidCount, paidRevenue, awaitingCount, awaitingRevenue across all orders. */
    @Query(value = """
        SELECT count(*),
               count(*) FILTER (WHERE CAST(o.status AS text) = 'completed'),
               count(*) FILTER (WHERE x.paid AND CAST(o.status AS text) <> 'cancelled'),
               COALESCE(sum(o.total) FILTER (WHERE x.paid AND CAST(o.status AS text) <> 'cancelled'), 0),
               count(*) FILTER (WHERE NOT x.paid AND CAST(o.status AS text) IN ('pending', 'awaiting_payment')),
               COALESCE(sum(o.total) FILTER (WHERE NOT x.paid AND CAST(o.status AS text) IN ('pending', 'awaiting_payment')), 0)
        FROM public.orders o
        CROSS JOIN LATERAL (SELECT (o.paid_at IS NOT NULL OR EXISTS (
            SELECT 1 FROM public.payments p WHERE p.order_id = o.id AND p.status = 'success')) AS paid) x
        """, nativeQuery = true)
    List<Object[]> summarize();

    /** Same figures limited to orders containing products a PO manages. */
    @Query(value = """
        SELECT count(*),
               count(*) FILTER (WHERE CAST(o.status AS text) = 'completed'),
               count(*) FILTER (WHERE x.paid AND CAST(o.status AS text) <> 'cancelled'),
               COALESCE(sum(o.total) FILTER (WHERE x.paid AND CAST(o.status AS text) <> 'cancelled'), 0),
               count(*) FILTER (WHERE NOT x.paid AND CAST(o.status AS text) IN ('pending', 'awaiting_payment')),
               COALESCE(sum(o.total) FILTER (WHERE NOT x.paid AND CAST(o.status AS text) IN ('pending', 'awaiting_payment')), 0)
        FROM public.orders o
        CROSS JOIN LATERAL (SELECT (o.paid_at IS NOT NULL OR EXISTS (
            SELECT 1 FROM public.payments p WHERE p.order_id = o.id AND p.status = 'success')) AS paid) x
        WHERE EXISTS (
            SELECT 1 FROM public.order_items oi
            JOIN public.products pr ON pr.id = oi.product_id
            LEFT JOIN public.product_categories c ON c.id = pr.category_id
            WHERE oi.order_id = o.id AND (c.manager_id = :poId OR pr.manager_id = :poId)
        )
        """, nativeQuery = true)
    List<Object[]> summarizeForPo(@Param("poId") UUID poId);
}
