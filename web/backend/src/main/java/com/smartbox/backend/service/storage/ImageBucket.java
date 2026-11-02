package com.smartbox.backend.service.storage;

public enum ImageBucket {
    AVATARS("avatars"),
    PRODUCTS("product-images"),
    WARRANTY_CLAIMS("warranty-claims"),
    DELIVERY_PROOFS("delivery-proofs");

    private final String id;

    ImageBucket(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }
}
