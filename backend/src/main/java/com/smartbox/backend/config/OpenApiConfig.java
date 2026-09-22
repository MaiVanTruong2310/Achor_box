package com.smartbox.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI smartBoxOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Smart Delivery Box - Management & IoT REST API")
                        .description("Tài liệu đặc tả REST API chính thức cho hệ sinh thái Hộp nhận hàng thông minh SmartBox.\n\n" +
                                "Hỗ trợ Web Quản trị Admin, Mobile App Người dùng & Gateway IoT Vi điều khiển ESP32.\n" +
                                "Bao gồm đầy đủ các tính năng: Xác thực, Thiết bị IoT, Đơn hàng, Sản phẩm, Bảo hành, Marketing CMS & Thống kê Dashboard.")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("SmartBox Engineering Team")
                                .email("contact@smartbox.vn")
                                .url("https://smartbox.vn"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Môi trường Local Development"),
                        new Server().url("https://api.smartbox.vn").description("Môi trường Production (Cloud)")
                ))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Nhập Token JWT vào ô bên dưới (Ví dụ: smartbox-jwt-token-...)")))
                .tags(List.of(
                        new Tag().name("Dashboard API").description("Các API tổng hợp số liệu báo cáo, KPI và biểu đồ doanh thu"),
                        new Tag().name("Device API").description("Quản lý thiết bị SmartBox IoT, giám sát telemetry và trạng thái trực tuyến"),
                        new Tag().name("Product API").description("Quản lý danh mục, sản phẩm SmartBox IoT và định mức tồn kho"),
                        new Tag().name("Order API").description("Quản lý đơn đặt hàng, trạng thái giao vận và thanh toán"),
                        new Tag().name("Warranty API").description("Quản lý bảo hành, xử lý khiếu nại và phân công kỹ thuật viên"),
                        new Tag().name("Promotion & Coupon API").description("Quản lý mã giảm giá, voucher khuyến mãi và tính toán chiết khấu"),
                        new Tag().name("User API").description("Quản lý hồ sơ người dùng, phân quyền RBAC và khóa tài khoản"),
                        new Tag().name("Content & Marketing API").description("Quản lý nội dung CMS: Bài viết blog, Banner trang chủ, Đánh giá sản phẩm và FAQ"),
                        new Tag().name("Settings API").description("Cấu hình hệ thống, mẫu tin nhắn email/SMS, phương thức vận chuyển và thanh toán"),
                        new Tag().name("Audit Log API").description("Truy vết nhật ký thao tác và hành động của nhân viên quản trị"),
                        new Tag().name("Auth API").description("Xác thực và đăng nhập hệ thống quản trị nội bộ")
                ));
    }
}
