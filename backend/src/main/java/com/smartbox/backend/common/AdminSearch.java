package com.smartbox.backend.common;

import com.smartbox.backend.exception.BadRequestException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Locale;

public final class AdminSearch {

    private AdminSearch() {
        // Utility class
    }

    public static Pageable page(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BadRequestException("INVALID_PAGINATION");
        }
        return PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
    }

    public static String term(String search) {
        String value = search == null ? "" : search.trim();
        if (value.length() > 200) {
            throw new BadRequestException("SEARCH_TOO_LONG");
        }
        return value.toLowerCase(Locale.ROOT);
    }

    public static String like(String term) {
        return "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
