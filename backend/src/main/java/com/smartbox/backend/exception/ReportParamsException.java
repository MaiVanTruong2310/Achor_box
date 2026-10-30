package com.smartbox.backend.exception;

import java.util.List;
import java.util.Map;

public class ReportParamsException extends AppException {

    private final List<Map<String, String>> errors;

    public ReportParamsException(List<Map<String, String>> errors) {
        super(400, "INVALID_REPORT_PARAMS");
        this.errors = List.copyOf(errors);
    }

    public List<Map<String, String>> getErrors() {
        return errors;
    }
}
