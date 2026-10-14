package com.smartbox.backend;

import com.smartbox.backend.config.DashboardExecutorConfig;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.ConcurrentDashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class PostgresDashboardTests {
    // Own disposable database; never loads backend/.env or touches the user's Supabase schema.
    @Container static final PostgreSQLContainer<?> DB=new PostgreSQLContainer<>("postgres:16-alpine");
    @Test void vietnamBoundariesVariantRankingAndAvailableStock() {
        var jdbc=new JdbcTemplate(new DriverManagerDataSource(DB.getJdbcUrl(),DB.getUsername(),DB.getPassword()));
        jdbc.execute("CREATE TABLE products(id uuid PRIMARY KEY,name text,is_active boolean)");
        jdbc.execute("CREATE TABLE product_variants(id uuid PRIMARY KEY,product_id uuid,sku text,is_active boolean,stock_quantity integer)");
        jdbc.execute("CREATE TABLE orders(id uuid PRIMARY KEY,status text,total numeric,paid_at timestamptz)");
        jdbc.execute("CREATE TABLE order_items(order_id uuid,product_id uuid,variant_id uuid,product_name_snapshot text,variant_name_snapshot text,sku_snapshot text,quantity integer)");
        UUID product=UUID.randomUUID(), inactive=UUID.randomUUID();
        UUID base=UUID.fromString("00000000-0000-0000-0000-000000000001"),pro=UUID.fromString("00000000-0000-0000-0000-000000000002");
        jdbc.update("INSERT INTO products VALUES(?,?,true),(?,?,false)",product,"SmartBox",inactive,"Archived");
        jdbc.update("INSERT INTO product_variants VALUES(?,?,?,true,0),(?,?,?,true,5),(?,?,?,false,1),(?,?,?,true,1)",base,product,"BASE",pro,product,"PRO",UUID.randomUUID(),product,"DISABLED",UUID.randomUUID(),inactive,"ARCHIVED");
        LocalDate date=LocalDate.of(2026,10,7);
        var start=date.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        add(jdbc,product,base,"paid",100,start,2);
        add(jdbc,product,pro,"completed",200,start.plusDays(1).minusNanos(1000),2);
        add(jdbc,product,pro,"confirmed",400,start.minusDays(29),3);
        add(jdbc,product,base,"paid",800,start.minusDays(29).minusNanos(1000),40);
        add(jdbc,product,base,"paid",1600,start.plusDays(1),80);
        add(jdbc,product,base,"cancelled",3200,start.plusHours(2),90);
        add(jdbc,product,base,"awaiting_payment",6400,start.plusHours(3),90);
        var actors=new CurrentActor(){@Override public Actor get(){return new Actor(UUID.randomUUID(),"accountant");}};
        var executor=new DashboardExecutorConfig().executor(4,50);
        try {
            var service=new ConcurrentDashboardService(new CommerceRepository(jdbc),actors,executor,1500);
            var result=service.dashboard(date);
            assertEquals(false,result.get("partial"));assertEquals(300,((Number)result.get("revenueToday")).intValue());
            var counts=(Map<?,?>)result.get("orderCountByStatus");assertEquals(6,counts.size());assertEquals(0L,counts.get("PENDING"));assertEquals(3L,counts.get("PAID"));
            var top=(List<Map<String,Object>>)result.get("top5Variants");assertEquals(2,top.size());assertEquals(pro,top.getFirst().get("variantId"));assertEquals(5L,top.getFirst().get("quantitySold"));assertEquals("PRO",top.getFirst().get("sku"));assertEquals(2L,top.getLast().get("quantitySold"));
            var stock=(List<Map<String,Object>>)result.get("lowStockVariants");assertEquals(2,stock.size());assertEquals(base,stock.getFirst().get("variantId"));assertEquals(0,stock.getFirst().get("stock"));assertEquals(pro,stock.getLast().get("variantId"));
            add(jdbc,product,base,"confirmed",1,start.plusHours(4),3);
            var tied=(List<Map<String,Object>>)service.dashboard(date).get("top5Variants");assertEquals(base,tied.getFirst().get("variantId"));
        }finally{executor.shutdown();}
    }
    private void add(JdbcTemplate jdbc,UUID product,UUID variant,String status,int total,OffsetDateTime paid,int quantity){
        UUID order=UUID.randomUUID();jdbc.update("INSERT INTO orders VALUES(?,?,?,?)",order,status,total,paid);
        boolean base=variant.toString().endsWith("1");
        jdbc.update("INSERT INTO order_items VALUES(?,?,?,?,?,?,?)",order,product,variant,"SmartBox at purchase",base?"Base":"Pro",base?"BASE":"PRO",quantity);
    }
}
