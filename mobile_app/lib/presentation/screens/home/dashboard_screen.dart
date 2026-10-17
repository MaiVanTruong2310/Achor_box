import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/box_status.dart';
import '../../../services/mqtt_service.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';
import '../../widgets/status_header.dart';
import '../../widgets/sensor_card.dart';
import '../../widgets/unlock_button.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final String boxId = "001";
  final MqttService _mqttService = MqttService();

  bool _isConnectingMqtt = true;
  bool _mqttConnected = false;

  BoxStatusModel _status = BoxStatusModel(
    doorStatus: "closed",
    lockStatus: "locked",
    packageDetected: false,
    currentWeight: 0.0,
    timestamp: DateTime.now(),
  );

  StreamSubscription? _statusSubscription;
  StreamSubscription? _sensorSubscription;

  @override
  void initState() {
    super.initState();
    _initMqtt();
  }

  Future<void> _initMqtt() async {
    setState(() => _isConnectingMqtt = true);
    final connected = await _mqttService.connect(
      broker: 'broker.hivemq.com',
      port: 1883,
      boxId: boxId,
    );

    if (mounted) {
      setState(() {
        _mqttConnected = connected;
        _isConnectingMqtt = false;
      });
    }

    if (connected) {
      _statusSubscription = _mqttService.statusStream.listen((data) {
        if (!mounted) return;
        setState(() {
          _status = BoxStatusModel(
            doorStatus: data['door']?.toString() ?? _status.doorStatus,
            lockStatus: data['lock']?.toString() ?? _status.lockStatus,
            packageDetected: _status.packageDetected,
            currentWeight: _status.currentWeight,
            timestamp: DateTime.now(),
          );
        });
      });

      _sensorSubscription = _mqttService.sensorStream.listen((data) {
        if (!mounted) return;
        setState(() {
          _status = BoxStatusModel(
            doorStatus: _status.doorStatus,
            lockStatus: _status.lockStatus,
            packageDetected: data['package_detected'] == true,
            currentWeight: (data['weight_kg'] ??
                    data['weight'] ??
                    _status.currentWeight as num)
                .toDouble(),
            timestamp: DateTime.now(),
          );
        });
      });
    }
  }

  void _onUnlockPressed() {
    _mqttService.sendCommand(boxId, "UNLOCK");
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('⚡ Đã gửi lệnh MỞ KHÓA TỪ XA qua MQTT'),
        backgroundColor: AppColors.accent,
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  void dispose() {
    _statusSubscription?.cancel();
    _sensorSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      animate: true,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Smart Delivery Box'),
          backgroundColor: Colors.transparent,
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _initMqtt,
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StatusHeader(
                isConnected: _mqttConnected,
                isConnecting: _isConnectingMqtt,
                boxId: boxId,
              ),
              const SizedBox(height: 16),

              // Box Overview Header
              LiquidGlassContainer(
                borderRadius: 22.0,
                blur: 20.0,
                tintOpacity: 0.12,
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    const Icon(Icons.inventory_2_outlined,
                        color: AppColors.primary, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hòm Nhận Hàng #$boxId',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark
                                  ? const Color(0xFFF1F5F9)
                                  : AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            'Trạng thái bảo vệ: Active',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? const Color(0xFFA7B5C8)
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _status.isLocked
                            ? AppColors.danger.withOpacity(0.1)
                            : AppColors.success.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _status.isLocked ? '🔒 ĐÃ KHÓA' : '🔓 MỞ KHÓA',
                        style: TextStyle(
                          color: _status.isLocked
                              ? AppColors.danger
                              : AppColors.success,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Text(
                'CẢM BIẾN & TRẠNG THÁI REALTIME',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isDark
                      ? const Color(0xFFB8C4D8)
                      : AppColors.textSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),

              // Anti-fake Package Status
              SensorCard(
                title: 'Trạng thái Hàng hóa (Chống giả)',
                value: _status.packageDetected
                    ? '📦 ĐÃ CÓ HÀNG TRONG HỘP'
                    : '⚪ Hộp đang trống',
                icon: Icons.verified_outlined,
                iconColor: _status.packageDetected
                    ? AppColors.success
                    : (isDark
                        ? const Color(0xFFA7B5C8)
                        : AppColors.textSecondary),
              ),

              // HX711 Weight
              SensorCard(
                title: 'Khối lượng đo được (HX711)',
                value: '${_status.currentWeight.toStringAsFixed(2)} kg',
                icon: Icons.scale_outlined,
                iconColor: AppColors.primary,
              ),

              // MC-38 Reed Switch
              SensorCard(
                title: 'Trạng thái Nắp Hộp (MC-38)',
                value: _status.isDoorClosed ? '🚪 Nắp ĐÓNG' : '🚪 Nắp MỞ',
                icon: _status.isDoorClosed
                    ? Icons.door_front_door
                    : Icons.door_sliding_outlined,
                iconColor: _status.isDoorClosed
                    ? AppColors.success
                    : AppColors.warning,
              ),

              const SizedBox(height: 20),

              // Unlock Button
              UnlockButton(
                onPressed: _onUnlockPressed,
                isConnected: _mqttConnected,
              ),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}
