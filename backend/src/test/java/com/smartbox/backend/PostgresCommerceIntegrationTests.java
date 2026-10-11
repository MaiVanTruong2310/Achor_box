package com.smartbox.backend;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker=true)
class PostgresCommerceIntegrationTests extends CommerceIntegrationTests {
    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("smartbox_test").withUsername("smartbox_test").withPassword("test-only-not-a-real-credential");
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("test.jdbc.url",POSTGRES::getJdbcUrl);properties.add("test.jdbc.user",POSTGRES::getUsername);properties.add("test.jdbc.password",POSTGRES::getPassword);
    }
}
