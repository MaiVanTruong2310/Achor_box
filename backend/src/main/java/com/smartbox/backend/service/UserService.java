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
    private final com.smartbox.backend.security.SupabaseAuthGateway authProvider;
    private final com.smartbox.backend.security.CurrentActor actors;
    private final com.smartbox.backend.repository.CommerceRepository commerce;

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getAllUsers() {
        return profileRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUsersPaged(int page, int size) {
        return getUsersPaged(page,size,null,null,null);
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> getUsersPaged(int page,int size,String search,String role,Boolean locked) {
        actors.get().requireRoles("super_admin","support_agent");
        com.smartbox.backend.common.AdminSearch.page(page,size);
        String term=com.smartbox.backend.common.AdminSearch.term(search);
        String filter=role==null?"":role.trim();
        if(!filter.isEmpty()&&!java.util.Set.of("customer","super_admin","product_manager","support_agent","technician","accountant").contains(filter))throw new com.smartbox.backend.exception.BadRequestException("INVALID_ROLE_FILTER");
        Page<UserProfileResponse> pageResult = profileRepository.search(term,com.smartbox.backend.common.AdminSearch.like(term),filter,locked,PageRequest.of(page,size)).map(this::mapToResponse);
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
        actors.get().requireRoles("super_admin","support_agent");
        if(isLocked==null)throw new AppException(400,"LOCK_STATE_REQUIRED");
        if(id.equals(actors.get().id()))throw new AppException(409,"CANNOT_LOCK_OWN_ACCOUNT");
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));
        if("support_agent".equals(actors.get().role())&&!"customer".equals(profile.getRole()))throw new AppException(403,"SUPPORT_CAN_ONLY_LOCK_CUSTOMERS");
        profile.setIsLocked(isLocked);
        Profile saved = profileRepository.save(profile);

        commerce.audit(actors.get().id(),Boolean.TRUE.equals(isLocked)?"LOCK_USER":"UNLOCK_USER","profiles",id,reason);

        return mapToResponse(saved);
    }

    @Transactional
    public UserProfileResponse updateRole(UUID id, String role) {
        actors.get().requireRoles("super_admin");
        if(role==null||java.util.Arrays.stream(UserRole.values()).noneMatch(r->r.getValue().equals(role)))throw new AppException(400,"INVALID_ROLE");
        if(id.equals(actors.get().id()))throw new AppException(409,"CANNOT_CHANGE_OWN_ROLE");
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", id));
        profile.setRole(role);
        commerce.audit(actors.get().id(),"CHANGE_USER_ROLE","profiles",id,role);
        return mapToResponse(profileRepository.save(profile));
    }

    @Transactional
    public UserProfileResponse createStaffUser(CreateStaffRequest req) {
        actors.get().requireRoles("super_admin");
        if(!java.util.Set.of("super_admin","product_manager","support_agent","technician","accountant").contains(req.getRole()))throw new AppException(400,"INVALID_STAFF_ROLE");
        if(req.getInitialPassword()==null||req.getInitialPassword().length()<12||req.getInitialPassword().length()>128)throw new AppException(400,"INITIAL_PASSWORD_REQUIRED: Mật khẩu phải dài 12–128 ký tự");
        String email=req.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
        if(profileRepository.existsByEmail(email))throw new AppException(409,"EMAIL_ALREADY_EXISTS");
        UUID id=authProvider.createStaff(email,req.getInitialPassword(),req.getFullName());
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){
            @Override public void afterCompletion(int status){if(status==STATUS_ROLLED_BACK){try{authProvider.deleteProvisionedUser(id);}catch(Exception ex){log.error("Auth provisioning compensation failed for {}",id);}}}
        });
        Profile profile=profileRepository.findById(id).orElseGet(()->Profile.builder().id(id).isLocked(false).is2faEnabled(false).build());
        profile.setEmail(email);profile.setFullName(req.getFullName());profile.setPhone(req.getPhone());profile.setDefaultAddress(req.getDefaultAddress());profile.setRole(req.getRole());
        Profile saved=profileRepository.saveAndFlush(profile);
        return mapToResponse(saved);
    }

    // -------------------------------------------------------------
    // HOTLINE PASSWORD RESET WITH EMAIL OTP
    // -------------------------------------------------------------
    public SendOtpResponse sendResetPasswordOtp(UUID id) {
        actors.get().requireRoles("super_admin","support_agent");
        var profile=profileRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("Người dùng","id",id));
        if(profile.getEmail()==null||profile.getEmail().isBlank())throw new AppException(400,"EMAIL_REQUIRED");
        authProvider.recovery(profile.getEmail());
        return SendOtpResponse.builder().success(true).message("Đã yêu cầu Supabase Auth gửi liên kết khôi phục mật khẩu; khách hàng tự xác minh qua email.").email(profile.getEmail()).emailSent(true).previewOtp(null).build();
    }

    public ResetPasswordResponse verifyOtpAndResetPassword(UUID id, String otp, String newPassword) {
        throw new AppException(503, "AUTH_PROVIDER_RECOVERY_REQUIRED: Chưa có tích hợp reset hotline an toàn; không báo thành công khi mật khẩu chưa đổi");
    }

    public UserProfileResponse mapToResponse(Profile p) {
        String email = p.getEmail();


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
