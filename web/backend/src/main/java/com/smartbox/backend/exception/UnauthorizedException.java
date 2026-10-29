package com.smartbox.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class UnauthorizedException extends AppException {

    public UnauthorizedException(String message) {
        super(401, message);
    }
}
