package com.smartbox.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "devices", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "serial_number", nullable = false, unique = true)
    private String serialNumber;

    @Column(name = "name")
    private String name;

    @Column(name = "location_label")
    private String locationLabel;

    @org.hibernate.annotations.ColumnTransformer(write = "?::public.device_status")
    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "offline";

    @Column(name = "battery_level")
    private Integer batteryLevel;

    @Column(name = "firmware_version")
    private String firmwareVersion;

    @Column(name = "last_seen_at")
    private OffsetDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "door_status", nullable = false)
    @Builder.Default
    private String doorStatus = "closed";

    @Column(name = "lock_status", nullable = false)
    @Builder.Default
    private String lockStatus = "locked";

    @Column(name = "weight_kg", nullable = false)
    @Builder.Default
    private Double weightKg = 0.0;

    @Column(name = "package_detected", nullable = false)
    @Builder.Default
    private Boolean packageDetected = false;

    @Column(name = "scale_ready", nullable = false)
    @Builder.Default
    private Boolean scaleReady = false;

    @Column(name = "device_state", nullable = false)
    @Builder.Default
    private String deviceState = "starting";

    @Column(name = "mqtt_topic_id")
    private String mqttTopicId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private Profile owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;
}

