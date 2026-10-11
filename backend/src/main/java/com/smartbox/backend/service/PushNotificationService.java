package com.smartbox.backend.service;

import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Service @RequiredArgsConstructor
public class PushNotificationService {
    private final CommerceRepository db;
    private final CurrentActor actors;
    @Transactional
    public Map<String,Object> register(String token) {
        if(token==null||token.isBlank()||token.length()>4096)throw new BadRequestException("INVALID_PUSH_TOKEN");
        UUID user=actors.get().id();
        db.update("INSERT INTO public.push_tokens(id,user_id,token,created_at) VALUES(?,?,?,?) ON CONFLICT(token) DO NOTHING",UUID.randomUUID(),user,token,now());
        var row=db.one("SELECT id,user_id FROM public.push_tokens WHERE token=?",token);
        actors.get().requireOwner(uuid(row.get("user_id")));return Map.of("id",row.get("id"));
    }
    @Transactional public void remove(UUID id){db.update("DELETE FROM public.push_tokens WHERE id=? AND user_id=?",id,actors.get().id());}
    @Transactional(readOnly=true) public List<Map<String,Object>> list(int page,int size){if(page<0||size<1||size>100)throw new BadRequestException("VALIDATION_ERROR");return db.list("SELECT * FROM public.notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?",actors.get().id(),size,(long)page*size);}
    @Transactional public void read(UUID id){if(db.update("UPDATE public.notifications SET is_read=true WHERE id=? AND user_id=?",id,actors.get().id())!=1)throw new ResourceNotFoundException("Thông báo","id",id);}
    @Transactional public void preference(String event,boolean enabled){if(!Set.of("PACKAGE_DETECTED").contains(event))throw new BadRequestException("INVALID_NOTIFICATION_EVENT");db.update("INSERT INTO public.notification_preferences VALUES(?,?,?) ON CONFLICT(user_id,event_type) DO UPDATE SET enabled=EXCLUDED.enabled",actors.get().id(),event,enabled);}
    @Transactional public List<Map<String,Object>> claim(UUID token) {
        var rows=db.list("SELECT p.*,n.user_id,n.title,n.body,n.device_id FROM public.push_outbox p JOIN public.notifications n ON n.id=p.notification_id WHERE p.status='PENDING' AND p.next_attempt_at<=? AND (p.claimed_until IS NULL OR p.claimed_until<?) ORDER BY p.id LIMIT 50 FOR UPDATE OF p SKIP LOCKED",now(),now());
        for(var row:rows)db.update("UPDATE public.push_outbox SET claim_token=?,claimed_until=? WHERE id=?",token,now().plusMinutes(30),row.get("id"));return rows;
    }
    @Transactional public List<Map<String,Object>> tokens(UUID user,UUID notification){return db.list("SELECT t.id,t.token FROM public.push_tokens t WHERE t.user_id=? AND NOT EXISTS(SELECT 1 FROM public.push_deliveries d WHERE d.token_id=t.id AND d.notification_id=?)",user,notification);}
    @Transactional public void tokenSent(UUID notification,UUID token){db.update("INSERT INTO public.push_deliveries VALUES(?,?,?) ON CONFLICT(notification_id,token_id) DO NOTHING",notification,token,now());}
    @Transactional public void finish(UUID id,UUID token,String error) {
        var rows=db.list("SELECT attempts FROM public.push_outbox WHERE id=? AND claim_token=? FOR UPDATE",id,token);if(rows.isEmpty())return;
        int attempts=((Number)rows.getFirst().get("attempts")).intValue()+1;
        db.update("UPDATE public.push_outbox SET status=?,attempts=?,next_attempt_at=?,last_error=?,claim_token=NULL,claimed_until=NULL WHERE id=? AND claim_token=?",error==null?"SENT":attempts>=5?"FAILED":"PENDING",attempts,now().plusSeconds(60L*(1L<<(attempts-1))),error,id,token);
    }
}
