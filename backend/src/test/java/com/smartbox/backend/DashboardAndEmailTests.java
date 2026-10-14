package com.smartbox.backend;

import com.smartbox.backend.config.DashboardExecutorConfig;
import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.*;
import org.junit.jupiter.api.*;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.MailSendException;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DashboardAndEmailTests {
    CurrentActor actors=new CurrentActor(){@Override public Actor get(){return new Actor(UUID.randomUUID(),"super_admin");}};
    @AfterEach void cleanup(){MDC.clear();}
    @Test void dashboardRunsFourQueriesConcurrentlyAndPropagatesTrace(){
        var barrier=new CountDownLatch(4);var traces=new ConcurrentLinkedQueue<String>();
        var db=new CommerceRepository(new JdbcTemplate()){
            void enter(){traces.add(MDC.get("traceId"));barrier.countDown();try{if(!barrier.await(2,TimeUnit.SECONDS))throw new IllegalStateException("Not parallel");}catch(InterruptedException ex){Thread.currentThread().interrupt();throw new IllegalStateException(ex);}}
            @Override public Map<String,Object> one(String sql,Object...args){enter();return Map.of("total",0);}
            @Override public List<Map<String,Object>> list(String sql,Object...args){enter();return List.of();}
        };
        var executor=new DashboardExecutorConfig().executor(4,50);MDC.put("traceId","test-trace");
        try{var result=new ConcurrentDashboardService(db,actors,executor,1500).dashboard(LocalDate.of(2026,10,10));assertEquals(false,result.get("partial"));assertEquals(4,traces.size());assertTrue(traces.stream().allMatch("test-trace"::equals));}finally{executor.shutdown();}
    }
    @Test void dashboardTimeoutKeepsOtherResults(){
        var db=new CommerceRepository(new JdbcTemplate()){
            @Override public Map<String,Object> one(String sql,Object...args){return Map.of("total",0);}
            @Override public List<Map<String,Object>> list(String sql,Object...args){if(sql.contains("sum(i.quantity)"))try{Thread.sleep(500);}catch(InterruptedException ex){Thread.currentThread().interrupt();}return List.of();}
        };
        var executor=new DashboardExecutorConfig().executor(4,50);
        try{var result=new ConcurrentDashboardService(db,actors,executor,100).dashboard(LocalDate.now());assertEquals(true,result.get("partial"));assertEquals(List.of("top5Variants"),result.get("failedParts"));assertNull(result.get("top5Variants"));assertNotNull(result.get("orderCountByStatus"));}finally{executor.shutdown();}
    }
    @Test void executorOverloadReturns503(){
        var service=new ConcurrentDashboardService(new CommerceRepository(new JdbcTemplate()),actors,task->{throw new RejectedExecutionException();},1500);
        assertEquals(503,assertThrows(AppException.class,()->service.dashboard(LocalDate.now())).getCode());
    }
    CommerceRepository emptyDb(){return new CommerceRepository(new JdbcTemplate()){
        @Override public Map<String,Object> one(String sql,Object...args){return Map.of("total",0);}
        @Override public List<Map<String,Object>> list(String sql,Object...args){return List.of();}
    };}
    @Test void demoSequentialComparisonAndFailureIsolation(){
        var config=new com.smartbox.backend.config.DashboardDemoConfig();
        for(String name:List.of("revenueToday","orderCountByStatus","top5Variants","lowStockVariants"))config.getDelay().put(name,Duration.ofMillis(500));
        var executor=new DashboardExecutorConfig().executor(4,50);
        try {
            var service=new ConcurrentDashboardService(emptyDb(),actors,executor,1500,config,true);
            var sequential=service.dashboard(LocalDate.now(),"sequential");
            var parallel=service.dashboard(LocalDate.now());
            assertTrue(((Number)sequential.get("elapsedMs")).longValue()>=2000);
            assertTrue(((Number)parallel.get("elapsedMs")).longValue()<1000);
            assertEquals(false,parallel.get("partial"));
            config.getDelay().clear();config.getFail().add("lowStockVariants");
            var failed=service.dashboard(LocalDate.now());
            assertEquals(List.of("lowStockVariants"),failed.get("failedParts"));assertNull(failed.get("lowStockVariants"));assertNotNull(failed.get("top5Variants"));
        }finally{executor.shutdown();}
    }
    @Test void slowDemoTaskIsInterruptedAndExecutorRecovers(){
        var config=new com.smartbox.backend.config.DashboardDemoConfig();config.getDelay().put("top5Variants",Duration.ofSeconds(3));
        var executor=new DashboardExecutorConfig().executor(4,50);
        try {
            var service=new ConcurrentDashboardService(emptyDb(),actors,executor,1500,config,true);
            var result=service.dashboard(LocalDate.now());
            assertEquals(List.of("top5Variants"),result.get("failedParts"));assertTrue(((Number)result.get("elapsedMs")).longValue()<2000);
            config.getDelay().clear();assertEquals(false,service.dashboard(LocalDate.now()).get("partial"));
        }finally{executor.shutdown();}
    }
    @Test void sequentialAndFaultInjectionAreOnlyAvailableInDemo(){
        var config=new com.smartbox.backend.config.DashboardDemoConfig();config.getFail().add("revenueToday");
        var executor=new DashboardExecutorConfig().executor(4,50);
        try {
            var service=new ConcurrentDashboardService(emptyDb(),actors,executor,1500,config,false);
            assertEquals(400,assertThrows(AppException.class,()->service.dashboard(LocalDate.now(),"sequential")).getCode());
            assertEquals(400,assertThrows(AppException.class,()->service.dashboard(LocalDate.now(),"wrong")).getCode());
            var result=service.dashboard(LocalDate.now());assertEquals(false,result.get("partial"));
            assertEquals(6,((Map<?,?>)result.get("orderCountByStatus")).size());
        }finally{executor.shutdown();}
    }
    @Test void sixtyConcurrentRequestsAreBoundedAndRecover() throws Exception {
        var config=new com.smartbox.backend.config.DashboardDemoConfig();
        for(String name:List.of("revenueToday","orderCountByStatus","top5Variants","lowStockVariants"))config.getDelay().put(name,Duration.ofMillis(500));
        var executor=new DashboardExecutorConfig().executor(4,50);
        var callers=Executors.newFixedThreadPool(60);var gate=new CountDownLatch(1);
        try {
            var service=new ConcurrentDashboardService(emptyDb(),actors,executor,1500,config,true);
            var calls=new ArrayList<Future<Long>>();
            for(int i=0;i<60;i++)calls.add(callers.submit(()->{
                gate.await();long start=System.nanoTime();
                try {var result=service.dashboard(LocalDate.now());assertNotNull(result.get("partial"));}
                catch(AppException ex){assertEquals(503,ex.getCode());assertEquals("DASHBOARD_BUSY",ex.getMessage());}
                return (System.nanoTime()-start)/1_000_000;
            }));
            gate.countDown();for(var call:calls)assertTrue(call.get(5,TimeUnit.SECONDS)<2000);
            config.getDelay().clear();
            var recovery=service.dashboard(LocalDate.now());assertEquals(false,recovery.get("partial"));
        }finally{callers.shutdownNow();executor.shutdown();}
    }
    @Test void demoConfigurationBindsDurationAndVariantNames(){
        var source=new org.springframework.boot.context.properties.source.MapConfigurationPropertySource(Map.of(
            "smartbox.demo.dashboard.delay.top5Variants","3s","smartbox.demo.dashboard.fail[0]","lowStockVariants"));
        var config=new org.springframework.boot.context.properties.bind.Binder(source).bind("smartbox.demo.dashboard",org.springframework.boot.context.properties.bind.Bindable.of(com.smartbox.backend.config.DashboardDemoConfig.class)).get();
        assertEquals(Duration.ofSeconds(3),config.getDelay().get("top5Variants"));assertTrue(config.getFail().contains("lowStockVariants"));
    }
    @Test void allPartLogsAndFailureKeepRequestTrace() throws Exception {
        var logger=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(ConcurrentDashboardService.class);
        var events=new ConcurrentLinkedQueue<ch.qos.logback.classic.spi.ILoggingEvent>();
        var appender=new ch.qos.logback.core.AppenderBase<ch.qos.logback.classic.spi.ILoggingEvent>(){
            @Override protected void append(ch.qos.logback.classic.spi.ILoggingEvent event){event.prepareForDeferredProcessing();events.add(event);}
        };
        appender.start();logger.addAppender(appender);
        var config=new com.smartbox.backend.config.DashboardDemoConfig();config.getFail().add("lowStockVariants");
        var executor=new DashboardExecutorConfig().executor(4,50);MDC.put("traceId","dashboard-error-trace");
        try {
            new ConcurrentDashboardService(emptyDb(),actors,executor,1500,config,true).dashboard(LocalDate.now());
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(1);
            while(events.stream().filter(e->e.getFormattedMessage().startsWith("Dashboard part=")).count()<4&&System.nanoTime()<deadline)Thread.sleep(5);
            assertEquals(4,events.stream().filter(e->e.getFormattedMessage().startsWith("Dashboard part=")).count());
            assertTrue(events.size()>=6);
            assertTrue(events.stream().allMatch(e->"dashboard-error-trace".equals(e.getMDCPropertyMap().get("traceId"))));
            assertTrue(events.stream().anyMatch(e->e.getLevel()==ch.qos.logback.classic.Level.ERROR&&e.getFormattedMessage().contains("lowStockVariants")));
        }finally{executor.shutdown();logger.detachAppender(appender);appender.stop();}
    }
    TemplateEngine templates(){var resolver=new ClassLoaderTemplateResolver();resolver.setPrefix("templates/");resolver.setSuffix(".html");resolver.setCharacterEncoding("UTF-8");var engine=new org.thymeleaf.spring6.SpringTemplateEngine();engine.setTemplateResolver(resolver);return engine;}
    @Test void smtpFailureDoesNotUndoPaidTransactionAndInvokesRetry(){
        var outbox=mock(OutboxService.class);UUID id=UUID.randomUUID();
        when(outbox.claim(any(),anyInt())).thenReturn(List.of(Map.of("id",id,"template","ORDER_PAID","recipient","recipient@smartbox.test")));
        when(outbox.payload(anyMap())).thenReturn(Map.of("orderId",UUID.randomUUID().toString(),"name","Khách SmartBox","total",1200000,"time","2026-10-01T23:30:00Z","reason","Đã thanh toán","items",List.of(Map.of("name","SmartBox Pro","variant","M 85L","sku","TEST-PRO-M","quantity",1,"price",1200000,"subtotal",1200000))));
        var attempted=new java.util.concurrent.atomic.AtomicBoolean();
        var sender=new JavaMailSenderImpl(){@Override public void send(jakarta.mail.internet.MimeMessage message){attempted.set(true);throw new MailSendException("SMTP offline for test");}};
        var factory=new StaticListableBeanFactory(Map.of("sender",sender));
        var worker=new EmailOutboxWorker(outbox,factory.getBeanProvider(org.springframework.mail.javamail.JavaMailSender.class),templates());
        ReflectionTestUtils.setField(worker,"enabled",true);ReflectionTestUtils.setField(worker,"from","sender@smartbox.test");ReflectionTestUtils.setField(worker,"senderName","SmartBox");ReflectionTestUtils.setField(worker,"shopUrl","");ReflectionTestUtils.setField(worker,"lease",1800);ReflectionTestUtils.setField(worker,"backoff",60L);
        assertDoesNotThrow(worker::run);assertTrue(attempted.get(),"Template must render before the SMTP failure is exercised");verify(outbox).failed(eq(id),any(),contains("SMTP_DELIVERY_FAILED"),eq(60L));verify(outbox,never()).sent(any(),any());
    }
}
