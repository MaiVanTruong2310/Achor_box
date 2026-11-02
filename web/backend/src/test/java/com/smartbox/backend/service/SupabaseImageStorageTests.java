package com.smartbox.backend.service;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.service.storage.ImageBucket;
import com.smartbox.backend.service.storage.ImageSanitizer;
import com.smartbox.backend.service.storage.SupabaseImageStorage;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.*;

class SupabaseImageStorageTests {

    record Call(String method, String path, String auth, String apikey, String upsert, String type, int bytes) {}

    HttpServer server;
    final List<Call> calls = new CopyOnWriteArrayList<>();
    int status = 200;
    String base;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            var h = exchange.getRequestHeaders();
            byte[] body = exchange.getRequestBody().readAllBytes();
            calls.add(new Call(exchange.getRequestMethod(), exchange.getRequestURI().getPath(), h.getFirst("Authorization"), h.getFirst("apikey"), h.getFirst("x-upsert"), h.getFirst("Content-Type"), body.length));
            byte[] reply = "{}".getBytes();
            exchange.sendResponseHeaders(status, reply.length);
            exchange.getResponseBody().write(reply);
            exchange.close();
        });
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    static byte[] png() throws Exception {
        var out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
        return out.toByteArray();
    }

    static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("file", "untrusted-name.exe", "application/octet-stream", bytes);
    }

    @Test
    void uploadsSanitizedImageToBucketWithServiceKey() throws Exception {
        var storage = new SupabaseImageStorage(base + "/", "sb_secret_test");
        var stored = storage.upload(ImageBucket.WARRANTY_CLAIMS, file(png()));
        assertTrue(stored.publicId().matches("warranty-claims/[0-9a-f-]{36}\\.png"), stored.publicId());
        assertEquals(base + "/storage/v1/object/public/" + stored.publicId(), stored.secureUrl());
        var call = calls.getFirst();
        assertEquals("POST", call.method());
        assertEquals("/storage/v1/object/" + stored.publicId(), call.path());
        assertEquals("Bearer sb_secret_test", call.auth());
        assertEquals("sb_secret_test", call.apikey());
        assertEquals("false", call.upsert());
        assertEquals("image/png", call.type());
        assertTrue(call.bytes() > 0);
        assertTrue(storage.owns(ImageBucket.WARRANTY_CLAIMS, stored.secureUrl()));
        assertFalse(storage.owns(ImageBucket.DELIVERY_PROOFS, stored.secureUrl()));
        assertFalse(storage.owns(ImageBucket.WARRANTY_CLAIMS, "https://evil.example/storage/v1/object/public/" + stored.publicId()));
    }

    @Test
    void avatarUsesOwnerFolderUpsertAndCacheBusting() throws Exception {
        var storage = new SupabaseImageStorage(base, "key");
        UUID owner = UUID.randomUUID();
        var stored = storage.uploadAvatar(owner, file(png()));
        assertEquals("avatars/" + owner + "/avatar.png", stored.publicId());
        assertTrue(stored.secureUrl().startsWith(base + "/storage/v1/object/public/avatars/" + owner + "/avatar.png?v="));
        assertEquals("true", calls.getFirst().upsert());
        assertEquals("DELETE", calls.get(1).method());
        assertEquals("/storage/v1/object/avatars/" + owner + "/avatar.jpg", calls.get(1).path());
        assertThrows(IllegalArgumentException.class, () -> storage.upload(ImageBucket.AVATARS, file(png())));
    }

    @Test
    void deleteValidatesIdAndToleratesMissingObjects() {
        var storage = new SupabaseImageStorage(base, "key");
        assertThrows(BadRequestException.class, () -> storage.delete("smartbox/warranty-claims/old-cloudinary-id"));
        assertThrows(BadRequestException.class, () -> storage.delete("warranty-claims/../avatars/x.png"));
        status = 404;
        assertDoesNotThrow(() -> storage.delete("warranty-claims/" + UUID.randomUUID() + ".jpg"));
        status = 500;
        var error = assertThrows(AppException.class, () -> storage.delete("warranty-claims/" + UUID.randomUUID() + ".jpg"));
        assertEquals(502, error.getCode());
    }

    @Test
    void providerFailureAndMissingConfigReturnFixedErrors() throws Exception {
        status = 500;
        var failing = new SupabaseImageStorage(base, "key");
        assertEquals(502, assertThrows(AppException.class, () -> failing.upload(ImageBucket.PRODUCTS, file(png()))).getCode());
        var unconfigured = new SupabaseImageStorage("", "");
        assertEquals(503, assertThrows(AppException.class, () -> unconfigured.upload(ImageBucket.PRODUCTS, file(png()))).getCode());
        assertFalse(unconfigured.owns(ImageBucket.PRODUCTS, "/storage/v1/object/public/product-images/" + UUID.randomUUID() + ".png"));
    }

    @Test
    void sanitizerRejectsNonImagesAndStripsPayloads() throws Exception {
        assertThrows(BadRequestException.class, () -> ImageSanitizer.sanitize(file("<svg onload=alert(1)>".getBytes())));
        assertThrows(BadRequestException.class, () -> ImageSanitizer.sanitize(file(new byte[0])));
        byte[] withPayload = png();
        byte[] polluted = new byte[withPayload.length + 16];
        System.arraycopy(withPayload, 0, polluted, 0, withPayload.length);
        System.arraycopy("<script>x</script>".getBytes(), 0, polluted, withPayload.length, 16);
        var result = ImageSanitizer.sanitize(file(polluted));
        assertEquals("png", result.format());
        assertFalse(new String(result.bytes()).contains("<script>"));
    }
}
