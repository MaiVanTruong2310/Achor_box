package com.smartbox.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cms_reviews", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "customer_email", length = 150)
    private String customerEmail;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "rating", nullable = false)
    @Builder.Default
    private Integer rating = 5; // 1 - 5 sao

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "images", columnDefinition = "text")
    private String images; // Chuỗi URL ảnh phân cách bởi dấu phẩy

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "pending"; // "pending", "approved", "rejected"

    @Column(name = "reject_reason", columnDefinition = "text")
    private String rejectReason;

    @Column(name = "admin_reply", columnDefinition = "text")
    private String adminReply;

    @Column(name = "admin_replied_at")
    private OffsetDateTime adminRepliedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

