package com.smartbox.backend.service;

import com.smartbox.backend.dto.AuthDTO;
import com.smartbox.backend.model.Profile;
import com.smartbox.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final ProfileRepository profileRepository;

    public AuthDTO.LoginResponse login(AuthDTO.LoginRequest req) {
        if (req.getEmail() == null || req.getPassword() == null) {
            return AuthDTO.LoginResponse.builder()
                    .success(false)
                    .message("Vui lòng cung cấp đầy đủ email và mật khẩu.")
                    .build();
        }

        // Demo/Admin check
        if ("admin@smartbox.vn".equalsIgnoreCase(req.getEmail().trim()) && "TestOnly-Passw0rd!".equals(req.getPassword())) {
            List<Profile> profiles = profileRepository.findAll();
            Profile adminProf = profiles.stream()
                    .filter(p -> "super_admin".equalsIgnoreCase(p.getRole()))
                    .findFirst()
                    .orElse(null);

            UUID userId = adminProf != null ? adminProf.getId() : UUID.fromString("00000000-0000-0000-0000-000000000001");
            String fullName = adminProf != null ? adminProf.getFullName() : "Tổng Quản Trị Hệ Thống";

            return AuthDTO.LoginResponse.builder()
                    .success(true)
                    .message("Đăng nhập thành công!")
                    .userId(userId)
                    .email(req.getEmail())
                    .fullName(fullName)
                    .role("super_admin")
                    .token("smartbox-jwt-token-" + UUID.randomUUID())
                    .build();
        }

        return AuthDTO.LoginResponse.builder()
                .success(false)
                .message("Email hoặc mật khẩu không chính xác.")
                .build();
    }
}
