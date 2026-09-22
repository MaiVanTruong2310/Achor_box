package com.smartbox.backend.common;

import org.springframework.data.domain.Page;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tiện ích định dạng phân trang dữ liệu theo Map<String, Object>
 * Chuẩn hóa cấu trúc trả về cho Frontend và Swagger API.
 */
public class PaginationUtil {

    private PaginationUtil() {
        // Utility class
    }

    /**
     * Chuyển đổi một Spring Data Page<?> thành Map<String, Object>
     *
     * @param page Đối tượng Page từ Spring Data JPA
     * @return Map chứa content và các metadata phân trang
     */
    public static Map<String, Object> toMap(Page<?> page) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", page.getContent());
        response.put("currentPage", page.getNumber());
        response.put("totalElements", page.getTotalElements());
        response.put("totalPages", page.getTotalPages());
        response.put("pageSize", page.getSize());
        response.put("numberOfElements", page.getNumberOfElements());
        response.put("isFirst", page.isFirst());
        response.put("isLast", page.isLast());
        response.put("hasNext", page.hasNext());
        response.put("hasPrevious", page.hasPrevious());
        return response;
    }

    /**
     * Tạo Map phân trang thủ công từ List dữ liệu tùy biến
     */
    public static <T> Map<String, Object> toMap(List<T> content, int currentPage, int pageSize, long totalElements) {
        Map<String, Object> response = new LinkedHashMap<>();
        int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalElements / pageSize) : 0;
        response.put("content", content);
        response.put("currentPage", currentPage);
        response.put("totalElements", totalElements);
        response.put("totalPages", totalPages);
        response.put("pageSize", pageSize);
        response.put("numberOfElements", content.size());
        response.put("isFirst", currentPage == 0);
        response.put("isLast", currentPage >= totalPages - 1);
        response.put("hasNext", currentPage < totalPages - 1);
        response.put("hasPrevious", currentPage > 0);
        return response;
    }
}
