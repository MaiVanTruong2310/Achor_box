package com.smartbox.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI smartBoxOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Smart Delivery Box - Management & IoT REST API")
                        .description("REST API phục vụ hệ sinh thái Hộp nhận hàng thông minh: Web Quản trị, App Di động & Gateway IoT ESP32")
                        .version("v1.0.0")
                        .contact(new Contact().name("SmartBox Team").email("admin@smartbox.vn"))
                        .license(new License().name("Apache 2.0").url("https://springdoc.org")));
    }
}
