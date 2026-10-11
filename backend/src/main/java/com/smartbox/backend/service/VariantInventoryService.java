package com.smartbox.backend.service;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.now;

@Service
@RequiredArgsConstructor
public class VariantInventoryService {
    private final CommerceRepository db;
    private final CurrentActor actors;
    @Transactional
    public Map<String,Object> adjust(UUID product,UUID variant,Integer delta) {
        var actor=actors.get();actor.requireRoles("super_admin","product_manager");
        if(delta==null||delta==0||delta < -100000||delta>100000)throw new BadRequestException("INVALID_STOCK_DELTA");
        db.one("SELECT id FROM public.product_variants WHERE id=? AND product_id=? FOR UPDATE",variant,product);
        if(db.update("UPDATE public.product_variants SET stock_quantity=stock_quantity+? WHERE id=? AND CAST(stock_quantity AS bigint)+?>=0 AND CAST(stock_quantity AS bigint)+?<=2147483647",delta,variant,delta,delta)!=1)
            throw new ConflictException("INSUFFICIENT_STOCK_OR_LIMIT");
        db.update("INSERT INTO public.inventory_movements VALUES(?,?,NULL,?,?,?,?)",UUID.randomUUID(),variant,delta,"MANUAL_ADJUSTMENT",actor.id(),now());
        db.audit(actor.id(),"STOCK_ADJUSTED","product_variants",variant,Integer.toString(delta));
        return db.one("SELECT id,product_id,stock_quantity FROM public.product_variants WHERE id=?",variant);
    }
}

