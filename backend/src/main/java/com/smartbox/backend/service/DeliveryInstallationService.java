package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.request.DeliveryInstallationRequests.*;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

/** One employee delivers and installs. All progress is assignment-scoped; completion is evidence-gated. */
@Service
@RequiredArgsConstructor
public class DeliveryInstallationService {
    private static final Set<String> STATUSES=Set.of("ASSIGNED","IN_PROGRESS","DELIVERED","INSTALLED","COMPLETED","FAILED");
    private final CommerceRepository db;
    private final CurrentActor actors;
    private final OrderWorkflowService orders;
    private final OutboxService outbox;
    private final CustomerAccountService customers;
    private final AcceptanceWarrantyService warranties;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;
    @Value("${smartbox.mqtt.enabled:false}") private boolean mqttEnabled;
    @Value("${smartbox.installation.freshness-seconds:90}") private int freshnessSeconds;
    @Value("${smartbox.installation.weight-min-delta-kg:0.05}") private double weightDelta;
    @Value("${smartbox.installation.tare-tolerance-kg:0.05}") private double tareTolerance;

    private boolean manager(){return Set.of("super_admin","support_agent").contains(actors.get().role());}
    private void manage(){actors.get().requireRoles("super_admin","support_agent");}
    private void assigned(Map<String,Object> job){
        actors.get().requireRoles("technician");
        if(!actors.get().id().equals(uuid(job.get("assigned_to"))))throw new ForbiddenException("JOB_NOT_ASSIGNED");
    }
    private void read(Map<String,Object> job){
        if(manager())return;
        if("customer".equals(actors.get().role())){actors.get().requireOwner(uuid(db.order(uuid(job.get("order_id")),false).get("user_id")));return;}
        assigned(job);
    }
    private Map<String,Object> locked(UUID id){
        UUID order=uuid(db.one("SELECT order_id FROM public.delivery_installations WHERE id=?",id).get("order_id"));
        db.order(order,true); // Global lock order: order -> job -> devices -> commands.
        return db.one("SELECT * FROM public.delivery_installations WHERE id=? FOR UPDATE",id);
    }
    private void confirmed(Map<String,Object> job){
        var order=db.order(uuid(job.get("order_id")),false);orders.requireNewWorkflow(order);
        if(!"confirmed".equals(order.get("status")))throw new ConflictException("ORDER_NOT_CONFIRMED");
    }
    private void technician(UUID id){
        var profile=db.one("SELECT role,is_locked FROM public.profiles WHERE id=?",id);
        if(!"technician".equals(Objects.toString(profile.get("role")))||Boolean.TRUE.equals(profile.get("is_locked")))throw new BadRequestException("INVALID_TECHNICIAN");
    }
    private void schedule(OffsetDateTime date){if(date==null||!date.isAfter(now()))throw new BadRequestException("INVALID_INSTALLATION_SCHEDULE");}
    private String text(String value,boolean required){
        if(value!=null&&value.length()>2000||required&&(value==null||value.isBlank()))throw new BadRequestException("INSTALLATION_REASON_OR_NOTE_REQUIRED");
        return value==null?null:value.trim();
    }
    private long version(String header){
        if(header==null||header.isBlank())throw new BadRequestException("IF_MATCH_REQUIRED");
        try{String v=header.replaceAll("^\"|\"$","");if(!v.matches("[0-9]+"))throw new NumberFormatException();return Long.parseLong(v);}
        catch(NumberFormatException ex){throw new BadRequestException("INVALID_JOB_VERSION");}
    }
    private void current(Map<String,Object> job,long version){if(((Number)job.get("version")).longValue()!=version)throw new ConflictException("STALE_JOB_VERSION");}
    private void stage(Map<String,Object> job,String...allowed){if(!Set.of(allowed).contains(job.get("status")))throw new ConflictException("INVALID_JOB_TRANSITION");}
    private String fingerprint(UUID target,String action,Object request,Object version){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(Arrays.asList(target,action,request,version))));}
        catch(Exception ex){throw new IllegalStateException("INSTALLATION_REQUEST_SERIALIZATION_FAILED",ex);}
    }
    private Map<String,Object> cached(UUID key,String hash){
        if(key==null)throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED");
        var rows=db.list("SELECT fingerprint,response FROM public.delivery_installation_requests WHERE actor_id=? AND request_key=?",actors.get().id(),key);
        if(rows.isEmpty())return null;
        if(!hash.equals(rows.getFirst().get("fingerprint")))throw new ConflictException("IDEMPOTENCY_KEY_REUSED");
        try{return json.readValue(rows.getFirst().get("response").toString(),new TypeReference<>(){});}
        catch(Exception ex){throw new IllegalStateException("INSTALLATION_RESPONSE_SERIALIZATION_FAILED",ex);}
    }
    private Map<String,Object> remember(UUID key,String hash,UUID job,Map<String,Object> result){
        try{db.update("INSERT INTO public.delivery_installation_requests(actor_id,request_key,job_id,fingerprint,response,created_at) VALUES(?,?,?,?,?,?)",actors.get().id(),key,job,hash,json.writeValueAsString(result),now());}
        catch(com.fasterxml.jackson.core.JsonProcessingException ex){throw new IllegalStateException("INSTALLATION_RESPONSE_SERIALIZATION_FAILED",ex);}
        return result;
    }
    private void history(Map<String,Object> job,String action,String from,String reason){
        UUID id=uuid(job.get("id"));
        db.update("INSERT INTO public.delivery_installation_history VALUES(?,?,?,?,?,?,?,?,?,?)",UUID.randomUUID(),id,actors.get().id(),action,from,job.get("status"),reason,job.get("attempt"),job.get("version"),now());
        db.audit(actors.get().id(),"INSTALLATION_"+action,"delivery_installations",id,reason);
    }
    private Map<String,Object> bump(Map<String,Object> job,String action,String reason){
        db.update("UPDATE public.delivery_installations SET version=version+1,updated_at=? WHERE id=?",now(),job.get("id"));
        var updated=db.one("SELECT * FROM public.delivery_installations WHERE id=?",job.get("id"));
        history(updated,action,job.get("status").toString(),reason);return updated;
    }

    @Transactional
    public Map<String,Object> assign(UUID orderId,Assignment request,UUID key){
        manage();var order=db.order(orderId,true);String hash=fingerprint(orderId,"ASSIGN",request,null);var replay=cached(key,hash);if(replay!=null)return replay;
        orders.requireNewWorkflow(order);
        if(!"confirmed".equals(order.get("status"))||db.list("SELECT id FROM public.approval_tickets WHERE order_id=? AND status='APPROVED'",orderId).isEmpty())throw new ConflictException("ORDER_NOT_CONFIRMED");
        if(!db.list("SELECT id FROM public.delivery_installations WHERE order_id=?",orderId).isEmpty())throw new ConflictException("JOB_ALREADY_EXISTS");
        technician(request.assignedTo());schedule(request.scheduledAt());text(request.installationNote(),false);
        UUID id=UUID.randomUUID();
        db.update("INSERT INTO public.delivery_installations(id,order_id,assigned_to,status,scheduled_at,installation_note,created_at,updated_at) VALUES(?,?,?,'ASSIGNED',?,?,?,?)",id,orderId,request.assignedTo(),request.scheduledAt(),request.installationNote(),now(),now());
        var job=db.one("SELECT * FROM public.delivery_installations WHERE id=?",id);history(job,"ASSIGN",null,"Phân công nhân viên và lịch hẹn");
        outbox.enqueue("INSTALLATION_SCHEDULED",orderId,"installation-assigned:"+id,"Lịch giao và lắp đặt: "+request.scheduledAt());
        return remember(key,hash,id,view(job));
    }

    @Transactional
    public Map<String,Object> progress(UUID id,String action,Object request,String header,UUID key){
        var job=locked(id);
        if("REASSIGN".equals(action))manage();else if(!("FAIL".equals(action)&&manager()))assigned(job);
        long expected=version(header);String hash=fingerprint(id,action,request,expected);var replay=cached(key,hash);if(replay!=null)return replay;
        current(job,expected);confirmed(job);UUID orderId=uuid(job.get("order_id"));String reason=null;
        switch(action){
            case "START" -> {
                stage(job,"ASSIGNED");
                db.update("UPDATE public.delivery_installations SET status='IN_PROGRESS',started_at=? WHERE id=?",now(),id);
                if(db.update("UPDATE public.shipments SET status='SHIPPED' WHERE order_id=? AND status='PREPARING'",orderId)==1)shipmentHistory(orderId,"SHIPPED");
            }
            case "DELIVER" -> {
                stage(job,"IN_PROGRESS");reason=text(((Note)request).note(),false);
                db.update("UPDATE public.delivery_installations SET status='DELIVERED',delivered_at=COALESCE(delivered_at,?) WHERE id=?",now(),id);
                if(db.update("UPDATE public.shipments SET status='DELIVERED',delivered_at=COALESCE(delivered_at,?) WHERE order_id=? AND status<>'DELIVERED'",now(),orderId)==1)shipmentHistory(orderId,"DELIVERED");
                linkOwners(job);
                outbox.enqueue("DEVICE_DELIVERED",orderId,"installation-delivered:"+id+":"+job.get("attempt"),"Đã giao thiết bị; đang thực hiện lắp đặt và kiểm tra");
            }
            case "INSTALL" -> {
                stage(job,"DELIVERED");reason=text(((Installation)request).installationNote(),true);
                if(!serialComplete(job))throw new ConflictException("DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE");
                linkOwners(job);
                db.update("UPDATE public.delivery_installations SET status='INSTALLED',installed_at=COALESCE(installed_at,?),installation_note=? WHERE id=?",now(),reason,id);
            }
            case "ACCEPT" -> {
                stage(job,"INSTALLED");var acceptance=(Acceptance)request;reason=text(acceptance.note(),false);
                if(!Boolean.TRUE.equals(acceptance.customerAccepted()))throw new ConflictException("CUSTOMER_ACCEPTANCE_REQUIRED");
                // Device locks prevent telemetry/sale/owner changes between validation and commit.
                var result=check(job,true);
                if(!Boolean.TRUE.equals(result.get("ready")))throw new ConflictException("ACCEPTANCE_CHECKS_FAILED: "+String.join(", ",((List<?>)result.get("failedChecks")).stream().map(String::valueOf).toList()));
                var evidence=new LinkedHashMap<>(result);evidence.put("validatedVersion",job.get("version"));evidence.put("version",expected+1);
                var accepted=now();
                db.update("UPDATE public.delivery_installations SET status='COMPLETED',completed_at=?,customer_accepted=true,acceptance_evidence=? WHERE id=?",accepted,serialize(evidence),id);
                warranties.issue(id,accepted);
                orders.transition(db.order(orderId,false),"completed",actors.get().id().toString(),"INSTALLATION_ACCEPTED");
                outbox.enqueue("INSTALLATION_COMPLETED",orderId,"installation-completed:"+id,"Thiết bị đã được giao, lắp đặt và nghiệm thu");
            }
            case "FAIL" -> {
                stage(job,"ASSIGNED","IN_PROGRESS","DELIVERED","INSTALLED");reason=text(((Failure)request).failureReason(),true);
                db.update("UPDATE public.delivery_installations SET status='FAILED',failure_reason=? WHERE id=?",reason,id);
                outbox.enqueue("INSTALLATION_DELAYED",orderId,"installation-failed:"+id+":"+job.get("attempt"),"Lịch giao/lắp cần điều chỉnh. Bộ phận hỗ trợ sẽ liên hệ.");
            }
            case "REASSIGN" -> {
                stage(job,"ASSIGNED","FAILED");var r=(Reassignment)request;reason=text(r.reason(),true);technician(r.assignedTo());schedule(r.scheduledAt());
                // Preserve physical handover/install timestamps and history; invalidate technical evidence through attempt/start.
                db.update("UPDATE public.delivery_installations SET assigned_to=?,scheduled_at=?,status='ASSIGNED',attempt=attempt+1,started_at=NULL,failure_reason=NULL,customer_accepted=false WHERE id=?",r.assignedTo(),r.scheduledAt(),id);
                outbox.enqueue("INSTALLATION_SCHEDULED",orderId,"installation-rescheduled:"+id+":"+(((Number)job.get("attempt")).intValue()+1),"Lịch giao và lắp đặt mới: "+r.scheduledAt());
            }
            default -> throw new BadRequestException("INVALID_INSTALLATION_ACTION");
        }
        return remember(key,hash,id,view(bump(job,action,reason)));
    }

    @Transactional
    public Map<String,Object> serial(UUID id,Serial request,String header,UUID key){
        var job=locked(id);assigned(job);long expected=version(header);String hash=fingerprint(id,"SERIAL",request,expected);var replay=cached(key,hash);if(replay!=null)return replay;
        current(job,expected);confirmed(job);stage(job,"IN_PROGRESS","DELIVERED");
        if(request.serialNumber()==null||request.serialNumber().isBlank()||request.serialNumber().length()>100)throw new BadRequestException("INVALID_SERIAL_NUMBER");
        var item=db.one("SELECT * FROM public.order_items WHERE id=? AND order_id=?",request.orderItemId(),job.get("order_id"));
        var matches=db.list("SELECT id FROM public.devices WHERE serial_number=?",request.serialNumber().trim());
        if(matches.isEmpty())throw new ResourceNotFoundException("Thiết bị","serial",request.serialNumber());
        if(matches.size()!=1)throw new ConflictException("SERIAL_NOT_UNIQUE");
        var device=db.one("SELECT * FROM public.devices WHERE id=? FOR UPDATE",matches.getFirst().get("id"));UUID deviceId=uuid(device.get("id"));
        UUID owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));
        if(!uuid(item.get("product_id")).equals(uuid(device.get("product_id")))||!uuid(item.get("variant_id")).equals(uuid(device.get("product_variant_id"))))throw new ConflictException("DEVICE_VARIANT_MISMATCH");
        if(device.get("owner_id")!=null&&!owner.equals(uuid(device.get("owner_id")))||device.get("sold_order_item_id")!=null&&!request.orderItemId().equals(uuid(device.get("sold_order_item_id"))))throw new ConflictException("DEVICE_ALREADY_SOLD");
        var existing=db.list("SELECT order_item_id FROM public.delivery_installation_devices WHERE job_id=? AND device_id=?",id,deviceId);
        if(!existing.isEmpty()){
            if(!request.orderItemId().equals(uuid(existing.getFirst().get("order_item_id"))))throw new ConflictException("DEVICE_VARIANT_MISMATCH");
            return remember(key,hash,id,view(job));
        }
        long count=((Number)db.one("SELECT count(*) AS total FROM public.devices WHERE sold_order_item_id=?",request.orderItemId()).get("total")).longValue();
        if(device.get("sold_order_item_id")==null&&count>=((Number)item.get("quantity")).longValue())throw new ConflictException("ITEM_DEVICE_LIMIT");
        boolean weight=Boolean.TRUE.equals(db.one("SELECT COALESCE(v.has_weight_sensor,p.has_weight_sensor) AS has_weight_sensor FROM public.products p LEFT JOIN public.product_variants v ON v.id=? WHERE p.id=?",item.get("variant_id"),item.get("product_id")).get("has_weight_sensor"));
        db.update("UPDATE public.devices SET sold_order_item_id=? WHERE id=?",request.orderItemId(),deviceId);
        if("DELIVERED".equals(job.get("status")))db.update("UPDATE public.devices SET owner_id=? WHERE id=?",owner,deviceId);
        db.update("INSERT INTO public.delivery_installation_devices VALUES(?,?,?,?,?)",id,deviceId,request.orderItemId(),weight,now());
        return remember(key,hash,id,view(bump(job,"LINK_SERIAL",request.serialNumber().trim())));
    }

    @Transactional
    public Map<String,Object> command(UUID id,Command request,String header,UUID key){
        var job=locked(id);assigned(job);long expected=version(header);String hash=fingerprint(id,"COMMAND",request,expected);var replay=cached(key,hash);if(replay!=null)return replay;
        current(job,expected);confirmed(job);stage(job,"DELIVERED","INSTALLED");
        if(!mqttEnabled)throw new AppException(503,"MQTT_NOT_CONFIGURED");
        if(!Set.of("LOCK","UNLOCK","TARE").contains(request.action()))throw new BadRequestException("INVALID_DEVICE_COMMAND");
        var binding=db.one("SELECT * FROM public.delivery_installation_devices WHERE job_id=? AND device_id=?",id,request.deviceId());
        var device=db.one("SELECT * FROM public.devices WHERE id=? FOR UPDATE",request.deviceId());
        var owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));
        var item=db.one("SELECT product_id,variant_id FROM public.order_items WHERE id=? AND order_id=?",binding.get("order_item_id"),job.get("order_id"));
        if(!uuid(binding.get("order_item_id")).equals(uuid(device.get("sold_order_item_id")))||!owner.equals(uuid(device.get("owner_id")))||!Objects.equals(uuid(item.get("product_id")),uuid(device.get("product_id")))||!Objects.equals(uuid(item.get("variant_id")),uuid(device.get("product_variant_id"))))throw new ConflictException("DEVICE_SALE_LINK_MISMATCH");
        if(!"online".equals(device.get("status"))||!fresh(time(device.get("last_seen_at")),time(job.get("started_at")))||device.get("mqtt_topic_id")==null)throw new ConflictException("DEVICE_OFFLINE");
        if("TARE".equals(request.action())&&!Boolean.TRUE.equals(binding.get("has_weight_sensor")))throw new BadRequestException("WEIGHT_SENSOR_NOT_SUPPORTED");
        if(((Number)db.one("SELECT count(*) AS total FROM public.device_commands WHERE device_id=? AND created_at>?",request.deviceId(),now().minusMinutes(1)).get("total")).longValue()>=20)throw new AppException(429,"DEVICE_COMMAND_RATE_LIMITED");
        UUID command=UUID.randomUUID();
        db.update("INSERT INTO public.device_commands(id,device_id,command,requested_by,status,request_key,expires_at,next_attempt_at) VALUES(?,?,?,?,'PENDING',?,?,?)",command,request.deviceId(),request.action(),actors.get().id(),key,now().plusSeconds(10),now());
        db.update("INSERT INTO public.delivery_installation_commands VALUES(?,?,?,?,?,?)",id,request.deviceId(),command,job.get("attempt"),now(),expected+1);
        events.publishEvent(new DeviceWorkflowService.CommandCreated(command));
        var updated=bump(job,"CHECK_"+request.action(),request.deviceId().toString());
        return remember(key,hash,id,Map.of("commandId",command.toString(),"status","PENDING","jobVersion",updated.get("version")));
    }

    private void linkOwners(Map<String,Object> job){
        UUID owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));
        for(var device:devices(job,true)){
            if(!uuid(device.get("order_item_id")).equals(uuid(device.get("sold_order_item_id")))||device.get("owner_id")!=null&&!owner.equals(uuid(device.get("owner_id"))))throw new ConflictException("DEVICE_SALE_LINK_MISMATCH");
            db.update("UPDATE public.devices SET owner_id=? WHERE id=?",owner,device.get("id"));
        }
    }
    private void shipmentHistory(UUID orderId,String status){
        var shipment=db.one("SELECT id FROM public.shipments WHERE order_id=?",orderId);
        db.update("INSERT INTO public.shipment_history VALUES(?,?,?,?,?)",UUID.randomUUID(),shipment.get("id"),status,actors.get().id(),now());
    }
    private List<Map<String,Object>> devices(Map<String,Object> job,boolean lock){
        var result=db.list("SELECT d.*,b.order_item_id,b.has_weight_sensor,b.linked_at,i.product_id AS sale_product_id,i.variant_id AS sale_variant_id FROM public.delivery_installation_devices b JOIN public.devices d ON d.id=b.device_id JOIN public.order_items i ON i.id=b.order_item_id WHERE b.job_id=? ORDER BY d.id",job.get("id"));
        if(lock)for(var row:result){var latest=db.one("SELECT * FROM public.devices WHERE id=? FOR UPDATE",row.get("id"));row.putAll(latest);}
        return result;
    }
    private boolean serialComplete(Map<String,Object> job){
        var items=db.list("SELECT i.id,i.quantity,count(b.device_id) AS linked FROM public.order_items i LEFT JOIN public.delivery_installation_devices b ON b.order_item_id=i.id AND b.job_id=? WHERE i.order_id=? GROUP BY i.id,i.quantity",job.get("id"),job.get("order_id"));
        return !items.isEmpty()&&items.stream().allMatch(i->((Number)i.get("quantity")).longValue()==((Number)i.get("linked")).longValue());
    }
    private boolean fresh(OffsetDateTime observed,OffsetDateTime since){
        OffsetDateTime instant=now();return observed!=null&&since!=null&&!observed.isBefore(since)&&!observed.isBefore(instant.minusSeconds(Math.max(1,freshnessSeconds)))&&!observed.isAfter(instant.plusSeconds(1));
    }
    private JsonNode payload(Object value){
        try{var node=json.readTree(value instanceof byte[] bytes?new String(bytes,StandardCharsets.UTF_8):Objects.toString(value,"{}"));return node.isTextual()?json.readTree(node.asText()):node;}
        catch(Exception ex){return json.createObjectNode();}
    }
    private String serialize(Object value){try{return json.writeValueAsString(value);}catch(com.fasterxml.jackson.core.JsonProcessingException ex){throw new IllegalStateException("INSTALLATION_EVIDENCE_SERIALIZATION_FAILED",ex);}}
    private Map<String,Object> acknowledged(Map<String,Object> job,UUID device,String action){
        var commands=db.list("SELECT c.* FROM public.delivery_installation_commands l JOIN public.device_commands c ON c.id=l.command_id AND c.device_id=l.device_id WHERE l.job_id=? AND l.attempt=? AND l.device_id=? AND c.command=? ORDER BY l.version DESC",job.get("id"),job.get("attempt"),device,action);
        if(commands.isEmpty())return null;var command=commands.getFirst();
        return "ACKNOWLEDGED".equals(command.get("status"))&&fresh(time(command.get("ack_at")),time(job.get("started_at")))?command:null;
    }
    private Map<String,Object> lockEvidence(Map<String,Object> job,UUID device,String action){
        var cmd=acknowledged(job,device,action);if(cmd==null)return Map.of("passed",false);
        for(var event:db.list("SELECT id,payload,created_at FROM public.device_events WHERE device_id=? AND event_type='MQTT_STATUS' AND created_at>=? ORDER BY created_at DESC",device,cmd.get("created_at"))){
            if(!fresh(time(event.get("created_at")),time(job.get("started_at"))))continue;var data=payload(event.get("payload"));
            if(!cmd.get("id").toString().equals(data.path("commandId").asText()))continue;
            if(("LOCK".equals(action)?"locked":"unlocked").equals(data.path("lock").asText())&&(!"LOCK".equals(action)||"closed".equals(data.path("door").asText())))return Map.of("passed",true,"commandId",cmd.get("id").toString(),"statusEventId",event.get("id").toString(),"observedAt",iso(event.get("created_at")));
        }
        return Map.of("passed",false);
    }
    private Map<String,Object> weightEvidence(Map<String,Object> job,UUID device){
        var cmd=acknowledged(job,device,"TARE");if(cmd==null)return Map.of("passed",false);Double baseline=null;UUID baselineId=null;
        for(var reading:db.list("SELECT id,weight_kg,payload,received_at FROM public.sensor_readings WHERE device_id=? AND received_at>=? ORDER BY received_at,id",device,cmd.get("created_at"))){
            if(!fresh(time(reading.get("received_at")),time(job.get("started_at")))||!(reading.get("weight_kg") instanceof Number number))continue;
            double weight=number.doubleValue();if(!Double.isFinite(weight)||weight<0)continue;
            if(baseline==null){if(cmd.get("id").toString().equals(payload(reading.get("payload")).path("commandId").asText())&&weight<=Math.max(0,tareTolerance)){baseline=weight;baselineId=uuid(reading.get("id"));}}
            else if(weight-baseline>=Math.max(0.001,weightDelta))return Map.of("passed",true,"commandId",cmd.get("id").toString(),"baselineReadingId",baselineId.toString(),"testReadingId",reading.get("id").toString(),"baselineKg",baseline,"testWeightKg",weight,"observedAt",iso(reading.get("received_at")));
        }
        return Map.of("passed",false);
    }
    private Map<String,Object> check(Map<String,Object> job,boolean lock){
        List<String> failures=new ArrayList<>();boolean count=serialComplete(job);if(!count)failures.add("DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE");
        if(!Set.of("DELIVERED","INSTALLED","COMPLETED").contains(job.get("status")))failures.add("JOB_NOT_DELIVERED");
        UUID owner=uuid(db.order(uuid(job.get("order_id")),false).get("user_id"));List<Map<String,Object>> results=new ArrayList<>();
        for(var device:devices(job,lock)){
            UUID deviceId=uuid(device.get("id"));boolean sale=Objects.equals(uuid(device.get("sold_order_item_id")),uuid(device.get("order_item_id")))&&Objects.equals(uuid(device.get("product_id")),uuid(device.get("sale_product_id")))&&Objects.equals(uuid(device.get("product_variant_id")),uuid(device.get("sale_variant_id")))&&owner.equals(uuid(device.get("owner_id")));
            boolean connection=mqttEnabled&&"online".equals(device.get("status"))&&device.get("mqtt_topic_id")!=null&&fresh(time(device.get("last_seen_at")),time(job.get("started_at")));
            var unlockProof=lockEvidence(job,deviceId,"UNLOCK");var lockProof=lockEvidence(job,deviceId,"LOCK");
            boolean unlock=Boolean.TRUE.equals(unlockProof.get("passed")),locked=Boolean.TRUE.equals(lockProof.get("passed"))&&"locked".equals(device.get("lock_status"))&&"closed".equals(device.get("door_status"));
            boolean weightRequired=Boolean.TRUE.equals(device.get("has_weight_sensor"));var weightProof=weightRequired?weightEvidence(job,deviceId):Map.of("applicable",false);boolean weight=!weightRequired||Boolean.TRUE.equals(weightProof.get("passed"));
            var checks=new LinkedHashMap<String,Object>();checks.put("serialOwner",sale);checks.put("connection",connection);checks.put("unlock",unlock);checks.put("lock",locked);checks.put("weight",weightRequired?weight:null);
            if(!sale)failures.add(deviceId+":DEVICE_SALE_LINK_MISMATCH");if(!connection)failures.add(deviceId+":MQTT_NOT_FRESH");if(!unlock)failures.add(deviceId+":UNLOCK_ACK_AND_TELEMETRY_REQUIRED");if(!locked)failures.add(deviceId+":LOCK_ACK_AND_TELEMETRY_REQUIRED");if(!weight)failures.add(deviceId+":WEIGHT_TEST_REQUIRED");
            var commands=db.list("SELECT c.id,c.command AS action,c.status,c.attempts,c.last_error AS \"lastError\",c.ack_at AS \"ackAt\",c.expires_at AS \"expiresAt\" FROM public.delivery_installation_commands l JOIN public.device_commands c ON c.id=l.command_id WHERE l.job_id=? AND l.attempt=? AND l.device_id=? ORDER BY c.created_at DESC,c.id DESC",job.get("id"),job.get("attempt"),deviceId).stream().map(this::wireRow).toList();
            results.add(Map.of("deviceId",deviceId.toString(),"serialNumber",device.get("serial_number"),"hasWeightSensor",weightRequired,"checks",checks,"commands",commands,"evidence",Map.of("unlock",unlockProof,"lock",lockProof,"weight",weightProof)));
        }
        return Map.of("jobId",job.get("id").toString(),"attempt",job.get("attempt"),"version",job.get("version"),"observedAt",now().toString(),"serialComplete",count,"ready",failures.isEmpty()&&!results.isEmpty(),"devices",results,"failedChecks",failures);
    }

    @Transactional(readOnly=true)
    public Map<String,Object> checks(UUID id){
        var job=db.one("SELECT * FROM public.delivery_installations WHERE id=?",id);if(!manager())assigned(job);
        if("COMPLETED".equals(job.get("status"))&&job.get("acceptance_evidence")!=null){
            try{Map<String,Object> record=json.readValue(job.get("acceptance_evidence").toString(),new TypeReference<>(){});record.put("recorded",true);record.put("acceptedAt",iso(job.get("completed_at")));return record;}
            catch(com.fasterxml.jackson.core.JsonProcessingException ex){throw new IllegalStateException("INSTALLATION_EVIDENCE_INVALID",ex);}
        }
        return check(job,false);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> detail(UUID id){var job=db.one("SELECT * FROM public.delivery_installations WHERE id=?",id);read(job);return view(job);}
    @Transactional(readOnly=true)
    public Map<String,Object> forOrder(UUID id){
        if("customer".equals(actors.get().role()))actors.get().requireOwner(uuid(db.order(id,false).get("user_id")));
        var job=db.one("SELECT * FROM public.delivery_installations WHERE order_id=?",id);read(job);return view(job);
    }
    private Map<String,Object> view(Map<String,Object> job){
        boolean customer="customer".equals(actors.get().role());var result=summary(job);
        if(customer)result.remove("assignedTo");
        result.put("orderStatus",db.order(uuid(job.get("order_id")),false).get("status").toString());
        for(String field:List.of("started_at","delivered_at","installed_at","completed_at"))result.put(camel(field),iso(job.get(field)));
        result.put("customerAccepted",job.get("customer_accepted"));
        if(!customer){
            result.put("installationNote",job.get("installation_note"));result.put("failureReason",job.get("failure_reason"));
            var order=db.order(uuid(job.get("order_id")),false);var profile=db.one("SELECT full_name,phone,email FROM public.profiles WHERE id=?",order.get("user_id"));
            var snapshot=customers.readSnapshot(order.get("shipping_address_snapshot"));
            var contact=new LinkedHashMap<String,Object>();contact.put("fullName",snapshot==null?profile.get("full_name"):snapshot.get("recipientName"));contact.put("phone",snapshot==null?profile.get("phone"):snapshot.get("phone"));contact.put("email",snapshot==null?profile.get("email"):snapshot.get("email"));contact.put("shippingAddress",order.get("shipping_address"));contact.put("installationNote",snapshot==null?null:snapshot.get("installationNote"));result.put("customer",contact);
            result.put("items",db.list("SELECT id,quantity,product_name_snapshot AS \"productName\",variant_name_snapshot AS \"variantName\",sku_snapshot AS sku FROM public.order_items WHERE order_id=? ORDER BY id",job.get("order_id")));
            result.put("history",db.list("SELECT actor_id AS \"actorId\",action,from_status AS \"fromStatus\",to_status AS \"toStatus\",reason,attempt,version,created_at AS \"createdAt\" FROM public.delivery_installation_history WHERE job_id=? ORDER BY created_at,id",job.get("id")).stream().map(this::wireRow).toList());
        }
        result.put("devices",devices(job,false).stream().map(d->Map.of("deviceId",d.get("id").toString(),"serialNumber",d.get("serial_number"),"orderItemId",d.get("order_item_id").toString(),"hasWeightSensor",d.get("has_weight_sensor"))).toList());
        return result;
    }
    private String camel(String field){var parts=field.split("_");StringBuilder result=new StringBuilder(parts[0]);for(int i=1;i<parts.length;i++)result.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));return result.toString();}
    private String iso(Object value){return value==null?null:time(value).toString();}
    private Map<String,Object> wireRow(Map<String,Object> row){var result=new LinkedHashMap<String,Object>();row.forEach((k,v)->result.put(k,v instanceof UUID?v.toString():v instanceof OffsetDateTime||v instanceof java.sql.Timestamp?iso(v):v));return result;}
    private Map<String,Object> summary(Map<String,Object> job){
        var result=new LinkedHashMap<String,Object>();for(String key:List.of("id","order_id","assigned_to","status","attempt","version"))result.put(camel(key),job.get(key) instanceof UUID?job.get(key).toString():job.get(key));
        for(String key:List.of("scheduled_at","created_at","updated_at"))result.put(camel(key),iso(job.get(key)));return result;
    }
    private void page(int page,int size){if(page<0||size<1||size>100)throw new BadRequestException("VALIDATION_ERROR");}
    @Transactional(readOnly=true)
    public Map<String,Object> list(boolean mine,int page,int size,String status){
        if(mine)actors.get().requireRoles("technician");else manage();page(page,size);if(status!=null&&!STATUSES.contains(status))throw new BadRequestException("INVALID_JOB_STATUS");
        String where=" WHERE 1=1";List<Object> args=new ArrayList<>();if(mine){where+=" AND assigned_to=?";args.add(actors.get().id());}if(status!=null){where+=" AND status=?";args.add(status);}
        long total=((Number)db.one("SELECT count(*) AS total FROM public.delivery_installations"+where,args.toArray()).get("total")).longValue();args.add(size);args.add((long)page*size);
        var content=db.list("SELECT * FROM public.delivery_installations"+where+" ORDER BY scheduled_at,id LIMIT ? OFFSET ?",args.toArray()).stream().map(this::summary).toList();
        return Map.of("content",content,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size);
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> technicians(){manage();return db.list("SELECT id,full_name AS \"fullName\" FROM public.profiles WHERE role='technician' AND (is_locked=false OR is_locked IS NULL) ORDER BY full_name,id").stream().map(this::wireRow).toList();}
    @Transactional(readOnly=true)
    public Map<String,Object> eligible(int page,int size){
        manage();page(page,size);String condition=" FROM public.orders o JOIN public.approval_tickets t ON t.order_id=o.id WHERE o.status='confirmed' AND o.workflow_version=2 AND t.status='APPROVED' AND NOT EXISTS(SELECT 1 FROM public.delivery_installations j WHERE j.order_id=o.id)";
        long total=((Number)db.one("SELECT count(*) AS total"+condition).get("total")).longValue();
        var rows=db.list("SELECT o.id,o.shipping_address AS \"shippingAddress\",o.created_at AS \"createdAt\""+condition+" ORDER BY o.created_at,o.id LIMIT ? OFFSET ?",size,(long)page*size).stream().map(this::wireRow).toList();
        return Map.of("content",rows,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size);
    }
}
