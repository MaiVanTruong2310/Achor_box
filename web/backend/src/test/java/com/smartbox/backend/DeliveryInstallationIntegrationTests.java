package com.smartbox.backend;

import com.smartbox.backend.dto.request.commerce.DeliveryInstallationRequests.*;
import com.smartbox.backend.exception.*;
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
import org.springframework.test.context.TestPropertySource;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@TestPropertySource(properties="smartbox.mqtt.enabled=true")
class DeliveryInstallationIntegrationTests extends CommerceIntegrationTests {
    static final UUID TECH=UUID.fromString("20000000-0000-0000-0000-000000000001");
    static final UUID TECH2=UUID.fromString("20000000-0000-0000-0000-000000000002");
    @Autowired DeliveryInstallationService jobs;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
    @Autowired AcceptanceWarrantyService warranties;
    @Autowired OrderTrackingService tracking;
    @Autowired InstallationDashboardService backlog;
    @Test void testBacklogSummary() {
        actors.staff();
        var s = backlog.summary();
        org.junit.jupiter.api.Assertions.assertNotNull(s);
    }
    @Test void acceptanceIssuesWarrantyFromSnapshotOnceAndActivationDoesNotMoveDates(){
        UUID order=confirmedOrder(),job=job(order);UUID device=installed(job,order);
        jdbc.update("UPDATE public.product_variants SET warranty_months=24 WHERE id=?",variant);
        String version=version(job);UUID key=UUID.randomUUID();jobs.progress(job,"ACCEPT",new Acceptance(true,null),version,key);jobs.progress(job,"ACCEPT",new Acceptance(true,null),version,key);
        assertEquals(1,count("warranties"));assertEquals(12,jdbc.queryForObject("SELECT duration_months FROM public.warranties",Integer.class));
        var accepted=jdbc.queryForObject("SELECT completed_at FROM public.delivery_installations WHERE id=?",java.time.OffsetDateTime.class,job).atZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        assertEquals(accepted,jdbc.queryForObject("SELECT start_date FROM public.warranties",java.time.LocalDate.class));assertEquals(accepted.plusMonths(12).minusDays(1),jdbc.queryForObject("SELECT end_date FROM public.warranties",java.time.LocalDate.class));
        actors.customer();devices.activate(device);devices.activate(device);assertEquals(accepted,jdbc.queryForObject("SELECT start_date FROM public.warranties",java.time.LocalDate.class));assertEquals(1L,warranties.mine(0,20).get("totalElements"));
        actors.actor.set(new CurrentActor.Actor(STAFF,"customer"));assertEquals(0L,warranties.mine(0,20).get("totalElements"));
    }
    @Test void conflictingLegacyWarrantyRollsBackAcceptanceAndOrderCompletion(){
        UUID order=confirmedOrder(),job=job(order),device=installed(job,order);UUID item=jdbc.queryForObject("SELECT id FROM public.order_items WHERE order_id=?",UUID.class,order);
        jdbc.update("INSERT INTO public.warranties(id,order_item_id,device_id,start_date,end_date) VALUES(?,?,?,?,?)",UUID.randomUUID(),item,device,java.time.LocalDate.now(),java.time.LocalDate.now().plusYears(1));
        assertThrows(ConflictException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(true,null),version(job),UUID.randomUUID()));
        assertEquals("INSTALLED",jobs.detail(job).get("status"));assertEquals("confirmed",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order));assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.email_outbox WHERE template='INSTALLATION_COMPLETED'",Integer.class));
    }
    @Test void acceptanceIssuesSeparateWarrantyForEveryActualSerialInMultiQuantityItem(){
        actors.customer();UUID order=order(2);payments.callback(callback(order,"two-serials","SUCCESS"));UUID job=job(order);
        UUID first=device(false),second=device(false);tech();step(job,"START",new Note(null));UUID item=jdbc.queryForObject("SELECT id FROM public.order_items WHERE order_id=?",UUID.class,order);
        for(UUID device:List.of(first,second))jobs.serial(job,new Serial(item,jdbc.queryForObject("SELECT serial_number FROM public.devices WHERE id=?",String.class,device)),version(job),UUID.randomUUID());step(job,"DELIVER",new Note(null));
        for(UUID device:List.of(first,second)){mqtt.message(topic(device)+"/status",bytes(Map.of("door","closed","lock","locked")));lockTest(job,device);}step(job,"INSTALL",new Installation("Lắp hai thiết bị"));step(job,"ACCEPT",new Acceptance(true,null));
        assertEquals(2,count("warranties"));assertEquals(2,jdbc.queryForObject("SELECT count(DISTINCT device_id) FROM public.warranties WHERE order_item_id=?",Integer.class,item));actors.customer();assertEquals(2L,warranties.mine(0,20).get("totalElements"));
    }
    @Test void timelineAggregatesThreeSourcesAndFiltersPrivateNotesByScope(){
        UUID order=confirmedOrder(),job=job(order);tech();step(job,"START",new Note(null));step(job,"FAIL",new Failure("Ghi chú nội bộ"));
        actors.staff();var staff=(List<Map<String,Object>>)tracking.timeline(order).get("events");assertTrue(staff.stream().anyMatch(e->"Ghi chú nội bộ".equals(e.get("reason"))));
        actors.customer();var events=(List<Map<String,Object>>)tracking.timeline(order).get("events");assertEquals(Set.of("ORDER","PO_TICKET","DELIVERY_INSTALLATION"),events.stream().map(e->e.get("source").toString()).collect(java.util.stream.Collectors.toSet()));assertTrue(events.stream().noneMatch(e->e.containsKey("reason")));assertEquals(events,tracking.timeline(order).get("events"));
        actors.actor.set(new CurrentActor.Actor(TECH2,"technician"));assertThrows(ForbiddenException.class,()->tracking.timeline(order));tech();assertNotNull(tracking.timeline(order));actors.actor.set(new CurrentActor.Actor(STAFF,"customer"));assertThrows(ForbiddenException.class,()->tracking.timeline(order));assertEquals(0,count("warranties"));
    }
    @Test void backlogCountsAreScopedAndOverdueIsNotDoubleCounted(){
        UUID order=confirmedOrder(),job=job(order);tech();step(job,"START",new Note(null));jdbc.update("UPDATE public.delivery_installations SET scheduled_at=? WHERE id=?",now().minusDays(1),job);
        actors.customer();UUID second=order(1);payments.callback(callback(second,"second-backlog","SUCCESS"));
        actors.customer();UUID third=order(1);actors.staff();var counts=(Map<?,?>)backlog.summary().get("counts");assertEquals(1L,counts.get("unassigned"));assertEquals(1L,counts.get("pendingApproval"));assertEquals(1L,counts.get("overdue"));assertEquals(3L,counts.get("totalOutstanding"));
        tech();counts=(Map<?,?>)backlog.summary().get("counts");assertEquals(0L,counts.get("unassigned"));assertEquals(1L,counts.get("totalOutstanding"));actors.actor.set(new CurrentActor.Actor(TECH2,"technician"));assertEquals(0L,((Map<?,?>)backlog.summary().get("counts")).get("totalOutstanding"));actors.customer();assertThrows(ForbiddenException.class,()->backlog.summary());
    }
    @Test void proVariantOverridesBaseParentForRealSensorIngestionAndAcceptance(){
        jdbc.update("UPDATE public.product_variants SET model_tier='PRO',has_weight_sensor=true WHERE id=?",variant);
        UUID order=confirmedOrder(),job=job(order),device=delivered(job,order,false);lockTest(job,device);step(job,"INSTALL",new Installation("Lắp Pro"));assertEquals(false,jobs.checks(job).get("ready"));
        UUID tare=send(job,device,"TARE");ack(device,tare);observedWeight(device,tare,0);observedWeight(device,tare,0.5);
        assertEquals(true,jobs.checks(job).get("ready"));step(job,"ACCEPT",new Acceptance(true,null));assertEquals(1,count("warranties"));
    }
    @BeforeEach void installationActors(){
        jdbc.update("INSERT INTO public.profiles(id,email,full_name,role) VALUES(?,?,?,'technician')",TECH,"tech@smartbox.test","Kỹ thuật kiểm thử");
        jdbc.update("INSERT INTO public.profiles(id,email,full_name,role) VALUES(?,?,?,'technician')",TECH2,"tech2@smartbox.test","Kỹ thuật khác");
        jdbc.update("UPDATE public.profiles SET role='super_admin' WHERE id=?",STAFF);
    }
    void tech(){actors.actor.set(new CurrentActor.Actor(TECH,"technician"));}
    UUID confirmedOrder(){actors.customer();UUID id=order(1);payments.callback(callback(id,UUID.randomUUID().toString(),"SUCCESS"));actors.staff();return id;}
    UUID job(UUID order){actors.staff();return UUID.fromString(jobs.assign(order,new Assignment(TECH,now().plusDays(1),null),UUID.randomUUID()).get("id").toString());}
    OffsetDateTime now(){return OrderWorkflowService.now();}
    String version(UUID id){return jobs.detail(id).get("version").toString();}
    void step(UUID id,String action,Object body){jobs.progress(id,action,body,version(id),UUID.randomUUID());}
    UUID device(boolean pro){jdbc.update("UPDATE public.products SET has_weight_sensor=? WHERE id=?",pro,product);actors.staff();return UUID.fromString(devices.register(new DeviceWorkflowService.Registration("INSTALL-"+UUID.randomUUID(),variant,"delivery_box/test-"+UUID.randomUUID(),"Thiết bị kiểm thử")).get("deviceId").toString());}
    UUID delivered(UUID job,UUID order,boolean pro){
        UUID device=device(pro);tech();step(job,"START",new Note(null));
        UUID item=jdbc.queryForObject("SELECT id FROM public.order_items WHERE order_id=?",UUID.class,order);
        jobs.serial(job,new Serial(item,jdbc.queryForObject("SELECT serial_number FROM public.devices WHERE id=?",String.class,device)),version(job),UUID.randomUUID());
        step(job,"DELIVER",new Note(null));mqtt.message(topic(device)+"/status",bytes(Map.of("door","closed","lock","locked")));return device;
    }
    String topic(UUID device){return jdbc.queryForObject("SELECT mqtt_topic_id FROM public.devices WHERE id=?",String.class,device);}
    byte[] bytes(Object body){try{return json.writeValueAsBytes(body);}catch(Exception ex){throw new RuntimeException(ex);}}
    UUID send(UUID job,UUID device,String action){
        UUID command=UUID.fromString(jobs.command(job,new Command(device,action),version(job),UUID.randomUUID()).get("commandId").toString());
        // The test publisher is synchronous. Avoid a sub-microsecond H2 timestamp rounding race at claim().
        jdbc.update("UPDATE public.device_commands SET next_attempt_at=? WHERE id=?",now().minusSeconds(1),command);
        return command;
    }
    void ack(UUID device,UUID command){assertNotNull(mqtt.claim(command));mqtt.message(topic(device)+"/ack",bytes(Map.of("commandId",command.toString(),"result","SUCCESS")));}
    void observedWeight(UUID device,UUID tare,double weight){
        // The physical test scenario is baseline THEN load; synchronous H2 fixtures may receive the same clock tick.
        var previous=new HashSet<>(jdbc.queryForList("SELECT id FROM public.sensor_readings WHERE device_id=?",UUID.class,device));
        mqtt.message(topic(device)+"/sensor",bytes(weight==0?Map.of("commandId",tare.toString(),"weight",weight):Map.of("weight",weight)));
        var commandTime=jdbc.queryForObject("SELECT created_at FROM public.device_commands WHERE id=?",OffsetDateTime.class,tare);
        for(UUID id:jdbc.queryForList("SELECT id FROM public.sensor_readings WHERE device_id=?",UUID.class,device))
            if(!previous.contains(id))jdbc.update("UPDATE public.sensor_readings SET received_at=? WHERE id=?",commandTime.plusNanos(weight==0?1000000:2000000),id);
    }
    void lockTest(UUID job,UUID device){
        for(String action:List.of("UNLOCK","LOCK")){UUID command=send(job,device,action);ack(device,command);mqtt.message(topic(device)+"/status",bytes(Map.of("commandId",command.toString(),"door","closed","lock",action.equals("LOCK")?"locked":"unlocked")));}
    }
    UUID installed(UUID job,UUID order){UUID device=delivered(job,order,false);lockTest(job,device);step(job,"INSTALL",new Installation("Lắp đặt tại vị trí đã thống nhất"));return device;}

    @Test void assignmentRequiresApprovalActiveTechnicianAndOneJob(){
        UUID order=confirmedOrder();Assignment request=new Assignment(TECH,now().plusDays(1),null);UUID key=UUID.randomUUID();var original=jobs.assign(order,request,key);
        assertEquals(original.get("id"),jobs.assign(order,request,key).get("id"));assertEquals(1,count("delivery_installations"));
        assertThrows(ConflictException.class,()->jobs.assign(order,request,UUID.randomUUID()));
        assertThrows(ConflictException.class,()->jobs.assign(order,new Assignment(TECH2,request.scheduledAt(),null),key));
        UUID pending=order(1);actors.staff();assertThrows(ConflictException.class,()->jobs.assign(pending,request,UUID.randomUUID()));
        assertEquals(1,((List<?>)jobs.list(false,0,20,null).get("content")).size());
    }
    @Test void onlyAssignedTechnicianCanReadOrProgressAndCustomerProjectionOmitsNotes(){
        UUID order=confirmedOrder(),job=job(order);tech();assertEquals(1,((List<?>)jobs.list(true,0,20,null).get("content")).size());
        actors.actor.set(new CurrentActor.Actor(TECH2,"technician"));assertEquals(0,((List<?>)jobs.list(true,0,20,null).get("content")).size());
        assertThrows(ForbiddenException.class,()->jobs.detail(job));assertThrows(ForbiddenException.class,()->jobs.progress(job,"START",new Note(null),"0",UUID.randomUUID()));
        assertThrows(ForbiddenException.class,()->jobs.list(false,0,20,null));
        actors.customer();var projection=jobs.forOrder(order);assertFalse(projection.containsKey("customer"));assertFalse(projection.containsKey("installationNote"));assertFalse(projection.containsKey("history"));assertThrows(ForbiddenException.class,()->jobs.checks(job));
    }
    @Test void deliveryAndInstallationDoNotCompleteOrderOrPermitLegacyBypass(){
        UUID order=confirmedOrder(),job=job(order);UUID device=delivered(job,order,false);
        assertEquals("confirmed",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order));
        step(job,"INSTALL",new Installation("Đã lắp"));assertEquals("confirmed",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order));
        assertThrows(ConflictException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(true,null),version(job),UUID.randomUUID()));
        actors.staff();assertThrows(ConflictException.class,()->fulfillment.delivered(order));assertThrows(ConflictException.class,()->orders.transition(jdbc.queryForMap("SELECT * FROM public.orders WHERE id=?",order),"completed",STAFF.toString(),"bypass"));
        actors.customer();assertThrows(ConflictException.class,()->devices.activate(device));
    }
    @Test void baseAcceptanceNeedsBothAckAndCorrelatedTelemetryAndIsIdempotent(){
        UUID order=confirmedOrder(),job=job(order);UUID device=installed(job,order);assertEquals(true,jobs.checks(job).get("ready"));
        String version=version(job);UUID key=UUID.randomUUID();Acceptance request=new Acceptance(true,"Khách đã xác nhận");
        jobs.progress(job,"ACCEPT",request,version,key);jobs.progress(job,"ACCEPT",request,version,key);
        assertEquals("completed",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.email_outbox WHERE template='INSTALLATION_COMPLETED'",Integer.class));
        jdbc.update("UPDATE public.devices SET last_seen_at=? WHERE id=?",now().minusDays(1),device);
        assertEquals(true,jobs.checks(job).get("recorded"));assertEquals(true,jobs.checks(job).get("ready"));
        assertThrows(ConflictException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(true,"Khác"),version,key));
        actors.customer();devices.activate(device);assertNotNull(jobs.forOrder(order).get("completedAt"));
    }
    @Test void ackWithoutMatchingTelemetryCannotPass(){
        UUID order=confirmedOrder(),job=job(order),device=delivered(job,order,false);UUID unlock=send(job,device,"UNLOCK");ack(device,unlock);
        mqtt.message(topic(device)+"/status",bytes(Map.of("commandId",UUID.randomUUID().toString(),"door","closed","lock","unlocked")));
        UUID lock=send(job,device,"LOCK");ack(device,lock);mqtt.message(topic(device)+"/status",bytes(Map.of("door","closed","lock","locked")));
        step(job,"INSTALL",new Installation("Đã lắp"));assertEquals(false,jobs.checks(job).get("ready"));
        assertThrows(ConflictException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(true,null),version(job),UUID.randomUUID()));
    }
    @Test void correlatedStatusMayArriveBeforeAckWithoutBeingRejected(){
        UUID order=confirmedOrder(),job=job(order),device=delivered(job,order,false);
        for(String action:List.of("UNLOCK","LOCK")){
            UUID command=send(job,device,action);assertNotNull(mqtt.claim(command));
            mqtt.message(topic(device)+"/status",bytes(Map.of("commandId",command.toString(),"door","closed","lock",action.equals("LOCK")?"locked":"unlocked")));
            mqtt.message(topic(device)+"/ack",bytes(Map.of("commandId",command.toString(),"result","SUCCESS")));
        }
        step(job,"INSTALL",new Installation("Đã lắp"));assertEquals(true,jobs.checks(job).get("ready"));
    }
    @Test void proRequiresTareAndObservedWeightChangeFromSensor(){
        UUID order=confirmedOrder(),job=job(order),device=delivered(job,order,true);lockTest(job,device);step(job,"INSTALL",new Installation("Đã lắp Pro"));
        assertEquals(false,jobs.checks(job).get("ready"));UUID tare=send(job,device,"TARE");ack(device,tare);
        observedWeight(device,tare,0);assertEquals(false,jobs.checks(job).get("ready"));
        observedWeight(device,tare,0.25);assertEquals(true,jobs.checks(job).get("ready"));
        jobs.progress(job,"ACCEPT",new Acceptance(true,null),version(job),UUID.randomUUID());assertEquals("completed",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order));
    }
    @Test void failReassignPreservesPhysicalHistoryAndInvalidatesOldEvidence(){
        UUID order=confirmedOrder(),job=job(order);installed(job,order);String old=version(job);
        jobs.progress(job,"FAIL",new Failure("Cần điều chỉnh vị trí"),old,UUID.randomUUID());actors.staff();
        assertThrows(ConflictException.class,()->orders.cancel(order,"Không trả kho sau khi đã giao"));
        jobs.progress(job,"REASSIGN",new Reassignment(TECH2,now().plusDays(2),"Đổi lịch"),version(job),UUID.randomUUID());
        assertEquals(1,count("delivery_installations"));assertEquals(2,jobs.detail(job).get("attempt"));assertNotNull(jobs.detail(job).get("deliveredAt"));assertEquals(9,stock());
        tech();assertThrows(ForbiddenException.class,()->jobs.detail(job));actors.actor.set(new CurrentActor.Actor(TECH2,"technician"));step(job,"START",new Note(null));step(job,"DELIVER",new Note(null));step(job,"INSTALL",new Installation("Kiểm tra lại"));
        assertEquals(false,jobs.checks(job).get("ready"));assertThrows(ConflictException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(true,null),version(job),UUID.randomUUID()));
    }
    @Test void missingSerialWrongOwnerAndStaleVersionAreRejected(){
        UUID order=confirmedOrder(),job=job(order),device=device(false);tech();step(job,"START",new Note(null));step(job,"DELIVER",new Note(null));
        assertThrows(ConflictException.class,()->jobs.progress(job,"INSTALL",new Installation("Đã lắp"),version(job),UUID.randomUUID()));
        UUID item=jdbc.queryForObject("SELECT id FROM public.order_items WHERE order_id=?",UUID.class,order);jdbc.update("UPDATE public.devices SET owner_id=? WHERE id=?",STAFF,device);
        var serial=new Serial(item,jdbc.queryForObject("SELECT serial_number FROM public.devices WHERE id=?",String.class,device));
        assertThrows(ConflictException.class,()->jobs.serial(job,serial,version(job),UUID.randomUUID()));
        assertThrows(ConflictException.class,()->jobs.progress(job,"FAIL",new Failure("Sai version"),"0",UUID.randomUUID()));
    }
    @Test void acceptanceAndFailRaceHasOnlyOneDecision() throws Exception {
        UUID order=confirmedOrder(),job=job(order);installed(job,order);String version=version(job);CountDownLatch start=new CountDownLatch(1);ExecutorService pool=Executors.newFixedThreadPool(2);
        try{
            var a=pool.submit(()->{tech();start.await();try{jobs.progress(job,"ACCEPT",new Acceptance(true,null),version,UUID.randomUUID());return true;}catch(ConflictException ex){return false;}});
            var b=pool.submit(()->{actors.staff();start.await();try{jobs.progress(job,"FAIL",new Failure("Điều chỉnh"),version,UUID.randomUUID());return true;}catch(ConflictException ex){return false;}});
            start.countDown();assertEquals(1,(a.get(10,TimeUnit.SECONDS)?1:0)+(b.get(10,TimeUnit.SECONDS)?1:0));
            String jobStatus=jdbc.queryForObject("SELECT status FROM public.delivery_installations WHERE id=?",String.class,job),orderStatus=jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order);
            assertEquals(jobStatus.equals("COMPLETED")?"completed":"confirmed",orderStatus);
        }finally{pool.shutdownNow();}
    }
    @Test void acceptanceRollsBackJobOrderHistoryAndOutboxTogether(){
        UUID order=confirmedOrder(),job=job(order);installed(job,order);
        jdbc.execute("ALTER TABLE public.email_outbox ADD CONSTRAINT test_completion_failure CHECK(template<>'INSTALLATION_COMPLETED')");
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(true,null),version(job),UUID.randomUUID()));
        assertEquals("INSTALLED",jdbc.queryForObject("SELECT status FROM public.delivery_installations WHERE id=?",String.class,job));assertEquals("confirmed",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.order_status_history WHERE to_status='completed'",Integer.class));
        assertEquals(0,count("warranties"));
    }
    @Test void staleConnectionCustomerRefusalAndUnsupportedBaseTareCannotComplete(){
        UUID order=confirmedOrder(),job=job(order),device=installed(job,order);
        assertThrows(BadRequestException.class,()->send(job,device,"TARE"));
        assertThrows(ConflictException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(false,null),version(job),UUID.randomUUID()));
        jdbc.update("UPDATE public.devices SET last_seen_at=? WHERE id=?",now().minusMinutes(5),device);
        assertEquals(false,jobs.checks(job).get("ready"));assertThrows(ConflictException.class,()->jobs.progress(job,"ACCEPT",new Acceptance(true,null),version(job),UUID.randomUUID()));
    }
    @Test void cancellingBeforeStartTerminatesAssignedJobAndPreventsFurtherWork(){
        UUID order=confirmedOrder(),job=job(order);actors.staff();orders.cancel(order,"Khách yêu cầu hủy trước giao");assertEquals("FAILED",jobs.detail(job).get("status"));assertEquals(10,stock());
        tech();assertThrows(ConflictException.class,()->jobs.progress(job,"START",new Note(null),version(job),UUID.randomUUID()));
    }
    @Test void superAdminCanApproveAndRejectCompletionWhileTechnicianForbidden() {
        UUID order = confirmedOrder(), job = job(order);
        installed(job, order);
        tech();
        jobs.submitCompletion(job, new CompletionSubmission(List.of("https://res.cloudinary.com/test.png"), "Nộp ảnh"), version(job), UUID.randomUUID());
        assertEquals("WAITING_PO_CONFIRMATION", jdbc.queryForObject("SELECT status FROM public.delivery_installations WHERE id=?", String.class, job));

        tech();
        assertThrows(ForbiddenException.class, () -> jobs.approveCompletion(job, new PoApprovalRequest("Duyệt"), version(job), UUID.randomUUID()));
        assertThrows(ForbiddenException.class, () -> jobs.rejectCompletion(job, new RejectionRequest("Từ chối"), version(job), UUID.randomUUID()));

        actors.customer();
        assertThrows(ForbiddenException.class, () -> jobs.approveCompletion(job, new PoApprovalRequest("Duyệt"), version(job), UUID.randomUUID()));
        assertThrows(ForbiddenException.class, () -> jobs.rejectCompletion(job, new RejectionRequest("Từ chối"), version(job), UUID.randomUUID()));

        actors.actor.set(new CurrentActor.Actor(STAFF, "super_admin"));
        jobs.rejectCompletion(job, new RejectionRequest("Ảnh mờ, chụp lại"), version(job), UUID.randomUUID());
        assertEquals("IN_PROGRESS", jdbc.queryForObject("SELECT status FROM public.delivery_installations WHERE id=?", String.class, job));

        tech();
        jobs.submitCompletion(job, new CompletionSubmission(List.of("https://res.cloudinary.com/test2.png"), "Nộp lại"), version(job), UUID.randomUUID());
        assertEquals("WAITING_PO_CONFIRMATION", jdbc.queryForObject("SELECT status FROM public.delivery_installations WHERE id=?", String.class, job));

        actors.actor.set(new CurrentActor.Actor(STAFF, "super_admin"));
        jobs.approveCompletion(job, new PoApprovalRequest("Super Admin duyệt đạt chuẩn"), version(job), UUID.randomUUID());
        assertEquals("COMPLETED", jdbc.queryForObject("SELECT status FROM public.delivery_installations WHERE id=?", String.class, job));
        assertEquals("completed", jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?", String.class, order));
    }
}
