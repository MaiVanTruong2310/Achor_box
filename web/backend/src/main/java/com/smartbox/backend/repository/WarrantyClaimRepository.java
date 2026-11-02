package com.smartbox.backend.repository;

import com.smartbox.backend.entity.WarrantyClaim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, UUID> {

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    List<WarrantyClaim> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    List<WarrantyClaim> findByAssignedToOrderByCreatedAtDesc(UUID assignedTo);

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    Page<WarrantyClaim> findByAssignedTo(UUID assignedTo, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    Page<WarrantyClaim> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"warranty", "warranty.device", "assignee"})
    @Query("SELECT c FROM WarrantyClaim c JOIN c.warranty w WHERE w.deviceId IN :deviceIds ORDER BY c.createdAt DESC")
    List<WarrantyClaim> findByDeviceIds(@Param("deviceIds") Collection<UUID> deviceIds);

    long countByStatusIn(List<String> statuses);

    @Query(
        value = """
            SELECT c.* FROM public.warranty_claims c
            LEFT JOIN public.warranties w ON w.id = c.warranty_id
            LEFT JOIN public.devices d ON d.id = w.device_id
            LEFT JOIN public.profiles p ON p.id = c.customer_id
            LEFT JOIN public.order_items oi ON oi.id = w.order_item_id
            LEFT JOIN public.orders o ON o.id = oi.order_id
            LEFT JOIN public.profiles op ON op.id = o.user_id
            WHERE
            (:isTechnician = false OR c.assigned_to = :technicianId) AND
            (:status = '' OR CAST(c.status AS text) = :status) AND
            (:search = ''
             OR lower(CAST(c.id AS text)) LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(d.serial_number, '')) LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(d.name, '')) LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(p.full_name, '')) LIKE :pattern ESCAPE '\\'
             OR COALESCE(p.phone, '') LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(op.full_name, '')) LIKE :pattern ESCAPE '\\'
             OR COALESCE(op.phone, '') LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(c.description, '')) LIKE :pattern ESCAPE '\\')
            ORDER BY c.created_at DESC, c.id DESC
            """,
        countQuery = """
            SELECT count(*) FROM public.warranty_claims c
            LEFT JOIN public.warranties w ON w.id = c.warranty_id
            LEFT JOIN public.devices d ON d.id = w.device_id
            LEFT JOIN public.profiles p ON p.id = c.customer_id
            LEFT JOIN public.order_items oi ON oi.id = w.order_item_id
            LEFT JOIN public.orders o ON o.id = oi.order_id
            LEFT JOIN public.profiles op ON op.id = o.user_id
            WHERE
            (:isTechnician = false OR c.assigned_to = :technicianId) AND
            (:status = '' OR CAST(c.status AS text) = :status) AND
            (:search = ''
             OR lower(CAST(c.id AS text)) LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(d.serial_number, '')) LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(d.name, '')) LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(p.full_name, '')) LIKE :pattern ESCAPE '\\'
             OR COALESCE(p.phone, '') LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(op.full_name, '')) LIKE :pattern ESCAPE '\\'
             OR COALESCE(op.phone, '') LIKE :pattern ESCAPE '\\'
             OR lower(COALESCE(c.description, '')) LIKE :pattern ESCAPE '\\')
            """,
        nativeQuery = true
    )
    Page<WarrantyClaim> search(
        @Param("search") String search,
        @Param("pattern") String pattern,
        @Param("status") String status,
        @Param("isTechnician") boolean isTechnician,
        @Param("technicianId") UUID technicianId,
        Pageable pageable
    );

    @Query(value = "SELECT CAST(status AS text), count(*) FROM public.warranty_claims GROUP BY status", nativeQuery = true)
    List<Object[]> countGroupByStatus();

    @Query(value = "SELECT CAST(status AS text), count(*) FROM public.warranty_claims WHERE assigned_to = :technicianId GROUP BY status", nativeQuery = true)
    List<Object[]> countGroupByStatusForAssignee(@Param("technicianId") UUID technicianId);
}
