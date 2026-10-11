package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.repository.CommerceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Service
@RequiredArgsConstructor
public class MqttDeviceService {
    private final CommerceRepository db;
    private final ObjectMapper json;
    @Transactional
    public void message(String topic,byte[] bytes) {
        if(bytes.length>16384)throw new IllegalArgumentException("MQTT_PAYLOAD_TOO_LARGE");
        int split=topic.lastIndexOf('/');if(split<0)return;
        String base=topic.substring(0,split),kind=topic.substring(split+1);
        var devices=db.list("SELECT * FROM public.devices WHERE mqtt_topic_id=? FOR UPDATE",base);
        if(devices.isEmpty())return;var device=devices.getFirst();UUID id=uuid(device.get("id"));
        Map<String,Object> data;
        try{data=json.readValue(bytes,new TypeReference<>(){});}catch(Exception ex){throw new IllegalArgumentException("INVALID_MQTT_JSON",ex);}
        if("ack".equals(kind)) {
            UUID command=uuid(data.get("commandId"));
            if(command==null || !Set.of("SUCCESS","FAILED").contains(Objects.toString(data.get("result"),"")))throw new IllegalArgumentException("INVALID_ACK");
            // Broker ACL binds device topic; ACK cannot acknowledge another device's command.
            db.update("UPDATE public.device_commands SET status=?,ack_at=? WHERE id=? AND device_id=? AND status='SENT' AND expires_at>?",
                "SUCCESS".equals(data.get("result"))?"ACKNOWLEDGED":"FAILED",now(),command,id,now());
            return;
        }
        if(!Set.of("status","sensor").contains(kind))return;
        db.update("UPDATE public.devices SET status=CAST('online' AS public.device_status),last_seen_at=? WHERE id=?",now(),id);
        if("status".equals(kind)) {
            String door=Objects.toString(data.get("door"),null),lock=Objects.toString(data.get("lock"),null);
            if(door!=null&&!Set.of("open","closed").contains(door))throw new IllegalArgumentException("INVALID_DOOR_STATE");
            if(lock!=null&&!Set.of("locked","unlocked").contains(lock))throw new IllegalArgumentException("INVALID_LOCK_STATE");
            db.update("UPDATE public.devices SET door_status=COALESCE(?,door_status),lock_status=COALESCE(?,lock_status) WHERE id=?",door,lock,id);
        } else {
            Boolean detected=data.get("package_detected") instanceof Boolean b?b:null;
            Double weight=number(data.get("weight")),distance=number(data.get("distance_cm"));
            boolean weightEnabled=Boolean.TRUE.equals(db.one("SELECT has_weight_sensor FROM public.products WHERE id=?",device.get("product_id")).get("has_weight_sensor"));
            if(!weightEnabled)weight=null;
            db.update("INSERT INTO public.sensor_readings VALUES(?,?,?,?,?,CAST(? AS jsonb),?)",UUID.randomUUID(),id,weight,distance,device.get("door_status"),new String(bytes,StandardCharsets.UTF_8),now());
            db.update("UPDATE public.devices SET package_detected=COALESCE(?,package_detected),weight_kg=COALESCE(?,weight_kg) WHERE id=?",detected,weight,id);
            if(Boolean.TRUE.equals(detected)&&!Boolean.TRUE.equals(device.get("package_detected"))) {
                db.update("INSERT INTO public.delivery_packages(id,device_id,weight_kg,detected_at,status) VALUES(?,?,?,?,'DELIVERED')",UUID.randomUUID(),id,weight,now());
                notifyPackage(device,weight);
            } else if(Boolean.FALSE.equals(detected)&&Boolean.TRUE.equals(device.get("package_detected")))
                db.update("UPDATE public.delivery_packages SET status='COLLECTED',collected_at=? WHERE device_id=? AND status='DELIVERED'",now(),id);
        }
        db.update("INSERT INTO public.device_events(id,device_id,event_type,payload,created_at) VALUES(?,?,?,CAST(? AS jsonb),?)",UUID.randomUUID(),id,"MQTT_"+kind.toUpperCase(Locale.ROOT),new String(bytes,StandardCharsets.UTF_8),now());
    }
    private Double number(Object value) {
        if(value==null)return null;
        if(!(value instanceof Number n)||!Double.isFinite(n.doubleValue())||n.doubleValue()<0)throw new IllegalArgumentException("INVALID_SENSOR_VALUE");
        return n.doubleValue();
    }
    private void notifyPackage(Map<String,Object> device,Double weight) {
        UUID user=uuid(device.get("owner_id"));if(user==null)return;
        if(!db.list("SELECT user_id FROM public.notification_preferences WHERE user_id=? AND event_type='PACKAGE_DETECTED' AND enabled=false",user).isEmpty())return;
        UUID notification=UUID.randomUUID();String body=weight==null?"SmartBox vừa nhận được bưu kiện":"SmartBox vừa nhận được bưu kiện "+weight+" kg";
        db.update("INSERT INTO public.notifications(id,user_id,device_id,type,title,body) VALUES(?,?,?,'PACKAGE_DETECTED',?,?)",notification,user,device.get("id"),"Bạn có bưu kiện mới",body);
        db.update("INSERT INTO public.push_outbox(id,notification_id,next_attempt_at) VALUES(?,?,?)",UUID.randomUUID(),notification,now());
    }
    @Transactional
    public Map<String,Object> claim(UUID command) {
        var rows=db.list("SELECT c.*,d.mqtt_topic_id FROM public.device_commands c JOIN public.devices d ON d.id=c.device_id WHERE c.id=? FOR UPDATE OF c",command);
        if(rows.isEmpty())return null;var row=rows.getFirst();String status=row.get("status").toString();
        if(!Set.of("PENDING","SENT").contains(status))return null;
        if(time(row.get("expires_at")).isBefore(now())||((Number)row.get("attempts")).intValue()>=3) {
            db.update("UPDATE public.device_commands SET status='TIMED_OUT',last_error='DEVICE_ACK_TIMEOUT' WHERE id=?",command);return null;
        }
        if(time(row.get("next_attempt_at")).isAfter(now()))return null;
        db.update("UPDATE public.device_commands SET status='SENT',attempts=attempts+1,claimed_at=?,next_attempt_at=? WHERE id=?",now(),now().plusSeconds(3),command);
        return row;
    }
    @Transactional
    public void expireCommands() {db.update("UPDATE public.device_commands SET status='TIMED_OUT',last_error='DEVICE_ACK_TIMEOUT' WHERE status IN('PENDING','SENT') AND expires_at<=?",now());}
    @Transactional
    public void publishFailed(UUID command) {db.update("UPDATE public.device_commands SET last_error='MQTT_PUBLISH_FAILED' WHERE id=? AND status='SENT'",command);}
    @Transactional
    public void markOffline(int seconds) {db.update("UPDATE public.devices SET status=CAST('offline' AS public.device_status) WHERE status=CAST('online' AS public.device_status) AND last_seen_at<?",now().minusSeconds(seconds));}
}
