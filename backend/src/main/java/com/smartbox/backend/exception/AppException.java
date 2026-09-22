package com.smartbox.backend.exception;

import lombok.Getter;

@Getter
public class AppException extends RuntimeException {

    private final int code;

    public AppException(String message) {
        super(message);
        this.code = 400;
    }

    public AppException(int code, String message) {
        super(message);
        this.code = code;
    }
}
