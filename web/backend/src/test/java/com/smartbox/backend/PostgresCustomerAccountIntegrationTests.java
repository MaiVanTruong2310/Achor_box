package com.smartbox.backend;
import org.springframework.test.context.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers(disabledWithoutDocker=true)
class PostgresCustomerAccountIntegrationTests extends CustomerAccountIntegrationTests {
    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("customer_account_test").withUsername("customer_test").withPassword("test-only-not-a-real-credential");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p){p.add("test.jdbc.url",POSTGRES::getJdbcUrl);p.add("test.jdbc.user",POSTGRES::getUsername);p.add("test.jdbc.password",POSTGRES::getPassword);}
    @Test void paidAddressCannotBeChangedByDirectSql(){
        var id=order(1);approve(id);payments.checkout(id,"freeze-address");
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE public.orders SET shipping_address='Changed' WHERE id=?",id));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE public.orders SET shipping_address_snapshot='{}' WHERE id=?",id));
        assertEquals("Địa chỉ kiểm thử",jdbc.queryForObject("SELECT shipping_address FROM public.orders WHERE id=?",String.class,id));
    }
    @Test void browserCannotReadAddressesEvenWhenGrantedTableSelect(){
        accounts.saveAddress(null,address("Riêng tư",true));jdbc.execute("CREATE ROLE customer_browser_test NOLOGIN");
        try{jdbc.execute("GRANT USAGE ON SCHEMA public TO customer_browser_test");jdbc.execute("GRANT SELECT,UPDATE ON public.customer_addresses TO customer_browser_test");
            jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection->{try(var sql=connection.createStatement()){sql.execute("SET ROLE customer_browser_test");try(var r=sql.executeQuery("SELECT count(*) FROM public.customer_addresses")){r.next();assertEquals(0,r.getInt(1));}assertEquals(0,sql.executeUpdate("UPDATE public.customer_addresses SET address_line='Changed'"));sql.execute("RESET ROLE");}return null;});
        }finally{jdbc.execute("DROP OWNED BY customer_browser_test");jdbc.execute("DROP ROLE customer_browser_test");}
    }
}
