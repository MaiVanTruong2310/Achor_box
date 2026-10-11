package com.smartbox.backend.controller;
import com.smartbox.backend.service.PushNotificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor @RequestMapping("/api/notifications")
public class NotificationController {
    private final PushNotificationService push;
    public record Token(@NotBlank @Size(max=4096) String token){}
    public record Preference(@NotNull Boolean enabled){}
    @PostMapping("/tokens") public Map<String,Object> register(@Valid @RequestBody Token request){return push.register(request.token());}
    @DeleteMapping("/tokens/{id}") public void remove(@PathVariable UUID id){push.remove(id);}
    @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return push.list(page,size);}
    @PatchMapping("/{id}/read") public void read(@PathVariable UUID id){push.read(id);}
    @PutMapping("/preferences/{event}") public void preference(@PathVariable String event,@Valid @RequestBody Preference request){push.preference(event,request.enabled());}
}
