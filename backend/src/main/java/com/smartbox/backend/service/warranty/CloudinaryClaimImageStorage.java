package com.smartbox.backend.service.warranty;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Upload from the server; credentials and arbitrary remote URLs never reach the browser. */
@Service
public class CloudinaryClaimImageStorage implements ClaimImageStorage {

    @Value("${smartbox.cloudinary.cloud-name:}")
    private String cloud;

    @Value("${smartbox.cloudinary.api-key:}")
    private String key;

    @Value("${smartbox.cloudinary.api-secret:}")
    private String secret;

    private final RestClient client;

    public CloudinaryClaimImageStorage() {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(30));
        client = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public StoredImage upload(MultipartFile file) {
        if (cloud.isBlank() || key.isBlank() || secret.isBlank()) {
            throw new AppException(503, "CLOUDINARY_NOT_CONFIGURED");
        }
        if (!cloud.matches("[a-zA-Z0-9_-]+")) {
            throw new AppException(503, "CLOUDINARY_NOT_CONFIGURED");
        }
        byte[] bytes = validated(file);
        var form = new LinkedMultiValueMap<String, Object>();
        form.add("file", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return "claim-image";
            }
        });
        form.add("public_id", "smartbox/warranty-claims/" + UUID.randomUUID());
        form.add("overwrite", "false");
        try {
            Map<?, ?> response = client.post().uri("https://api.cloudinary.com/v1_1/" + cloud + "/image/upload")
                    .headers(headers -> headers.setBasicAuth(key, secret))
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (response == null || !(response.get("public_id") instanceof String id) || !(response.get("secure_url") instanceof String url)
                    || !id.startsWith("smartbox/warranty-claims/") || !url.startsWith("https://res.cloudinary.com/" + cloud + "/image/upload/")) {
                throw new IllegalStateException();
            }
            return new StoredImage(id, url);
        } catch (Exception ex) {
            // Provider errors can contain sensitive request details; return a fixed message.
            throw new AppException(502, "CLOUDINARY_UPLOAD_FAILED");
        }
    }

    public static byte[] validated(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("IMAGE_MAX_5_MB");
        }
        try {
            byte[] bytes = file.getBytes();
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) {
                    throw new BadRequestException("IMAGE_JPEG_OR_PNG_REQUIRED");
                }
                var reader = readers.next();
                try {
                    reader.setInput(input, true, true);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!Set.of("jpeg", "png").contains(format)) {
                        throw new BadRequestException("IMAGE_JPEG_OR_PNG_REQUIRED");
                    }
                    if ((long) reader.getWidth(0) * reader.getHeight(0) > 12000000) {
                        throw new BadRequestException("IMAGE_DIMENSIONS_TOO_LARGE");
                    }
                    var decoded = reader.read(0);
                    var output = new ByteArrayOutputStream();
                    ImageIO.write(decoded, format, output);
                    byte[] sanitized = output.toByteArray();
                    if (sanitized.length > 5 * 1024 * 1024) {
                        throw new BadRequestException("IMAGE_MAX_5_MB");
                    }
                    return sanitized;
                } finally {
                    reader.dispose();
                }
            }
        } catch (BadRequestException ex) {
            throw ex;
        } catch (IOException | RuntimeException ex) {
            throw new BadRequestException("INVALID_IMAGE");
        }
    }
}
