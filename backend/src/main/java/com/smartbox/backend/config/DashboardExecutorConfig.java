package com.smartbox.backend.config;

import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class DashboardExecutorConfig {
    @Bean("dashboardExecutor")
    public ThreadPoolTaskExecutor executor(@Value("${smartbox.dashboard.core-size:4}") int threads,@Value("${smartbox.dashboard.queue-capacity:50}") int queue) {
        var executor=new ThreadPoolTaskExecutor();executor.setCorePoolSize(threads);executor.setMaxPoolSize(threads);
        executor.setQueueCapacity(queue);executor.setThreadNamePrefix("dashboard-");
        executor.setTaskDecorator(task->{var context=MDC.getCopyOfContextMap();return ()->{var prior=MDC.getCopyOfContextMap();try {if(context!=null)MDC.setContextMap(context);else MDC.clear();task.run();}finally{if(prior==null)MDC.clear();else MDC.setContextMap(prior);}};});
        executor.initialize();return executor;
    }
}
