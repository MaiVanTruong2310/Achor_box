package com.smartbox.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "product_categories", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductCategory implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "slug", nullable = false, unique = true)
    private String slug;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "manager_id")
    private UUID managerId;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("managerName")
    private String managerName;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("managerEmail")
    private String managerEmail;

    @com.fasterxml.jackson.annotation.JsonProperty("manager_name")
    public String getManagerNameSnake() {
        return managerName;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("manager_email")
    public String getManagerEmailSnake() {
        return managerEmail;
    }
}
