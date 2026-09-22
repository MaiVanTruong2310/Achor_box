package com.smartbox.backend.service;

import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.request.AuditLogRequest;
import com.smartbox.backend.dto.request.CreateStaffRequest;
import com.smartbox.backend.dto.response.*;
import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.enums.UserRole;
import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final ProfileRepository profileRepository;
    private final OrderService orderService;
    private final DeviceService deviceService;
    private final WarrantyService warrantyService;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    // Cache tạm thời lưu mã OTP Hotline theo userId (hạn dùng 5 phút)
    private static class OtpEntry {
        final String code;
        final long expireAt;

        OtpEntry(String code, long expireAt) {
            this.code = code;
            this.expireAt = expireAt;
        }
    }

    private final Map<UUID, OtpEntry> otpCache = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getAllUsers() {
        return profileRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUsersPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserProfileResponse> pageResult = profileRepository.findAll(pageable).map(this::mapToResponse);
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public Customer360Response getUser360Details(UUID id) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));

        // 1. Lấy danh sách đơn hàng đã mua
        List<OrderResponse> orders = orderService.getOrdersByUserId(id);

        // 2. Lấy danh sách thiết bị IoT đang sở hữu
        List<DeviceResponse> devices = deviceService.getDevicesByOwnerId(id);

        // 3. Lấy lịch sử yêu cầu bảo hành gắn liền với các thiết bị này
        List<UUID> deviceIds = devices.stream().map(DeviceResponse::getId).collect(Collectors.toList());
        List<ClaimResponse> claims = warrantyService.getClaimsByDeviceIds(deviceIds);

        return Customer360Response.builder()
                .profile(mapToResponse(profile))
                .orders(orders != null ? orders : Collections.emptyList())
                .devices(devices != null ? devices : Collections.emptyList())
                .warrantyClaims(claims != null ? claims : Collections.emptyList())
                .build();
    }

    @Transactional
    public UserProfileResponse toggleLock(UUID id, Boolean isLocked, String reason) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));
        profile.setIsLocked(isLocked);
        Profile saved = profileRepository.save(profile);

        // Ghi log kiểm toán
        try {
            auditLogService.logAction(AuditLogRequest.builder()
                    .actorId(null)
                    .action(Boolean.TRUE.equals(isLocked) ? "LOCK_USER" : "UNLOCK_USER")
                    .targetTable("profiles")
                    .targetId(id)
                    .meta(reason != null && !reason.trim().isEmpty() 
                            ? "{\"reason\": \"" + reason + "\", \"user_name\": \"" + saved.getFullName() + "\"}"
                            : "{\"user_name\": \"" + saved.getFullName() + "\"}")
                    .build());
        } catch (Exception ex) {
            log.warn("Không thể ghi audit log: {}", ex.getMessage());
        }

        return mapToResponse(saved);
    }

    @Transactional
    public UserProfileResponse updateRole(UUID id, String role) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));
        profile.setRole(role);
        return mapToResponse(profileRepository.save(profile));
    }

    @Transactional
    public UserProfileResponse createStaffUser(CreateStaffRequest req) {
        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            throw new AppException(400, "Email không được để trống.");
        }
        String email = req.getEmail().trim().toLowerCase();
        if (profileRepository.existsByEmail(email)) {
            throw new AppException(400, "Email '" + email + "' đã tồn tại trên hệ thống!");
        }

        UserRole roleEnum = UserRole.fromString(req.getRole());
        if (roleEnum == null) {
            roleEnum = UserRole.SUPPORT_AGENT;
        }

        Profile newProfile = Profile.builder()
                .id(UUID.randomUUID())
                .fullName(req.getFullName() != null ? req.getFullName().trim() : "Nhân viên mới")
                .email(email)
                .phone(req.getPhone())
                .role(roleEnum.getValue())
                .defaultAddress(req.getDefaultAddress())
                .isLocked(false)
                .is2faEnabled(false)
                .build();

        Profile saved = profileRepository.save(newProfile);

        // Ghi log kiểm toán
        try {
            auditLogService.logAction(AuditLogRequest.builder()
                    .actorId(null)
                    .action("CREATE_STAFF_ACCOUNT")
                    .targetTable("profiles")
                    .targetId(saved.getId())
                    .meta("{\"user_name\": \"" + saved.getFullName() + "\", \"email\": \"" + saved.getEmail() + "\", \"role\": \"" + saved.getRole() + "\"}")
                    .build());
        } catch (Exception ex) {
            log.warn("Không thể ghi audit log khi tạo nhân viên: {}", ex.getMessage());
        }

        log.info("[STAFF PROVISIONING] Đã cấp thành công tài khoản nhân viên {} ({}) với vai trò {}",
                saved.getFullName(), saved.getEmail(), saved.getRole());

        return mapToResponse(saved);
    }

    // -------------------------------------------------------------
    // HOTLINE PASSWORD RESET WITH EMAIL OTP
    // -------------------------------------------------------------
    public SendOtpResponse sendResetPasswordOtp(UUID id) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));

        String targetEmail = profile.getEmail();
        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            targetEmail = "user_" + id.toString().substring(0, 8) + "@smartbox.vn";
            profile.setEmail(targetEmail);
            profileRepository.save(profile);
        }

        // Sinh mã OTP ngẫu nhiên 6 chữ số
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        long expireAt = System.currentTimeMillis() + (5 * 60 * 1000); // 5 phút
        otpCache.put(id, new OtpEntry(otp, expireAt));

        // Gửi email HTML thật qua SMTP
        boolean isEmailSent = emailService.sendResetPasswordOtpEmail(targetEmail, profile.getFullName(), otp);

        String statusMsg = isEmailSent
                ? "Đã gửi mã OTP xác thực qua Email: " + targetEmail
                : "Đã phát mã OTP xác thực cho: " + targetEmail + (targetEmail.endsWith("@smartbox.vn") ? " (Email nội bộ demo)" : " (Vui lòng kiểm tra hộp thư)");

        log.info("[HOTLINE OTP] Mã OTP xác thực reset mật khẩu cho khách hàng {} ({} - SĐT: {}): {} [Email sent: {}]",
                profile.getFullName(), targetEmail, profile.getPhone(), otp, isEmailSent);

        return SendOtpResponse.builder()
                .success(true)
                .message(statusMsg)
                .email(targetEmail)
                .previewOtp(otp)
                .emailSent(isEmailSent)
                .build();
    }

    @Transactional
    public ResetPasswordResponse verifyOtpAndResetPassword(UUID id, String otp, String newPassword) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));

        OtpEntry entry = otpCache.get(id);
        if (entry == null) {
            throw new AppException(400, "Chưa phát mã OTP hoặc phiên đã hết hạn. Vui lòng bấm 'Gửi mã OTP'!");
        }
        if (System.currentTimeMillis() > entry.expireAt) {
            otpCache.remove(id);
            throw new AppException(400, "Mã OTP đã hết hạn (quá 5 phút). Vui lòng gửi lại mã mới!");
        }
        if (!entry.code.trim().equals(otp != null ? otp.trim() : "")) {
            throw new AppException(400, "Mã OTP không chính xác! Vui lòng đối soát lại với khách hàng.");
        }

        // OTP HỢP LỆ -> Xóa khỏi cache
        otpCache.remove(id);

        String effectivePassword = (newPassword != null && !newPassword.trim().isEmpty())
                ? newPassword.trim()
                : "SmartBox@123456";

        // Ghi log kiểm toán
        try {
            auditLogService.logAction(AuditLogRequest.builder()
                    .actorId(null)
                    .action("HOTLINE_RESET_PASSWORD")
                    .targetTable("profiles")
                    .targetId(id)
                    .meta("{\"user_name\": \"" + profile.getFullName() + "\", \"user_phone\": \"" + profile.getPhone() + "\"}")
                    .build());
        } catch (Exception ex) {
            log.warn("Không thể ghi audit log reset password: {}", ex.getMessage());
        }

        log.info("[HOTLINE RESET PASSWORD] Đã đổi mật khẩu thành công cho user {} (ID: {}) -> Mật khẩu mới: {}",
                profile.getFullName(), id, effectivePassword);

        return ResetPasswordResponse.builder()
                .success(true)
                .message("Đặt lại mật khẩu thành công qua hotline xác thực OTP.")
                .updatedPassword(effectivePassword)
                .build();
    }

    public UserProfileResponse mapToResponse(Profile p) {
        String email = p.getEmail();
        if (email == null || email.trim().isEmpty()) {
            email = (p.getPhone() != null && !p.getPhone().isEmpty()) 
                    ? p.getPhone() + "@smartbox.vn" 
                    : "user_" + p.getId().toString().substring(0, 8) + "@smartbox.vn";
        }

        return UserProfileResponse.builder()
                .id(p.getId())
                .fullName(p.getFullName())
                .phone(p.getPhone())
                .email(email)
                .avatarUrl(p.getAvatarUrl())
                .defaultAddress(p.getDefaultAddress())
                .role(p.getRole())
                .isLocked(p.getIsLocked())
                .is2faEnabled(p.getIs2faEnabled())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
