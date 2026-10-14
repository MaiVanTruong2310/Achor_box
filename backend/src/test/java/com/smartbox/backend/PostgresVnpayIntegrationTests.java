package com.smartbox.backend;
import org.springframework.test.context.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
@Testcontainers(disabledWithoutDocker=true)
class PostgresVnpayIntegrationTests extends VnpayIntegrationTests {
    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("vnpay_test").withUsername("vnpay_test").withPassword("test-only-not-real-credential");
    @DynamicPropertySource static void database(DynamicPropertyRegistry props){props.add("test.jdbc.url",POSTGRES::getJdbcUrl);props.add("test.jdbc.user",POSTGRES::getUsername);props.add("test.jdbc.password",POSTGRES::getPassword);}
}
