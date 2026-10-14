package com.smartbox.backend.service;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.now;

@Service @RequiredArgsConstructor
public class InstallationDashboardService {
    private final CommerceRepository db;private final CurrentActor actors;
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> summary(){
        var actor=actors.get();actor.requireRoles("super_admin","support_agent","technician");boolean mine="technician".equals(actor.role());
        String where=" FROM public.delivery_installations j JOIN public.orders o ON o.id=j.order_id WHERE o.status='confirmed'"+(mine?" AND j.assigned_to=?":"");Object[] args=mine?new Object[]{actor.id()}:new Object[]{};
        var counts=new LinkedHashMap<String,Object>();for(String status:List.of("ASSIGNED","IN_PROGRESS","DELIVERED","INSTALLED","FAILED"))counts.put(status,count("SELECT count(*) AS n"+where+" AND j.status='"+status+"'",args));
        counts.put("unassigned",mine?0L:count("SELECT count(*) AS n FROM public.orders o JOIN public.approval_tickets t ON t.order_id=o.id WHERE o.workflow_version=2 AND o.status='confirmed' AND t.status='APPROVED' AND NOT EXISTS(SELECT 1 FROM public.delivery_installations j WHERE j.order_id=o.id)"));
        counts.put("pendingApproval",mine?0L:count("SELECT count(*) AS n FROM public.approval_tickets t JOIN public.orders o ON o.id=t.order_id WHERE o.workflow_version=2 AND o.status='paid' AND t.status='PENDING'"));
        var overdueArgs=new ArrayList<Object>(Arrays.asList(args));overdueArgs.add(now());counts.put("overdue",count("SELECT count(*) AS n"+where+" AND j.status IN('ASSIGNED','IN_PROGRESS','DELIVERED','INSTALLED','FAILED') AND j.scheduled_at<?",overdueArgs.toArray()));
        long total=List.of("ASSIGNED","IN_PROGRESS","DELIVERED","INSTALLED","FAILED","unassigned","pendingApproval").stream().mapToLong(k->((Number)counts.get(k)).longValue()).sum();counts.put("totalOutstanding",total);
        var attention=db.list("SELECT j.id,j.order_id AS \"orderId\",j.status,j.scheduled_at AS \"scheduledAt\""+where+" AND j.status IN('ASSIGNED','IN_PROGRESS','DELIVERED','INSTALLED','FAILED') ORDER BY j.scheduled_at,j.id LIMIT 10",args);
        return Map.of("scope",mine?"MY_JOBS":"ALL_JOBS","counts",counts,"attention",attention,"observedAt",now().toString());
    }
    private long count(String sql,Object...args){return ((Number)db.one(sql,args).get("n")).longValue();}
}
