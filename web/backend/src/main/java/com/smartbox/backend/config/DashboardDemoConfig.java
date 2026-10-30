package com.smartbox.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CancellationException;

/**
 * Cấu hình tham số kiểm thử độ trễ và lỗi mô phỏng (Chaos/Demo testing) cho bảng điều khiển Dashboard.
 */
@Component
@ConfigurationProperties(prefix = "smartbox.demo.dashboard")
public class DashboardDemoConfig {

    private Map<String, Duration> delay = new HashMap<>();
    private Set<String> fail = new HashSet<>();

    public Map<String, Duration> getDelay() {
        return delay;
    }

    public void setDelay(Map<String, Duration> delay) {
        this.delay = delay;
    }

    public Set<String> getFail() {
        return fail;
    }

    public void setFail(Set<String> fail) {
        this.fail = fail;
    }

    public void before(String part) {
        Duration duration = delay.getOrDefault(part, Duration.ZERO);
        if (duration.isNegative() || duration.compareTo(Duration.ofSeconds(30)) > 0) {
            throw new IllegalArgumentException("Demo delay must be between 0 and 30s");
        }

        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new CancellationException("Dashboard interrupted");
        }

        if (fail.contains(part)) {
            throw new IllegalStateException("Demo dashboard failure: " + part);
        }
    }
}
