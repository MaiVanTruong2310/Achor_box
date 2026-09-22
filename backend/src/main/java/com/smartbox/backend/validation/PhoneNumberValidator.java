package com.smartbox.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class PhoneNumberValidator implements ConstraintValidator<PhoneNumber, String> {

    // Vietnam phone numbers: 10 digits starting with 0 (e.g. 03, 05, 07, 08, 09)
    private static final Pattern PHONE_PATTERN = Pattern.compile("^0[3|5|7|8|9][0-9]{8}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.trim().isEmpty()) {
            return true; // Use @NotBlank or @NotNull for emptiness check
        }
        return PHONE_PATTERN.matcher(value.trim()).matches();
    }
}
