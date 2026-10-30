package com.smartbox.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.request.commerce.CommerceRequests;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.admin.*;
import com.smartbox.backend.service.auth.*;
import com.smartbox.backend.service.catalog.*;
import com.smartbox.backend.service.commerce.*;
import com.smartbox.backend.service.customer.*;
import com.smartbox.backend.service.device.*;
import com.smartbox.backend.service.warranty.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringJUnitConfig(CommerceIntegrationTests.Config.class)
@TestPropertySource(properties={"smartbox.payment.hmac-secret=test-only-secret-at-least-thirty-two-characters", "smartbox.orders.draft-minutes=30"})
class CommerceIntegrationTests {
    static final UUID CUSTOMER=UUID.fromString("10000000-0000-0000-0000-000000000001");
    static final UUID STAFF=UUID.fromString("10000000-0000-0000-0000-000000000002");
    static class TestActors extends CurrentActor {
        final ThreadLocal<Actor> actor=ThreadLocal.withInitial(()->new Actor(CUSTOMER,"customer"));
        @Override public Actor get(){return actor.get();}
        void staff(){actor.set(new Actor(STAFF,"super_admin"));}
        void po(){actor.set(new Actor(STAFF,"product_manager"));}
        void customer(){actor.set(new Actor(CUSTOMER,"customer"));}
    }
    @Configuration @EnableTransactionManagement
    @Import({OrderWorkflowService.class,OrderStateMachine.class,PaymentService.class,VnpayGateway.class,ApprovalTicketService.class,OutboxService.class,FulfillmentService.class,RevenueReportService.class,MqttDeviceService.class,VariantInventoryService.class,DeviceWorkflowService.class,DeliveryInstallationService.class,CustomerAccountService.class,CustomerOrderService.class,PaymentAuditService.class,AcceptanceWarrantyService.class,OrderTrackingService.class,InstallationDashboardService.class,PaymentTimeoutService.class,OrderDelayedExpiryQueue.class})
    static class Config {
        @Bean DataSource dataSource(@org.springframework.beans.factory.annotation.Value("${test.jdbc.url:jdbc:h2:mem:commerce;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000;NON_KEYWORDS=KEY}") String url,
            @org.springframework.beans.factory.annotation.Value("${test.jdbc.user:sa}") String user,@org.springframework.beans.factory.annotation.Value("${test.jdbc.password:}") String password){return new DriverManagerDataSource(url,user,password);}
        @Bean JdbcTemplate jdbc(DataSource ds){return new JdbcTemplate(ds);}
        @Bean org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate namedJdbc(DataSource ds){return new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(ds);}
        @Bean CommerceRepository repository(JdbcTemplate jdbc) {
            boolean h2=jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Boolean>) c->c.getMetaData().getDatabaseProductName().equals("H2"));
            return new CommerceRepository(jdbc) {
                @Override public int update(String sql,Object...args) {
                    // H2 supports DO NOTHING without a conflict target. PostgreSQL tests use original SQL.
                    return super.update(h2?sql.replaceAll("ON CONFLICT\\([a-z_,]+\\)","ON CONFLICT"):sql,args);
                }
            };
        }
        @Bean org.springframework.transaction.PlatformTransactionManager transactionManager(DataSource ds){return new DataSourceTransactionManager(ds);}
        @Bean ObjectMapper json(){return new ObjectMapper().findAndRegisterModules();}
        @Bean TestActors actors(){return new TestActors();}
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired OrderWorkflowService orders;
    @Autowired PaymentService payments;
    @Autowired ApprovalTicketService tickets;
    @Autowired OutboxService outbox;
    @Autowired FulfillmentService fulfillment;
    @Autowired TestActors actors;
    @Autowired RevenueReportService reports;
    @Autowired MqttDeviceService mqtt;
    UUID product,variant;

    @BeforeEach void setup() throws Exception {
        actors.customer();
        String base=new String(getClass().getResourceAsStream("/commerce-base.sql").readAllBytes(),StandardCharsets.UTF_8);
        String migration=new String(getClass().getResourceAsStream("/db/migration/002_commerce.sql").readAllBytes(),StandardCharsets.UTF_8);
        boolean postgres=jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Boolean>) c->c.getMetaData().getDatabaseProductName().equals("PostgreSQL"));
        if(postgres) {
            if(!(this instanceof PostgresCommerceIntegrationTests)&&!(this instanceof PostgresDeliveryInstallationIntegrationTests)&&!(this instanceof PostgresCustomerAccountIntegrationTests)&&!(this instanceof PostgresPaymentLifecycleTests)&&!(this instanceof PostgresVnpayIntegrationTests))throw new IllegalStateException("Only disposable test-container databases may be reset");
            jdbc.execute("DROP SCHEMA public CASCADE");jdbc.execute("CREATE SCHEMA public");
            base=base.replace("CREATE DOMAIN public.order_status AS varchar;","CREATE TYPE public.order_status AS ENUM ('pending','confirmed','completed','cancelled');");
            jdbc.execute(base);
            String enums=new String(getClass().getResourceAsStream("/db/migration/001_order_enum.sql").readAllBytes(),StandardCharsets.UTF_8);jdbc.execute(enums);
            jdbc.execute(migration);
            jdbc.execute(new String(getClass().getResourceAsStream("/db/migration/003_iot.sql").readAllBytes(),StandardCharsets.UTF_8));
            jdbc.execute(new String(getClass().getResourceAsStream("/db/migration/004_delivery_installation.sql").readAllBytes(),StandardCharsets.UTF_8));
            jdbc.execute(new String(getClass().getResourceAsStream("/db/migration/005_installation_completion_guard.sql").readAllBytes(),StandardCharsets.UTF_8));
            jdbc.execute(new String(getClass().getResourceAsStream("/db/migration/006_customer_account.sql").readAllBytes(),StandardCharsets.UTF_8));
        } else {
            jdbc.execute("DROP ALL OBJECTS");
            migration=migration.replaceAll("(?s)DO \\$\\$ BEGIN.*?END \\$\\$;","")
                .replace(" NOT VALID","").replaceAll("CREATE UNIQUE INDEX (?:IF NOT EXISTS )?uk_payment_workflow_order[^;]+;","")
                .replaceAll("CREATE INDEX (?:IF NOT EXISTS )?idx_order_expiry[^;]+;","")
                .replaceAll("(?i)\\s+ON\\s+CONFLICT\\s*\\([^)]*\\)\\s+DO\\s+NOTHING","");
            String schema=(base+"\n"+migration).replaceAll("(?m)--[^\\r\\n]*","").replace("timestamptz","timestamp with time zone");
            for(String statement:schema.split(";"))if(!statement.isBlank())jdbc.execute(statement);
            String iot=new String(getClass().getResourceAsStream("/db/migration/003_iot.sql").readAllBytes(),StandardCharsets.UTF_8).replace("timestamptz","timestamp with time zone").replaceAll("CREATE UNIQUE INDEX uk_device_mqtt_topic[^;]+;","");
            for(String statement:iot.split(";"))if(!statement.isBlank())jdbc.execute(statement);
            String installation=new String(getClass().getResourceAsStream("/db/migration/004_delivery_installation.sql").readAllBytes(),StandardCharsets.UTF_8).replace("timestamptz","timestamp with time zone").replaceAll("ALTER TABLE public.[a-z_]+ ENABLE ROW LEVEL SECURITY;","");
            for(String statement:installation.split(";"))if(!statement.isBlank())jdbc.execute(statement);
            String account=new String(getClass().getResourceAsStream("/db/migration/006_customer_account.sql").readAllBytes(),StandardCharsets.UTF_8)
                .replaceAll("(?s)CREATE FUNCTION.*?COMMIT;","COMMIT;").replaceAll("CREATE UNIQUE INDEX uk_customer_default_address[^;]+;","")
                .replaceAll("ALTER TABLE public.[a-z_]+ ENABLE ROW LEVEL SECURITY;","").replace("timestamptz","timestamp with time zone");
            for(String statement:account.split(";"))if(!statement.isBlank())jdbc.execute(statement);
        }
        jdbc.execute(new String(getClass().getResourceAsStream("/db/migration/007_tracking_warranty_variant_specs.sql").readAllBytes(),StandardCharsets.UTF_8).replace("timestamptz","timestamp with time zone"));
        String vnpay=new String(getClass().getResourceAsStream("/db/migration/009_vnpay_sandbox.sql").readAllBytes(),StandardCharsets.UTF_8);
        if(!postgres)vnpay=vnpay.replace("timestamptz","timestamp with time zone").replaceAll("ALTER TABLE public.[a-z_]+ ENABLE ROW LEVEL SECURITY;","").replaceAll("CREATE UNIQUE INDEX uk_(gateway_reference|vnpay_transaction)[^;]+;","");
        jdbc.execute(vnpay);
        jdbc.execute("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0");
        jdbc.update("INSERT INTO public.profiles(id,email,full_name) VALUES(?,?,?)",CUSTOMER,"customer@smartbox.test","Khách kiểm thử SmartBox");
        jdbc.update("INSERT INTO public.profiles(id,email,full_name) VALUES(?,?,?)",STAFF,"staff@smartbox.test","Nhân viên kiểm thử");
        product=UUID.randomUUID();variant=UUID.randomUUID();
        jdbc.update("INSERT INTO public.products(id,name,price,is_active,manager_id) VALUES(?,'SmartBox kiểm thử',1000000,true,?)",product,STAFF);
        jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,'M 85L','TEST-M',200000,10)",variant,product);
    }
    UUID order(int quantity){return UUID.fromString(orders.create(new CommerceRequests.CreateOrder("Địa chỉ kiểm thử",List.of(new CommerceRequests.Item(variant,quantity)))).get("id").toString());}
    int stock(){return jdbc.queryForObject("SELECT stock_quantity FROM public.product_variants WHERE id=?",Integer.class,variant);}
    long count(String table){return jdbc.queryForObject("SELECT count(*) FROM public."+table,Long.class);}
    void approve(UUID orderId){
        var list=jdbc.queryForList("SELECT id FROM public.approval_tickets WHERE order_id=? AND status='PENDING'",UUID.class,orderId);
        if(!list.isEmpty()){
            var prev=actors.actor.get();
            actors.actor.set(new CurrentActor.Actor(STAFF,"product_manager"));
            tickets.act(list.getFirst(),"APPROVE",null);
            if(prev!=null)actors.actor.set(prev);else actors.customer();
        }
    }
    CommerceRequests.Callback callback(UUID id,String key,String result){
        approve(id);
        var checkout=payments.checkout(id,key);UUID payment=UUID.fromString(checkout.get("paymentId").toString());BigDecimal amount=new BigDecimal(checkout.get("amount").toString());
        return new CommerceRequests.Callback(payment,id,amount,result,payments.sign(payment,id,amount,result));
    }
    UUID ticket(){return jdbc.queryForObject("SELECT id FROM public.approval_tickets",UUID.class);}
    @Autowired VariantInventoryService inventory;
    @Autowired DeviceWorkflowService devices;
    @Test void deliveryLinksSerialOwnerAndCommandTimesOutWithoutBroker(){
        UUID id=order(1);payments.callback(callback(id,"K","SUCCESS"));actors.staff();
        UUID device = devices.register(new DeviceWorkflowService.Registration("TEST-DELIVERY", variant, "delivery_box/delivery", "Thiết bị kiểm thử")).deviceId();
        UUID item=jdbc.queryForObject("SELECT id FROM public.order_items WHERE order_id=?",UUID.class,id);
        assertThrows(ConflictException.class,()->fulfillment.ship(id,new CommerceRequests.Shipment("Đơn vị kiểm thử","TEST-TRACKING")));
        assertThrows(ConflictException.class,()->fulfillment.delivered(id));
        assertThrows(ConflictException.class,()->fulfillment.assign(id,new CommerceRequests.DeviceAssignment(item,device)));
        // This test exercises post-acceptance activation/commands. Full installation evidence has its own suite.
        jdbc.update("UPDATE public.devices SET sold_order_item_id=?,owner_id=? WHERE id=?",item,CUSTOMER,device);
        jdbc.update("INSERT INTO public.delivery_installations(id,order_id,assigned_to,status,scheduled_at,completed_at,customer_accepted,created_at,updated_at) VALUES(?,?,?,'COMPLETED',?,?,true,?,?)",UUID.randomUUID(),id,STAFF,OrderWorkflowService.now(),OrderWorkflowService.now(),OrderWorkflowService.now(),OrderWorkflowService.now());
        jdbc.update("UPDATE public.orders SET status=CAST('completed' AS public.order_status) WHERE id=?",id);
        assertEquals("completed",orders.detail(id).get("status"));assertEquals(CUSTOMER,jdbc.queryForObject("SELECT owner_id FROM public.devices WHERE id=?",UUID.class,device));
        assertThrows(ForbiddenException.class,()->devices.activate(device));actors.customer();devices.activate(device);
        Object target=org.springframework.test.util.AopTestUtils.getTargetObject(devices);org.springframework.test.util.ReflectionTestUtils.setField(target,"mqttEnabled",true);
        try {
            jdbc.update("UPDATE public.devices SET status=CAST('online' AS public.device_status) WHERE id=?",device);
            UUID key=UUID.randomUUID();var control=new DeviceWorkflowService.Control("UNLOCK",key);devices.command(device,control);devices.command(device,control);assertEquals(1,count("device_commands"));
            assertThrows(ConflictException.class,()->devices.command(device,new DeviceWorkflowService.Control("LOCK",key)));
            jdbc.update("UPDATE public.device_commands SET expires_at=?",java.time.OffsetDateTime.now().minusMinutes(1));mqtt.expireCommands();assertEquals("TIMED_OUT",jdbc.queryForObject("SELECT status FROM public.device_commands",String.class));
        }finally{org.springframework.test.util.ReflectionTestUtils.setField(target,"mqttEnabled",false);}
    }
    @Test void manualVariantAdjustmentHasLedgerAndCannotConsumeReservedStock(){
        assertThrows(ForbiddenException.class,()->inventory.adjust(product,variant,1));
        order(2);actors.staff();inventory.adjust(product,variant,2);assertEquals(10,stock());
        assertThrows(ConflictException.class,()->inventory.adjust(product,variant,-11));assertEquals(10,stock());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.inventory_movements WHERE reason='MANUAL_ADJUSTMENT'",Integer.class));
        assertThrows(BadRequestException.class,()->inventory.adjust(product,variant,null));
    }
    @Test void mergesDuplicateItemsKeepsFirstPriceAndRollsBackInsufficientStock(){
        UUID id=order(2);assertEquals(8,stock());
        jdbc.update("UPDATE public.products SET price=5000000 WHERE id=?",product);
        orders.add(id,variant,3);assertEquals(5,stock());assertEquals(1,count("order_items"));
        assertEquals(0,new BigDecimal("1200000").compareTo(jdbc.queryForObject("SELECT unit_price FROM public.order_items",BigDecimal.class)));
        assertThrows(ConflictException.class,()->orders.add(id,variant,9));assertEquals(5,stock());
        orders.setQuantity(id,variant,2);assertEquals(8,stock());orders.remove(id,variant);assertEquals(10,stock());
    }
    @Test void createDuplicatesMergeAndValidationRollback(){
        orders.create(new CommerceRequests.CreateOrder("Địa chỉ",List.of(new CommerceRequests.Item(variant,1),new CommerceRequests.Item(variant,1))));
        assertEquals(1,count("order_items"));assertEquals(8,stock());
        assertThrows(BadRequestException.class,()->order(0));assertEquals(1,count("orders"));
        assertThrows(BadRequestException.class,()->orders.add(jdbc.queryForObject("SELECT id FROM public.orders",UUID.class),variant,99));assertEquals(8,stock());
    }
    @Test void checkoutIdempotencyCallbackSignatureAndTicketOutboxExactlyOnce(){
        UUID id=order(1);approve(id);var initial=payments.checkout(id,"KEY-1");assertEquals(initial,payments.checkout(id,"KEY-1"));assertEquals(1,count("payments"));
        var event=callback(id,"KEY-1","SUCCESS");
        assertThrows(UnauthorizedException.class,()->payments.callback(new CommerceRequests.Callback(event.paymentId(),id,event.amount(),"SUCCESS","00")));
        payments.callback(event);payments.callback(event);assertEquals(1,count("approval_tickets"));assertEquals(1,count("email_outbox"));
        assertEquals("confirmed",orders.detail(id).get("status"));
        assertThrows(ConflictException.class,()->orders.add(id,variant,1));
        assertThrows(ConflictException.class,()->payments.checkout(order(1),"KEY-1"));
    }
    @Test void failedPaymentAndRepeatedCancelReleaseOnce(){
        UUID id=order(2);var event=callback(id,"K","FAILED");payments.callback(event);payments.callback(event);assertEquals(10,stock());
        orders.cancel(id,"Lặp");assertEquals(10,stock());assertEquals("cancelled",orders.detail(id).get("status"));
    }
    @Test void expiredPaymentLateSuccessRequiresRefund(){
        UUID id=order(2);var event=callback(id,"K","SUCCESS");
        jdbc.update("UPDATE public.orders SET expires_at=? WHERE id=?",java.time.OffsetDateTime.now().minusHours(1),id);
        payments.expire(id);payments.callback(event);payments.callback(event);assertEquals(10,stock());assertEquals(1,count("refunds"));
        assertEquals("cancelled",orders.detail(id).get("status"));assertEquals("refund_required",jdbc.queryForObject("SELECT status FROM public.payments",String.class));
    }
    @Test void ticketReturnResubmitRejectAndRefund(){
        UUID id=order(1);UUID t=ticket();actors.po();
        tickets.act(t,"RETURN","Cần xác minh địa chỉ");actors.customer();tickets.act(t,"RESUBMIT","Địa chỉ đã xác nhận");
        assertThrows(ConflictException.class,()->orders.setQuantity(id,variant,2));actors.po();tickets.act(t,"REJECT","Không đáp ứng giao hàng");
        assertEquals(10,stock());assertEquals(0,count("refunds"));assertThrows(ConflictException.class,()->tickets.act(t,"APPROVE",null));
        assertEquals("cancelled",orders.detail(id).get("status"));
    }
    @Test void concurrentInventoryCannotOversell() throws Exception {
        jdbc.update("UPDATE public.product_variants SET stock_quantity=1 WHERE id=?",variant);
        try(var pool=Executors.newFixedThreadPool(2)){
            var barrier=new CyclicBarrier(2);Callable<Boolean> task=()->{barrier.await();try{order(1);return true;}catch(ConflictException ex){return false;}};
            var a=pool.submit(task);var b=pool.submit(task);assertNotEquals(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS));
        }
        assertEquals(0,stock());assertEquals(1,count("orders"));
    }
    @Test void outboxRetriesFiveTimesAndAdminResend(){
        UUID id=order(1);payments.callback(callback(id,"K","SUCCESS"));
        UUID mail=jdbc.queryForObject("SELECT id FROM public.email_outbox",UUID.class);
        for(int i=0;i<5;i++){
            jdbc.update("UPDATE public.email_outbox SET next_attempt_at=? WHERE id=?",java.time.OffsetDateTime.now().minusMinutes(1),mail);
            UUID token=UUID.randomUUID();assertEquals(1,outbox.claim(token,1800).size());outbox.failed(mail,token,"SMTP_OFFLINE",5);
        }
        assertEquals("FAILED",jdbc.queryForObject("SELECT status FROM public.email_outbox",String.class));
        actors.staff();outbox.resend(mail);assertEquals(0,jdbc.queryForObject("SELECT attempts FROM public.email_outbox",Integer.class));
    }
    @Test void crossOwnerAndCustomerReviewDenied(){
        UUID id=order(1);assertThrows(ForbiddenException.class,()->tickets.act(ticket(),"APPROVE",null));
        actors.actor.set(new CurrentActor.Actor(UUID.randomUUID(),"customer"));assertThrows(ForbiddenException.class,()->orders.detail(id));
    }
    @Test void amountMismatchAndMissingKeyCannotMutate(){
        UUID id=order(1);assertThrows(BadRequestException.class,()->payments.checkout(id,null));
        var event=callback(id,"K","SUCCESS");BigDecimal wrong=event.amount().add(BigDecimal.ONE);
        assertThrows(BadRequestException.class,()->payments.callback(new CommerceRequests.Callback(event.paymentId(),id,wrong,"SUCCESS",payments.sign(event.paymentId(),id,wrong,"SUCCESS"))));
        assertEquals("awaiting_payment",orders.detail(id).get("status"));assertEquals(0,count("email_outbox"));
    }
    @Test void paidTransactionRollbackAlsoRollsBackTicketHistoryAndOutbox(){
        UUID id=order(1);var event=callback(id,"K","SUCCESS");
        var target=org.springframework.test.util.AopTestUtils.getTargetObject(payments);
        org.springframework.test.util.ReflectionTestUtils.setField(target,"failAfterPaid",true);
        try{assertThrows(IllegalStateException.class,()->payments.callback(event));}finally{org.springframework.test.util.ReflectionTestUtils.setField(target,"failAfterPaid",false);}
        assertEquals("awaiting_payment",orders.detail(id).get("status"));assertEquals(0,count("email_outbox"));assertEquals(1,count("approval_tickets"));assertEquals(2,count("order_status_history"));
        assertEquals("pending",jdbc.queryForObject("SELECT status FROM public.payments",String.class));
    }
    @Test void concurrentCallbackAndTimeoutLeaveConsistentStockAndRefund() throws Exception {
        UUID id=order(1);var event=callback(id,"K","SUCCESS");
        jdbc.update("UPDATE public.orders SET expires_at=? WHERE id=?",java.time.OffsetDateTime.now().minusHours(1),id);
        jdbc.update("UPDATE public.payments SET expires_at=? WHERE id=?",java.time.OffsetDateTime.now().minusHours(1),event.paymentId());
        try(var pool=Executors.newFixedThreadPool(2)){
            var barrier=new CyclicBarrier(2);
            var callback=pool.submit(()->{barrier.await();payments.callback(event);return true;});
            var timeout=pool.submit(()->{barrier.await();payments.expire(id);return true;});
            assertTrue(callback.get(10,TimeUnit.SECONDS));assertTrue(timeout.get(10,TimeUnit.SECONDS));
        }
        assertEquals(10,stock());assertEquals("cancelled",orders.detail(id).get("status"));assertEquals(1,count("refunds"));assertEquals(1,count("approval_tickets"));
    }
    @Test void concurrentTicketReviewHasOnlyOneFinalDecision() throws Exception {
        UUID id=order(1);UUID ticket=ticket();
        try(var pool=Executors.newFixedThreadPool(2)){
            var barrier=new CyclicBarrier(2);java.util.function.Function<String,Callable<Boolean>> task=action->()->{actors.po();barrier.await();try{tickets.act(ticket,action,"Kiểm thử đồng thời");return true;}catch(ConflictException ex){return false;}finally{actors.actor.remove();}};
            var a=pool.submit(task.apply("APPROVE"));var b=pool.submit(task.apply("REJECT"));assertNotEquals(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS));
        }
        assertEquals(2,count("ticket_history"));
    }
    @Test void draftExpiryRestoresStockExactlyOnce(){
        UUID id=order(2);jdbc.update("UPDATE public.orders SET expires_at=? WHERE id=?",java.time.OffsetDateTime.now().minusHours(1),id);
        payments.expire(id);payments.expire(id);assertEquals(10,stock());assertEquals("cancelled",orders.detail(id).get("status"));
    }
    @Test void concurrentOutboxClaimAndResendRules(){
        UUID id=order(1);payments.callback(callback(id,"K","SUCCESS"));UUID first=UUID.randomUUID(),second=UUID.randomUUID();
        // Lease ownership is the subject of this test; make eligibility explicit instead of relying on clock precision.
        jdbc.update("UPDATE public.email_outbox SET next_attempt_at=?",java.time.OffsetDateTime.now().minusMinutes(1));
        assertEquals(1,outbox.claim(first,1800).size());assertEquals(0,outbox.claim(second,1800).size());
        UUID mail=jdbc.queryForObject("SELECT id FROM public.email_outbox",UUID.class);outbox.sent(mail,second);assertEquals("PENDING",jdbc.queryForObject("SELECT status FROM public.email_outbox",String.class));
        actors.staff();assertThrows(ConflictException.class,()->outbox.resend(mail));outbox.sent(mail,first);assertEquals("SENT",jdbc.queryForObject("SELECT status FROM public.email_outbox",String.class));
    }
    @Test void reportCollectsValidationErrorsAndExportsNumericXlsx() throws Exception {
        actors.staff();var error=assertThrows(ReportParamsException.class,()->reports.data(Map.of("toDate","10/10/2026","customerId","bad")));assertEquals(3,error.getErrors().size());
        var report=new RevenueReportService.Report(java.time.LocalDate.of(2026,10,1),java.time.LocalDate.of(2026,10,2),List.of(new RevenueReportService.Day(java.time.LocalDate.of(2026,10,1),1,new BigDecimal("1200000")),new RevenueReportService.Day(java.time.LocalDate.of(2026,10,2),0,BigDecimal.ZERO)),new BigDecimal("1200000"),BigDecimal.ZERO);
        try(var workbook=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(reports.export(report,"XLSX")))){boolean numericRevenue=false;for(var row:workbook.getSheetAt(0))for(var cell:row)if(cell.getCellType()==org.apache.poi.ss.usermodel.CellType.NUMERIC&&cell.getNumericCellValue()==1200000)numericRevenue=true;assertTrue(numericRevenue,"Revenue must remain numeric in Jasper XLSX");}
        var bytes=reports.export(report,"PDF");var reader=new com.lowagie.text.pdf.PdfReader(bytes);assertEquals(1,reader.getNumberOfPages());reader.close();
        java.nio.file.Files.createDirectories(java.nio.file.Path.of("build/audit"));java.nio.file.Files.write(java.nio.file.Path.of("build/audit/revenue-test.pdf"),bytes);

    }
    @Test void reportUsesVietnamMidnightAndIncludesZeroDays(){
        boolean postgres=jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Boolean>) c->c.getMetaData().getDatabaseProductName().equals("PostgreSQL"));org.junit.jupiter.api.Assumptions.assumeTrue(postgres,"Time-zone SQL is verified on PostgreSQL");
        UUID id=order(1);payments.callback(callback(id,"K","SUCCESS"));
        jdbc.update("UPDATE public.orders SET paid_at=? WHERE id=?",java.time.OffsetDateTime.parse("2026-10-01T23:30:00Z"),id);
        actors.staff();var report=reports.data(Map.of("fromDate","2026-10-01","toDate","2026-10-03"));
        assertEquals(3,report.days().size());assertEquals(0,report.days().get(0).orders());assertEquals(1,report.days().get(1).orders());assertEquals(0,report.days().get(2).orders());
    }
    @Test void mqttTelemetryCreatesOnePackageAndAckMustMatchDevice(){
        UUID device=UUID.randomUUID();jdbc.update("INSERT INTO public.devices(id,product_id,owner_id,serial_number,mqtt_topic_id) VALUES(?,?,?,'TEST-DEVICE','delivery_box/test')",device,product,CUSTOMER);
        byte[] payload="{\"package_detected\":true,\"weight\":1.5,\"distance_cm\":10}".getBytes(StandardCharsets.UTF_8);
        mqtt.message("delivery_box/test/sensor",payload);mqtt.message("delivery_box/test/sensor",payload);
        assertEquals(1,count("delivery_packages"));assertEquals(1,count("notifications"));assertEquals(1,count("push_outbox"));
        // Base model has no loadcell: weight must not be presented as a real measurement.
        assertNull(jdbc.queryForObject("SELECT weight_kg FROM public.delivery_packages",Double.class));
        mqtt.message("delivery_box/test/sensor","{\"package_detected\":false}".getBytes(StandardCharsets.UTF_8));assertEquals("COLLECTED",jdbc.queryForObject("SELECT status FROM public.delivery_packages",String.class));
        UUID command=UUID.randomUUID();jdbc.update("INSERT INTO public.device_commands(id,device_id,command,requested_by,status,expires_at,next_attempt_at) VALUES(?,?,'UNLOCK',?,'SENT',?,?)",command,device,CUSTOMER,java.time.OffsetDateTime.now().plusMinutes(1),java.time.OffsetDateTime.now());
        mqtt.message("delivery_box/test/ack",("{\"commandId\":\""+command+"\",\"result\":\"SUCCESS\"}").getBytes(StandardCharsets.UTF_8));assertEquals("ACKNOWLEDGED",jdbc.queryForObject("SELECT status FROM public.device_commands",String.class));
    }
}
