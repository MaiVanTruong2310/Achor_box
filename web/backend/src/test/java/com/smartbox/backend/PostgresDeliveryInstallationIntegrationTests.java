package com.smartbox.backend;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.UUID;

@Testcontainers(disabledWithoutDocker=true)
class PostgresDeliveryInstallationIntegrationTests extends DeliveryInstallationIntegrationTests {
    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("smartbox_installation_test").withUsername("installation_test").withPassword("test-only-not-a-real-credential");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p){p.add("test.jdbc.url",POSTGRES::getJdbcUrl);p.add("test.jdbc.user",POSTGRES::getUsername);p.add("test.jdbc.password",POSTGRES::getPassword);}
    @org.junit.jupiter.api.Test void databaseRejectsDirectCompletionBypass(){
        UUID order=confirmedOrder();
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE public.orders SET status=CAST('completed' AS public.order_status) WHERE id=?",order));
        org.junit.jupiter.api.Assertions.assertEquals("confirmed",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,order));
    }
    @org.junit.jupiter.api.Test void browserDatabaseRoleCannotReadOrForgeInstallationJobs(){
        UUID order=confirmedOrder();job(order);
        jdbc.execute("CREATE ROLE installation_browser_test NOLOGIN");
        try {
            jdbc.execute("GRANT USAGE ON SCHEMA public TO installation_browser_test");
            jdbc.execute("GRANT SELECT,INSERT,UPDATE ON public.delivery_installations TO installation_browser_test");
            jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection->{
                try(var sql=connection.createStatement()){
                    sql.execute("SET ROLE installation_browser_test");
                    try(var rows=sql.executeQuery("SELECT count(*) FROM public.delivery_installations")){rows.next();org.junit.jupiter.api.Assertions.assertEquals(0,rows.getInt(1));}
                    org.junit.jupiter.api.Assertions.assertEquals(0,sql.executeUpdate("UPDATE public.delivery_installations SET status='COMPLETED',customer_accepted=true"));
                    sql.execute("RESET ROLE");
                }
                return null;
            });
        } finally {jdbc.execute("DROP OWNED BY installation_browser_test");jdbc.execute("DROP ROLE installation_browser_test");}
    }
}
