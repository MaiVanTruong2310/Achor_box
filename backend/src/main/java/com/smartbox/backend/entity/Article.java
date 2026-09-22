package com.smartbox.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cms_articles", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "slug", nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "category", nullable = false, length = 50)
    @Builder.Default
    private String category = "guide"; // "product_intro", "guide", "tech_news", "promotion"

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    @Column(name = "content", columnDefinition = "text")
    private String content;

    @Column(name = "cover_image", columnDefinition = "text")
    private String coverImage;

    @Column(name = "author_name", length = 100)
    @Builder.Default
    private String authorName = "Ban Biên Tập SmartBox";

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "published"; // "published", "draft", "archived"

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "tags", columnDefinition = "text")
    private String tags; // Chuỗi phân cách bởi dấu phẩy hoặc JSON

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

