package com.smartbox.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin thiết bị SmartBox IoT")
public class DeviceResponse {

    @Schema(description = "ID thiết bị")
    private UUID id;

    @Schema(description = "ID sản phẩm liên kết")
    private UUID productId;

    @Schema(description = "Tên dòng sản phẩm", example = "SmartBox Pro Max")
    private String productName;

    @Schema(description = "ID chủ sở hữu")
    private UUID ownerId;

    @Schema(description = "Tên chủ sở hữu", example = "Trần Thị Mai")
    private String ownerName;

    @Schema(description = "Số điện thoại chủ sở hữu", example = "0987654321")
    private String ownerPhone;

    @Schema(description = "Số Serial thiết bị", example = "SBX-2026-0001")
    private String serialNumber;

    @Schema(description = "Tên gán cho thiết bị", example = "SmartBox Cổng Chính")
    private String name;

    @Schema(description = "Nhãn vị trí lắp đặt", example = "Tầng 1 - Cửa trước")
    private String locationLabel;

    @Schema(description = "Trạng thái kết nối (online, offline, maintenance, error)", example = "online")
    private String status;

    @Schema(description = "Mức pin hiện tại (0-100%)", example = "92")
    private Integer batteryLevel;

    @Schema(description = "Phiên bản firmware", example = "v2.1.0")
    private String firmwareVersion;

    @Schema(description = "Lần trực tuyến gần nhất")
    private OffsetDateTime lastSeenAt;

    @Schema(description = "Ngày tạo thiết bị")
    private OffsetDateTime createdAt;

    @Schema(description = "Địa chỉ MAC", example = "24:6F:28:AB:CD:EF")
    private String macAddress;

    @Schema(description = "Model chip vi điều khiển", example = "ESP32-S3")
    private String chipModel;

    @Schema(description = "IP Public")
    private String publicIp;

    @Schema(description = "IP Local")
    private String localIp;

    @Schema(description = "Thành phố định vị", example = "Hà Nội")
    private String geoCity;

    @Schema(description = "Tọa độ bản đồ X")
    private Integer mapX;

    @Schema(description = "Tọa độ bản đồ Y")
    private Integer mapY;

    @Schema(description = "Trạng thái khóa cơ điện (locked, unlocked)", example = "locked")
    private String lockStatus;

    @Schema(description = "Cường độ tín hiệu WiFi RSSI (dBm)", example = "-65")
    private Integer wifiRssi;

    @Schema(description = "Độ trễ Ping mạng (ms)", example = "24")
    private Integer pingMs;

    @Schema(description = "Trạng thái nắp/cửa hộp (closed, open)", example = "closed")
    private String doorStatus;

    @Schema(description = "Trọng lượng kiện hàng hiện tại (kg)", example = "0.45")
    private Double weightKg;

    @Schema(description = "Phát hiện kiện hàng bên trong hộp", example = "true")
    private Boolean packageDetected;

    @Schema(description = "Cảm biến cân nặng đã sẵn sàng hoạt động", example = "true")
    private Boolean scaleReady;

    @Schema(description = "Trạng thái hoạt động vi xử lý (starting, idle, active, error)", example = "idle")
    private String deviceState;

    @Schema(description = "Mã kênh truyền MQTT Topic ID", example = "smartbox/dev/BOX-2026-001")
    private String mqttTopicId;
}
