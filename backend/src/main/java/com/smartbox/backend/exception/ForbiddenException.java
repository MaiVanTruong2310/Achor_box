package com.smartbox.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends AppException {

    public ForbiddenException(String message) {
        super(403, message);
    }
}
