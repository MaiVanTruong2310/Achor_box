package com.smartbox.backend.service.warranty;

import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Paid warranty extensions a customer can attach to an order line. */
@Service
@RequiredArgsConstructor
public class WarrantyPlanService {

    public record Plan(UUID id, String code, String name, int extraMonths, BigDecimal price) {
        public Map<String, Object> view() {
            var map = new LinkedHashMap<String, Object>();
            map.put("id", id);
            map.put("code", code);
            map.put("name", name);
            map.put("extraMonths", extraMonths);
            map.put("price", price);
            return map;
        }
    }

    private final CommerceRepository db;

    public List<Map<String, Object>> active() {
        return db.list("SELECT id,code,name,extra_months,price FROM public.warranty_plans WHERE is_active ORDER BY sort_order,extra_months")
                .stream().map(WarrantyPlanService::plan).map(Plan::view).toList();
    }

    /** Returns null for "no extension"; rejects unknown or retired plans so the price cannot be guessed client-side. */
    public Plan require(UUID id) {
        if (id == null) {
            return null;
        }
        var rows = db.list("SELECT id,code,name,extra_months,price FROM public.warranty_plans WHERE id=? AND is_active", id);
        if (rows.isEmpty()) {
            throw new BadRequestException("WARRANTY_PLAN_UNAVAILABLE: Gói bảo hành không còn được bán");
        }
        return plan(rows.getFirst());
    }

    private static Plan plan(Map<String, Object> row) {
        return new Plan(UUID.fromString(row.get("id").toString()), row.get("code").toString(), row.get("name").toString(),
                ((Number) row.get("extra_months")).intValue(), new BigDecimal(row.get("price").toString()));
    }
}
