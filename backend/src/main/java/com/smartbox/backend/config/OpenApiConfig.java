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
                        .title("Smart Delivery Box - Bán Hàng & Bảo Hành REST API")
                        .description("Tài liệu đặc tả REST API chính thức cho hệ sinh thái SmartBox.\n\n" +
                                "Hỗ trợ Web Quản trị Admin và Nghiệp vụ vận hành thương mại điện tử.\n" +
                                "Bao gồm đầy đủ các phân hệ: Bán hàng, Danh mục sản phẩm, Tồn kho, Đơn hàng & Giao vận, Phê duyệt, Bảo hành điện tử, Khách hàng & Báo cáo doanh thu.")
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
                        new Tag().name("Product API").description("Quản lý danh mục, biến thể sản phẩm và định mức tồn kho"),
                        new Tag().name("Order API").description("Quản lý đơn đặt hàng, trạng thái giao vận và thanh toán"),
                        new Tag().name("Delivery & Installation API").description("Quản lý điều phối giao hàng, lắp đặt và nghiệm thu kích hoạt bảo hành"),
                        new Tag().name("Warranty API").description("Quản lý bảo hành điện tử, tra cứu Serial/QR, tiếp nhận khiếu nại và kỹ thuật viên"),
                        new Tag().name("Promotion & Coupon API").description("Quản lý mã giảm giá, voucher khuyến mãi và tính toán chiết khấu"),
                        new Tag().name("Customer Directory API").description("Quản lý danh bạ khách hàng, hồ sơ và liên hệ"),
                        new Tag().name("User API").description("Quản lý tài khoản cán bộ, nhân viên nội bộ và phân quyền RBAC"),
                        new Tag().name("Content & Marketing API").description("Quản lý nội dung CMS: Bài viết blog, Banner trang chủ, Đánh giá sản phẩm và FAQ"),
                        new Tag().name("Settings API").description("Cấu hình hệ thống, mẫu tin nhắn email/SMS, phương thức vận chuyển và thanh toán"),
                        new Tag().name("Audit Log API").description("Truy vết nhật ký thao tác và hành động của nhân viên quản trị"),
                        new Tag().name("Auth API").description("Xác thực và đăng nhập hệ thống quản trị nội bộ")
                ));
    }
}
