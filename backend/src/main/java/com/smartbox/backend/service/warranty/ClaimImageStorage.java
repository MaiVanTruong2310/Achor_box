package com.smartbox.backend.service.warranty;

import org.springframework.web.multipart.MultipartFile;
public interface ClaimImageStorage {
    record StoredImage(String publicId,String secureUrl) {}
    StoredImage upload(MultipartFile file);
}
