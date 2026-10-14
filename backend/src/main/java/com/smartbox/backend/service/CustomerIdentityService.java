package com.smartbox.backend.service;

import com.smartbox.backend.entity.Profile;
import com.smartbox.backend.exception.UnauthorizedException;
import com.smartbox.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

/** Provision only from a provider-verified session/user response, never from signup's client input or JWT claims. */
@Service @RequiredArgsConstructor
public class CustomerIdentityService {
    private final JdbcTemplate jdbc;
    private final ProfileRepository profiles;
    public Profile ensure(Map<?,?> user){
        if(user==null||user.get("id")==null||user.get("email")==null)throw new UnauthorizedException("AUTH_PROFILE_MISSING");
        UUID id=UUID.fromString(user.get("id").toString());var existing=profiles.findById(id);if(existing.isPresent())return existing.get();
        var metadata=user.get("user_metadata") instanceof Map<?,?> m?m:Map.of();
        String name=Objects.toString(metadata.get("full_name"),"").trim();if(name.length()>200)name=name.substring(0,200);
        String phone=Objects.toString(metadata.get("phone"),"");if(!phone.matches("^$|\\+?[0-9 ()-]{8,30}"))phone="";
        // Concurrent first requests may both provision; neither may change a pre-existing staff role.
        jdbc.update("INSERT INTO public.profiles(id,email,full_name,phone,role,is_locked,is_2fa_enabled) VALUES(?,?,?,?,CAST('customer' AS public.user_role),false,false) ON CONFLICT(id) DO NOTHING",id,user.get("email").toString(),name,phone);
        return profiles.findById(id).orElseThrow(()->new UnauthorizedException("AUTH_PROFILE_MISSING"));
    }
}
