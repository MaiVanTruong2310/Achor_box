package com.smartbox.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.BeforeAll;
import java.nio.charset.StandardCharsets;

@SpringBootTest(properties={"smartbox.jobs.enabled=false","smartbox.mqtt.enabled=false","smartbox.fcm.enabled=false"},webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker=true)
class BackendApplicationTests {

    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("smartbox_startup_test").withUsername("startup_test").withPassword("test-only-not-a-real-credential")
        .withInitScript("full-schema.sql");

    @DynamicPropertySource static void database(DynamicPropertyRegistry props) {
        props.add("spring.datasource.url",POSTGRES::getJdbcUrl);props.add("spring.datasource.username",POSTGRES::getUsername);props.add("spring.datasource.password",POSTGRES::getPassword);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.boot.test.web.client.TestRestTemplate http;
    @Autowired com.smartbox.backend.repository.ProfileRepository profiles;
    @Autowired com.smartbox.backend.repository.ProductRepository products;

	@Test
    void contextLoads() throws Exception {
        for(String migration:java.util.List.of("001_order_enum.sql","002_commerce.sql","003_iot.sql"))
            jdbc.execute(new String(getClass().getResourceAsStream("/db/migration/"+migration).readAllBytes(),StandardCharsets.UTF_8));
        org.junit.jupiter.api.Assertions.assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.email_outbox",Integer.class));
        org.junit.jupiter.api.Assertions.assertEquals(401,http.getForEntity("/api/orders",String.class).getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(200,http.getForEntity("/api/products",String.class).getStatusCode().value());
        var id=java.util.UUID.randomUUID();jdbc.update("INSERT INTO auth.users(id) VALUES(?)",id);
        var profile=com.smartbox.backend.entity.Profile.builder().id(id).email("jpa@smartbox.test").fullName("Kiểm thử JPA").role("customer").build();
        profiles.saveAndFlush(profile);
        org.junit.jupiter.api.Assertions.assertEquals("customer",profiles.findById(id).orElseThrow().getRole());
        var product=products.saveAndFlush(com.smartbox.backend.entity.Product.builder().sku("JPA-TEST").name("SmartBox kiểm thử JPA").price(java.math.BigDecimal.valueOf(1000000)).images("[\"test.png\"]").build());
        org.junit.jupiter.api.Assertions.assertTrue(products.findById(product.getId()).orElseThrow().getImages().contains("test.png"));
	}

}
