package com.smartbox.backend.service.storage;

import com.smartbox.backend.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;

/** Re-encodes uploads so only decoded pixels (no metadata or trailing payloads) reach storage. */
public final class ImageSanitizer {

    public static final long MAX_BYTES = 5L * 1024 * 1024;

    public record SanitizedImage(byte[] bytes, String format) {
        public String extension() {
            return "jpeg".equals(format) ? "jpg" : format;
        }

        public String contentType() {
            return "image/" + format;
        }
    }

    private ImageSanitizer() {
    }

    public static SanitizedImage sanitize(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) {
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
                    if ((long) reader.getWidth(0) * reader.getHeight(0) > 12_000_000) {
                        throw new BadRequestException("IMAGE_DIMENSIONS_TOO_LARGE");
                    }
                    var output = new ByteArrayOutputStream();
                    ImageIO.write(reader.read(0), format, output);
                    byte[] sanitized = output.toByteArray();
                    if (sanitized.length > MAX_BYTES) {
                        throw new BadRequestException("IMAGE_MAX_5_MB");
                    }
                    return new SanitizedImage(sanitized, format);
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
