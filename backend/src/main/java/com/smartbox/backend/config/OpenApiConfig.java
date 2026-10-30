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
                        .description("Tài liệu đặc tả REST API chính thức cho hệ sinh thái SmartBox.\n\n"
                                + "Hỗ trợ Web Quản trị Admin và Nghiệp vụ vận hành thương mại điện tử.\n"
                                + "Bao gồm đầy đủ các phân hệ: Bán hàng, Danh mục sản phẩm, Tồn kho, Đơn hàng & Giao vận, Phê duyệt, Bảo hành điện tử, Khách hàng & Báo cáo doanh thu.")
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
                        new Tag().name("Auth API").description("Xác thực, đăng nhập JWT, làm mới token, đổi mật khẩu và quản lý phiên người dùng"),
                        new Tag().name("Customer Account API").description("Quản lý thông tin hồ sơ cá nhân và sổ địa chỉ giao hàng của khách hàng"),
                        new Tag().name("Customer Directory API").description("Quản lý danh bạ khách hàng, thông tin liên hệ và tạo tài khoản đăng nhập"),
                        new Tag().name("User API").description("Quản lý tài khoản cán bộ, nhân viên nội bộ và phân quyền RBAC"),
                        new Tag().name("Dashboard API").description("Các API tổng hợp số liệu báo cáo, KPI và biểu đồ doanh thu"),
                        new Tag().name("Report API").description("Báo cáo doanh thu, doanh số bán hàng và xuất báo cáo PDF/Excel"),
                        new Tag().name("Product API").description("Quản lý danh mục, sản phẩm SmartBox IoT, biến thể kích cỡ và tồn kho"),
                        new Tag().name("Device Inventory API").description("Quản lý mã Serial và danh mục thiết bị đã xuất kho"),
                        new Tag().name("Promotion & Coupon API").description("Quản lý mã giảm giá, voucher khuyến mãi và tính toán chiết khấu đơn hàng"),
                        new Tag().name("Pricing & Calculation API").description("Tính toán đơn giá, thành tiền, chiết khấu voucher (100% tại backend)"),
                        new Tag().name("Order API").description("Quản lý đơn đặt hàng, giỏ hàng, phê duyệt PO và xử lý giao vận"),
                        new Tag().name("Payment API").description("Kiểm toán, đối soát và tích hợp cổng thanh toán trực tuyến (VNPAY Sandbox & Simulation)"),
                        new Tag().name("Delivery & Installation API").description("Quản lý điều phối giao hàng, lắp đặt và nghiệm thu kích hoạt bảo hành"),
                        new Tag().name("Warranty API").description("Quản lý bảo hành điện tử, tra cứu Serial/QR, tiếp nhận khiếu nại và kỹ thuật viên"),
                        new Tag().name("Notification API").description("Quản lý thông báo hệ thống và push notification dành cho người dùng và quản trị viên"),
                        new Tag().name("Settings API").description("Cấu hình hệ thống, mẫu tin nhắn email/SMS, phương thức vận chuyển và thanh toán"),
                        new Tag().name("Audit Log API").description("Truy vết nhật ký thao tác và hành động của nhân viên quản trị")
                ));
    }
}
