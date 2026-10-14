package com.smartbox.backend.controller;

import com.smartbox.backend.dto.request.CustomerRequests;
import com.smartbox.backend.service.CustomerAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class CustomerAuthController {
    private final CustomerAuthService auth;
    @PostMapping("/register") public Map<String,Object> register(@Valid @RequestBody CustomerRequests.Register request){return auth.register(request);}
    @PostMapping("/forgot-password") public Map<String,Object> forgot(@Valid @RequestBody CustomerRequests.ForgotPassword request){return auth.forgot(request);}
    @PostMapping("/reset-password") public Map<String,Object> reset(@Valid @RequestBody CustomerRequests.ResetPassword request){return auth.reset(request);}
    @PostMapping("/change-password") public Map<String,Object> change(@Valid @RequestBody CustomerRequests.ChangePassword request){return auth.change(request);}
}
