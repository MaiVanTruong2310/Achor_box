package com.smartbox.backend.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Explicit SQL for atomic stock operations and locks, alongside existing JPA repositories.
 */
@Repository
@RequiredArgsConstructor
public class CommerceRepository {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void audit(UUID actor, String action, String table, UUID target, String reason) {
        String metadata;
        try {
            metadata = objectMapper.writeValueAsString(Map.of("reason", Objects.toString(reason, "")));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
        update(
            "INSERT INTO public.audit_logs(id, actor_id, action, target_table, target_id, meta, created_at) " +
            "VALUES(?, ?, ?, ?, ?, CAST(? AS jsonb), ?)",
            UUID.randomUUID(),
            actor,
            action,
            table,
            target,
            metadata,
            OffsetDateTime.now(ZoneOffset.UTC)
        );
    }

    public Map<String, Object> order(UUID id, boolean lock) {
        return one("SELECT * FROM public.orders WHERE id=?" + (lock ? " FOR UPDATE" : ""), id);
    }

    public Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        if (rows.isEmpty()) {
            throw new ResourceNotFoundException("Bản ghi", "id", args.length > 0 ? args[0] : "");
        }
        return rows.getFirst();
    }

    public List<Map<String, Object>> list(String sql, Object... args) {
        return jdbc.queryForList(sql, args);
    }

    public int update(String sql, Object... args) {
        return jdbc.update(sql, args);
    }
}
