package com.smartbox.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends AppException {

    public ConflictException(String message) {
        super(409, message);
    }
}
