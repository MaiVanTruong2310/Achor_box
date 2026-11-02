package com.smartbox.backend.service.storage;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.UUID;
import java.util.regex.Pattern;

/** Server-side uploads to Supabase Storage with the service key; the key never reaches a browser. */
@Service
public class SupabaseImageStorage implements ImageStorage {

    private static final Pattern PUBLIC_ID = Pattern.compile("(avatars|product-images|warranty-claims|delivery-proofs)/[0-9a-fA-F-]{36}(/avatar)?\\.(jpg|png)");
    private static final Pattern OBJECT_NAME = Pattern.compile("[0-9a-fA-F-]{36}\\.(jpg|png)");

    private final String baseUrl;
    private final String serviceKey;
    private final RestClient client;

    public SupabaseImageStorage(
            @Value("${smartbox.supabase.url:}") String url,
            @Value("${smartbox.supabase.service-role-key:}") String serviceKey) {
        this.baseUrl = url == null ? "" : url.replaceAll("/+$", "");
        this.serviceKey = serviceKey == null ? "" : serviceKey.trim();
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.client = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public StoredImage upload(ImageBucket bucket, MultipartFile file) {
        if (bucket == ImageBucket.AVATARS) {
            throw new IllegalArgumentException("Use uploadAvatar for avatars");
        }
        var image = ImageSanitizer.sanitize(file);
        return put(bucket, UUID.randomUUID() + "." + image.extension(), image, false);
    }

    @Override
    public StoredImage uploadAvatar(UUID owner, MultipartFile file) {
        var image = ImageSanitizer.sanitize(file);
        var stored = put(ImageBucket.AVATARS, owner + "/avatar." + image.extension(), image, true);
        String stale = "png".equals(image.extension()) ? "jpg" : "png";
        try {
            delete(ImageBucket.AVATARS.id() + "/" + owner + "/avatar." + stale);
        } catch (AppException ignored) {
            // The other extension usually does not exist; a stale copy is harmless.
        }
        return new StoredImage(stored.publicId(), stored.secureUrl() + "?v=" + System.currentTimeMillis());
    }

    @Override
    public void delete(String publicId) {
        requireConfigured();
        if (publicId == null || !PUBLIC_ID.matcher(publicId).matches()) {
            throw new BadRequestException("INVALID_IMAGE_ID");
        }
        try {
            client.delete().uri(baseUrl + "/storage/v1/object/" + publicId)
                    .header("apikey", serviceKey)
                    .header("Authorization", "Bearer " + serviceKey)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404 || ex.getStatusCode().value() == 400) {
                return;
            }
            throw new AppException(502, "STORAGE_DELETE_FAILED");
        } catch (Exception ex) {
            throw new AppException(502, "STORAGE_DELETE_FAILED");
        }
    }

    private StoredImage put(ImageBucket bucket, String path, ImageSanitizer.SanitizedImage image, boolean upsert) {
        requireConfigured();
        String publicId = bucket.id() + "/" + path;
        try {
            client.post().uri(baseUrl + "/storage/v1/object/" + publicId)
                    .header("apikey", serviceKey)
                    .header("Authorization", "Bearer " + serviceKey)
                    .header("x-upsert", String.valueOf(upsert))
                    .header("cache-control", upsert ? "max-age=60" : "max-age=31536000")
                    .contentType(MediaType.parseMediaType(image.contentType()))
                    .body(image.bytes())
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            // Provider errors can echo request details; return a fixed message.
            throw new AppException(502, "STORAGE_UPLOAD_FAILED");
        }
        return new StoredImage(publicId, publicUrl(publicId));
    }

    private String publicUrl(String publicId) {
        return baseUrl + "/storage/v1/object/public/" + publicId;
    }

    @Override
    public String publicUrl(ImageBucket bucket, String objectName) {
        return publicUrl(bucket.id() + "/" + objectName);
    }

    @Override
    public boolean owns(ImageBucket bucket, String url) {
        String prefix = publicUrl(bucket.id() + "/");
        return url != null && !baseUrl.isBlank() && url.startsWith(prefix)
                && OBJECT_NAME.matcher(url.substring(prefix.length())).matches();
    }

    private void requireConfigured() {
        if (serviceKey.isBlank() || !baseUrl.matches("https?://[^\\s/]+")) {
            throw new AppException(503, "STORAGE_NOT_CONFIGURED");
        }
    }
}
