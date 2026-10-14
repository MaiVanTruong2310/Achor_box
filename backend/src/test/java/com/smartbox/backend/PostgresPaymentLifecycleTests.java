package com.smartbox.backend;
import org.springframework.test.context.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
@Testcontainers(disabledWithoutDocker=true)
class PostgresPaymentLifecycleTests extends PaymentLifecycleTests {
    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("payment_lifecycle_test").withUsername("payment_test").withPassword("test-only-not-a-real-credential");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p){p.add("test.jdbc.url",POSTGRES::getJdbcUrl);p.add("test.jdbc.user",POSTGRES::getUsername);p.add("test.jdbc.password",POSTGRES::getPassword);}
}
