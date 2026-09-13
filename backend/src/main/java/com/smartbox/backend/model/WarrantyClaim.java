package com.smartbox.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "warranty_claims", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarrantyClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "warranty_id")
    private UUID warrantyId;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "images", columnDefinition = "jsonb")
    private String images;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "new";

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "internal_notes", columnDefinition = "text")
    private String internalNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", insertable = false, updatable = false)
    private Warranty warranty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to", insertable = false, updatable = false)
    private Profile assignee;
}
