package com.smartbox.backend.dto.request.customer;

import com.smartbox.backend.dto.request.admin.*;
import com.smartbox.backend.dto.request.auth.*;
import com.smartbox.backend.dto.request.catalog.*;
import com.smartbox.backend.dto.request.commerce.*;
import com.smartbox.backend.dto.request.customer.*;
import com.smartbox.backend.dto.request.device.*;
import com.smartbox.backend.dto.request.warranty.*;
import com.smartbox.backend.dto.response.admin.*;
import com.smartbox.backend.dto.response.auth.*;
import com.smartbox.backend.dto.response.catalog.*;
import com.smartbox.backend.dto.response.commerce.*;
import com.smartbox.backend.dto.response.customer.*;
import com.smartbox.backend.dto.response.device.*;
import com.smartbox.backend.dto.response.warranty.*;
import jakarta.validation.constraints.*;

public final class CustomerDirectoryRequests {
    public record Create(@NotBlank @Size(max=200) String fullName,
        @Email @Size(max=254) String email,
        @Pattern(regexp="^$|\\+?[0-9 ()-]{8,30}") String phone,
        @Size(max=2000) String address,@Size(max=2000) String notes,boolean createLogin,
        @Pattern(regexp="(?i)[a-z0-9][a-z0-9_.-]{2,31}") String username,
        @Size(min=8,max=72) String password) {
        @Override public String toString(){return "CustomerCreate[redacted]";}
    }
    public record Update(@NotBlank @Size(max=200) String fullName,@Email @Size(max=254) String email,
        @Pattern(regexp="^$|\\+?[0-9 ()-]{8,30}") String phone,@Size(max=2000) String address,@Size(max=2000) String notes,boolean archived){}
}
