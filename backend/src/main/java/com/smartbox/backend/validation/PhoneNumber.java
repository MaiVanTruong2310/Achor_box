package com.smartbox.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PhoneNumberValidator.class)
@Target({ElementType.METHOD, ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface PhoneNumber {

    String message() default "Số điện thoại không hợp lệ (định dạng Việt Nam 10 chữ số bắt đầu bằng 0)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
