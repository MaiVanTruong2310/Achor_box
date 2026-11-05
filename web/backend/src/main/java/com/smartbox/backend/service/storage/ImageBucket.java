package com.smartbox.backend.service.storage;

public enum ImageBucket {
    AVATARS("avatars"),
    PRODUCTS("brand"),
    WARRANTY_CLAIMS("warranty_nghiemthu"),
    DELIVERY_PROOFS("warranty_nghiemthu");

    private final String id;

    ImageBucket(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }
}
