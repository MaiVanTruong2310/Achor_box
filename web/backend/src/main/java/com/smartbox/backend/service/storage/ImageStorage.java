package com.smartbox.backend.service.storage;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ImageStorage {
    record StoredImage(String publicId, String secureUrl) {}

    StoredImage upload(ImageBucket bucket, MultipartFile file);

    StoredImage uploadAvatar(UUID owner, MultipartFile file);

    void delete(String publicId);

    String publicUrl(ImageBucket bucket, String objectName);

    boolean owns(ImageBucket bucket, String url);
}
