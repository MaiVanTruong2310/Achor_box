package com.smartbox.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@Slf4j
public class DashboardExecutorConfig {

    @Bean("dashboardExecutor")
    public ThreadPoolTaskExecutor executor(
            @Value("${smartbox.dashboard.core-size:8}") int threads,
            @Value("${smartbox.dashboard.queue-capacity:100}") int queue) {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(threads);
        executor.setMaxPoolSize(Math.max(threads, threads * 2));
        executor.setQueueCapacity(queue);
        executor.setThreadNamePrefix("dashboard-async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(5);
        executor.setTaskDecorator(task -> {
            var context = MDC.getCopyOfContextMap();
            return () -> {
                var prior = MDC.getCopyOfContextMap();
                try {
                    if (context != null) {
                        MDC.setContextMap(context);
                    } else {
                        MDC.clear();
                    }
                    task.run();
                } finally {
                    if (prior == null) {
                        MDC.clear();
                    } else {
                        MDC.setContextMap(prior);
                    }
                }
            };
        });
        executor.initialize();
        log.info("Initialized dashboard executor with corePoolSize={} maxPoolSize={} queueCapacity={}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), queue);
        return executor;
    }
}

