import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../data/models/device_access.dart';
import '../../../services/mqtt_service.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/animated_delivery_box.dart';
import '../../widgets/device_pin_dialogs.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/ios26_back_button.dart';
import '../../widgets/neon_bubble_background.dart';
import 'access_screen.dart';
import 'wifi_provisioning_screen.dart';

class DeviceDetailScreen extends StatefulWidget {
  final String deviceId;

  /// The box serial; MQTT topics are `delivery_box/<serial>/...`.
  final String mqttTopicId;
  final DeviceAccessLevel accessLevel;
  final String boxName;
  final bool isOnline;
  final String statusText;
  final String locationText;
  final String batteryLevel;
  final String weight;
  final String lockStatus;

  const DeviceDetailScreen({
    super.key,
    required this.deviceId,
    required this.mqttTopicId,
    required this.accessLevel,
    required this.boxName,
    required this.isOnline,
    required this.statusText,
    required this.locationText,
    required this.batteryLevel,
    required this.weight,
    required this.lockStatus,
  });

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen>
    with SingleTickerProviderStateMixin {
  static const _onlineTimeout = Duration(seconds: 90);
  final MqttService _mqttService = MqttService();
  bool _isUnlocking = false;
  DateTime? _localLockOverrideUntil;
  bool _isHolding = false;
  double _holdProgress = 0.0;
  Timer? _holdTimer;
  Timer? _onlineRefreshTimer;
  StreamSubscription<List<Map<String, dynamic>>>? _deviceSubscription;
  StreamSubscription<List<Map<String, dynamic>>>? _eventsSubscription;
  StreamSubscription<Map<String, dynamic>>? _statusSubscription;
  StreamSubscription<Map<String, dynamic>>? _sensorSubscription;

  late String _currentLockStatus;
  late String _currentWeight;
  late bool _isOnline;
  late String _statusText;
  String _doorStatus = 'closed';
  bool _packageDetected = false;
  bool _scaleReady = false;
  DateTime? _lastSeenAt;
  List<Map<String, dynamic>> _events = const [];

  @override
  void initState() {
    super.initState();
    _currentLockStatus = widget.lockStatus;
    _currentWeight = widget.weight;
    _isOnline = widget.isOnline;
    _statusText = widget.statusText;
    _subscribeToLiveData();
    _onlineRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (!mounted || _lastSeenAt == null) return;
      final online = DateTime.now().toUtc().difference(_lastSeenAt!.toUtc()) <
          _onlineTimeout;
      if (online != _isOnline) {
        setState(() {
          _isOnline = online;
          _statusText = online ? 'Online' : 'Offline';
        });
      }
    });

    // Nếu thiết bị chưa Online (chưa có Wi-Fi), nẩy Popup hỗ trợ nạp Wi-Fi qua Bluetooth BLE ngay
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Give a newly provisioned ESP32 enough time to reboot, join Wi-Fi and
      // publish its first authenticated heartbeat. Only the owner configures
      // the box's Wi-Fi.
      if (!widget.accessLevel.isOwner) return;
      await Future<void>.delayed(const Duration(seconds: 20));
      if (mounted && !_isOnline) _promptWifiProvisioning();
    });
  }

  Future<void> _promptWifiProvisioning() async {
    final shouldProvision = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.wifi_off_rounded, color: Colors.amberAccent),
            const SizedBox(width: 10),
            Text(dialogCtx.tr(vi: "Hộp chưa có Wi-Fi", en: "Box Offline")),
          ],
        ),
        content: Text(dialogCtx.tr(
          vi: "Hộp hiện chưa kết nối Wi-Fi. Bạn có muốn kết nối Bluetooth BLE để gửi Wi-Fi cho Hộp ngay không?",
          en: "The box is currently offline. Connect via Bluetooth BLE to configure Wi-Fi now?",
        )),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: Text(dialogCtx.tr(vi: "Để sau", en: "Later")),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: Text(dialogCtx.tr(vi: "Cấu hình Wi-Fi", en: "Configure")),
          ),
        ],
      ),
    );

    if (shouldProvision == true && mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => WifiProvisioningScreen(
            deviceSerial: widget.mqttTopicId,
          ),
        ),
      );
    }
  }

  Future<void> _subscribeToLiveData() async {
    _deviceSubscription = SupabaseService.watchDevice(widget.deviceId)?.listen(
      (rows) {
        if (!mounted || rows.isEmpty) return;
        _applyDeviceData(rows.first);
      },
    );
    _eventsSubscription =
        SupabaseService.watchDeviceEvents(widget.deviceId)?.listen((rows) {
      if (mounted) setState(() => _events = rows);
    });

    final connected = await _mqttService.connect(boxId: widget.mqttTopicId);
    if (!connected || !mounted) return;
    _statusSubscription = _mqttService.statusStream.listen((data) {
      if (!mounted) return;
      setState(() {
        _isOnline = true;
        _statusText = 'Online';
        _lastSeenAt = DateTime.now().toUtc();
        _doorStatus = data['door']?.toString() ?? _doorStatus;
        final lock = data['lock']?.toString();
        if (lock != null &&
            (_localLockOverrideUntil == null ||
                DateTime.now().isAfter(_localLockOverrideUntil!))) {
          _currentLockStatus = lock == 'unlocked' ? 'Mở' : 'Đóng';
        }
      });
    });
    _sensorSubscription = _mqttService.sensorStream.listen((data) {
      if (!mounted) return;
      setState(() {
        _packageDetected = data['package_detected'] == true;
        _scaleReady = data['scale_ready'] == true;
        final weight = data['weight_kg'] ?? data['weight'];
        if (weight is num) _currentWeight = '${weight.toStringAsFixed(2)} kg';
      });
    });
  }

  void _applyDeviceData(Map<String, dynamic> data) {
    final status = data['status']?.toString().toLowerCase() ?? 'offline';
    final lastSeen = DateTime.tryParse(data['last_seen_at']?.toString() ?? '');
    final weight = data['weight_kg'];
    final lock = data['lock_status']?.toString().toLowerCase();
    setState(() {
      _lastSeenAt = lastSeen;
      _isOnline = status == 'online' &&
          lastSeen != null &&
          DateTime.now().toUtc().difference(lastSeen.toUtc()) < _onlineTimeout;
      _statusText = _isOnline ? 'Online' : 'Offline';
      _doorStatus = data['door_status']?.toString() ?? _doorStatus;
      _packageDetected = data['package_detected'] == true;
      _scaleReady = data['scale_ready'] == true;
      if (weight is num) _currentWeight = '${weight.toStringAsFixed(2)} kg';
      if (lock != null &&
          (_localLockOverrideUntil == null ||
              DateTime.now().isAfter(_localLockOverrideUntil!))) {
        _currentLockStatus = lock == 'unlocked' ? 'Mở' : 'Đóng';
      }
    });
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _onlineRefreshTimer?.cancel();
    _deviceSubscription?.cancel();
    _eventsSubscription?.cancel();
    _statusSubscription?.cancel();
    _sensorSubscription?.cancel();
    super.dispose();
  }

  void _startHold() {
    if (!widget.accessLevel.canControl ||
        _isUnlocking ||
        _currentLockStatus == 'Mở') {
      return;
    }
    setState(() {
      _isHolding = true;
      _holdProgress = 0.0;
    });

    _holdTimer?.cancel();
    _holdTimer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (!mounted) return;
      setState(() {
        _holdProgress += 0.035;
        if (_holdProgress >= 1.0) {
          _holdProgress = 1.0;
          timer.cancel();
          _triggerUnlock();
        }
      });
    });
  }

  void _cancelHold() {
    _holdTimer?.cancel();
    if (_isUnlocking && _holdProgress >= 1.0) return;
    if (mounted) {
      setState(() {
        _isHolding = false;
        _holdProgress = 0.0;
      });
    }
  }

  Future<void> _triggerUnlock() async {
    if (_isUnlocking) return;

    setState(() {
      _isUnlocking = true;
      _isHolding = false;
      _holdProgress = 1.0;
    });

    final commandId = SupabaseService.newDeviceCommandId();
    final sentByMqtt = _mqttService.sendCommand(widget.mqttTopicId, {
      'command': 'UNLOCK',
      'command_id': commandId,
    });
    final queued = await SupabaseService.queueDeviceCommand(
      commandId: commandId,
      deviceId: widget.deviceId,
      command: 'UNLOCK',
    );
    if (!sentByMqtt && !queued) {
      if (mounted) {
        AppToast.show(
          context,
          message: context.tr(
            vi: 'Không thể gửi lệnh mở khóa. Hãy kiểm tra mạng.',
            en: 'Unable to send unlock command. Check your connection.',
          ),
          type: ToastType.error,
        );
        setState(() {
          _isUnlocking = false;
          _isHolding = false;
          _holdProgress = 0.0;
        });
      }
      return;
    }
    if (!mounted) return;
    setState(() {
      _currentLockStatus = 'Mở';
      _localLockOverrideUntil = DateTime.now().add(const Duration(seconds: 12));
    });

    AppToast.show(
      context,
      message: context.tr(
          vi: "Đã gửi lệnh MỞ KHÓA TỪ XA đến ${widget.boxName}!",
          en: "Remote UNLOCK command sent to ${widget.boxName}!"),
      type: ToastType.success,
    );

    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() {
        _isUnlocking = false;
        _isHolding = false;
        _holdProgress = 0.0;
      });
    }
  }

  Future<void> _triggerLock() async {
    if (!widget.accessLevel.canControl || _isUnlocking) return;
    setState(() => _isUnlocking = true);

    final commandId = SupabaseService.newDeviceCommandId();
    final sentByMqtt = _mqttService.sendCommand(widget.mqttTopicId, {
      'command': 'LOCK',
      'command_id': commandId,
    });
    final queued = await SupabaseService.queueDeviceCommand(
      commandId: commandId,
      deviceId: widget.deviceId,
      command: 'LOCK',
    );
    if (!sentByMqtt && !queued) {
      if (mounted) {
        AppToast.show(
          context,
          message: context.tr(
            vi: 'Không thể gửi lệnh đóng khóa. Hãy kiểm tra mạng.',
            en: 'Unable to send lock command. Check your connection.',
          ),
          type: ToastType.error,
        );
        setState(() => _isUnlocking = false);
      }
      return;
    }
    if (!mounted) return;
    setState(() {
      _currentLockStatus = 'Đóng';
      _localLockOverrideUntil = DateTime.now().add(const Duration(seconds: 12));
    });
    AppToast.show(
      context,
      message: context.tr(
        vi: 'Đã gửi lệnh ĐÓNG KHÓA đến ${widget.boxName}.',
        en: 'Lock command sent to ${widget.boxName}.',
      ),
      type: ToastType.success,
    );
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _isUnlocking = false);
  }

  String _eventLabel(String type) => switch (type) {
        'DOOR_OPENED' => 'Nắp hộp đã mở',
        'DOOR_CLOSED' => 'Nắp hộp đã đóng',
        'UNAUTHORIZED_OPEN' => 'Mở hộp trái phép',
        'AUTHORIZED_OPEN' => 'Mở hộp hợp lệ',
        'UNLOCKED' => 'Đã mở khóa',
        'PACKAGE_DETECTED' => 'Phát hiện kiện hàng',
        'PACKAGE_DELIVERED' => 'Đã nhận và khóa hàng',
        'WRONG_PIN' => 'Nhập sai mã',
        'KEYPAD_LOCKED' => 'Bàn phím bị khóa',
        'ONLINE' => 'Thiết bị trực tuyến',
        'REMOTE_UNLOCK' => 'Lệnh mở khóa từ ứng dụng',
        'REMOTE_LOCK' => 'Lệnh đóng khóa từ ứng dụng',
        'REMOTE_TARE' => 'Lệnh đặt lại cân',
        'ONE_TIME_PIN_USED' => 'Mở bằng PIN một lần',
        _ => type.replaceAll('_', ' '),
      };

  String _eventTime(dynamic value) {
    final time = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (time == null) return '';
    String two(int number) => number.toString().padLeft(2, '0');
    return '${two(time.hour)}:${two(time.minute)} '
        '${two(time.day)}/${two(time.month)}';
  }

  Future<void> _showChangePinDialog() async {
    final newPin = await showChangeDevicePinDialog(context);
    if (newPin == null || !mounted) return;

    final saved = await SupabaseService.setDeviceAccessPin(
      deviceId: widget.deviceId,
      pin: newPin,
    );
    if (!mounted) return;
    AppToast.show(
      context,
      message: saved
          ? context.tr(
              vi: 'Đã cập nhật mã PIN của hộp.',
              en: 'The box PIN has been updated.',
            )
          : context.tr(
              vi: 'Không thể cập nhật PIN. Hãy thử lại.',
              en: 'Could not update the PIN. Please try again.',
            ),
      type: saved ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _createAndShareOneTimePin() async {
    AppToast.show(
      context,
      message: context.tr(
          vi: 'Đang tạo PIN một lần...', en: 'Creating one-time PIN...'),
      type: ToastType.info,
    );
    final result = await SupabaseService.createOneTimeDevicePin(
      deviceId: widget.deviceId,
      expiresMinutes: 30,
    );
    if (!mounted) return;
    if (result == null) {
      AppToast.show(
        context,
        message: context.tr(
          vi: 'Không thể tạo PIN một lần. Hãy thử lại.',
          en: 'Could not create a one-time PIN. Please try again.',
        ),
        type: ToastType.error,
      );
      return;
    }
    await showOneTimePinCreatedDialog(context, result);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText =
        isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final secondaryText =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;
    final statusColor =
        _isOnline ? const Color(0xFF10B981) : const Color(0xFFF59E0B);

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: SingleChildScrollView(
            padding:
                const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Back Navigation Row
                const Ios26BackButton(),
                const SizedBox(height: 20),

                // 2. Title & Status Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Text(
                        widget.boxName,
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: primaryText,
                          letterSpacing: -0.5,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Online Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: statusColor.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            margin: const EdgeInsets.only(right: 6),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: statusColor,
                            ),
                          ),
                          Text(
                            _statusText,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // 3. Main Lock Control & Telemetry Card (iOS 26 Liquid Glass Container)
                LiquidGlassContainer(
                  borderRadius: 28.0,
                  blur: 24.0,
                  tintOpacity: 0.16,
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      // Animated box: hold to open, tap the open box to lock.
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTapDown: (_) {
                          if (_currentLockStatus != 'Mở') _startHold();
                        },
                        onTapUp: (_) => _cancelHold(),
                        onTapCancel: _cancelHold,
                        onTap: _currentLockStatus == 'Mở' ? _triggerLock : null,
                        child: Semantics(
                          button: true,
                          label: _currentLockStatus == 'Mở'
                              ? context.tr(
                                  vi: 'Nhấn để đóng hộp', en: 'Tap to lock box')
                              : context.tr(
                                  vi: 'Giữ để mở hộp', en: 'Hold to open box'),
                          child: AnimatedDeliveryBox(
                            openFraction: _currentLockStatus == 'Mở'
                                ? 1.0
                                : _holdProgress * 0.82,
                            holdProgress: _currentLockStatus == 'Mở'
                                ? 0.0
                                : _holdProgress,
                            isOpen: _currentLockStatus == 'Mở',
                            isBusy: _isUnlocking,
                            instruction: !widget.accessLevel.canControl
                                ? context.tr(
                                    vi: 'Bạn chỉ có quyền xem',
                                    en: 'You have view-only access')
                                : _currentLockStatus == 'Mở'
                                    ? context.tr(
                                        vi: 'NHẤN ĐỂ ĐÓNG', en: 'TAP TO LOCK')
                                    : (_isUnlocking
                                        ? context.tr(
                                            vi: 'Đang gửi lệnh mở...',
                                            en: 'Sending unlock...')
                                        : _isHolding
                                            ? context.tr(
                                                vi: 'Giữ để mở khóa...',
                                                en: 'Keep holding...')
                                            : context.tr(
                                                vi: 'Giữ để mở',
                                                en: 'Hold to Open')),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Sensor Telemetry Row (Trạng thái & Cân nặng)
                      Row(
                        children: [
                          // Status Column
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  vertical: 14, horizontal: 16),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF1E293B).withOpacity(0.5)
                                    : Colors.white.withOpacity(0.35),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: Colors.white
                                      .withOpacity(isDark ? 0.1 : 0.4),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    context.tr(vi: "Trạng thái", en: "Status"),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w400,
                                      color: secondaryText,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(
                                        _currentLockStatus == "Mở"
                                            ? Icons.lock_open
                                            : Icons.lock_outline,
                                        size: 16,
                                        color: _currentLockStatus == "Mở"
                                            ? const Color(0xFF10B981)
                                            : AppColors.brandBlue,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        _currentLockStatus,
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: primaryText,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),

                          // Weight Column
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  vertical: 14, horizontal: 16),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF1E293B).withOpacity(0.5)
                                    : Colors.white.withOpacity(0.35),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: Colors.white
                                      .withOpacity(isDark ? 0.1 : 0.4),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    context.tr(vi: "Cân nặng", en: "Weight"),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w400,
                                      color: secondaryText,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _currentWeight,
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: primaryText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                LiquidGlassContainer(
                  borderRadius: 20,
                  blur: 18,
                  tintOpacity: 0.12,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildLiveValue(
                          icon: _doorStatus == 'open'
                              ? Icons.door_front_door_rounded
                              : Icons.door_front_door_outlined,
                          label: context.tr(vi: 'Nắp hộp', en: 'Door'),
                          value: _doorStatus == 'open' ? 'Đang mở' : 'Đã đóng',
                          color: _doorStatus == 'open'
                              ? const Color(0xFFF59E0B)
                              : const Color(0xFF10B981),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildLiveValue(
                          icon: Icons.inventory_2_outlined,
                          label: context.tr(vi: 'Kiện hàng', en: 'Parcel'),
                          value: _packageDetected ? 'Có hàng' : 'Hộp trống',
                          color: _packageDetected
                              ? AppColors.brandBlue
                              : secondaryText,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildLiveValue(
                          icon: Icons.monitor_weight_outlined,
                          label: context.tr(vi: 'Cảm biến', en: 'Scale'),
                          value: _scaleReady ? 'Sẵn sàng' : 'Chưa sẵn sàng',
                          color: _scaleReady
                              ? const Color(0xFF10B981)
                              : secondaryText,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                Text(
                  context.tr(vi: 'Lịch sử hoạt động', en: 'Activity history'),
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: primaryText,
                  ),
                ),
                const SizedBox(height: 10),
                if (_events.isEmpty)
                  Text(
                    context.tr(
                      vi: 'Chưa có hoạt động nào được ghi nhận.',
                      en: 'No activity has been recorded yet.',
                    ),
                    style: TextStyle(color: secondaryText),
                  )
                else
                  ..._events.take(5).map((event) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: LiquidGlassContainer(
                          borderRadius: 16,
                          blur: 14,
                          tintOpacity: 0.1,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                event['event_type'] == 'UNAUTHORIZED_OPEN'
                                    ? Icons.warning_amber_rounded
                                    : Icons.history_rounded,
                                color:
                                    event['event_type'] == 'UNAUTHORIZED_OPEN'
                                        ? Colors.redAccent
                                        : AppColors.brandBlue,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _eventLabel(
                                      event['event_type']?.toString() ?? ''),
                                  style: TextStyle(
                                    color: primaryText,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Text(
                                _eventTime(event['created_at']),
                                style: TextStyle(
                                  color: secondaryText,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )),
                const SizedBox(height: 24),

                // 4. Advanced Settings (owner only: PIN, Wi-Fi, members, unbind)
                if (widget.accessLevel.isOwner)
                  LiquidGlassContainer(
                    borderRadius: 20.0,
                    blur: 16.0,
                    tintOpacity: 0.12,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16.0, vertical: 4.0),
                    child: Theme(
                      data: Theme.of(context).copyWith(
                        dividerColor: Colors.transparent,
                        splashColor: Colors.transparent,
                      ),
                      child: ExpansionTile(
                        leading: Icon(
                          Icons.settings_outlined,
                          color: isDark
                              ? const Color(0xFF38BDF8)
                              : AppColors.brandBlue,
                        ),
                        title: Text(
                          context.tr(
                            vi: "Cài đặt & Thao tác thiết bị",
                            en: "Device Settings & Actions",
                          ),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: primaryText,
                          ),
                        ),
                        subtitle: Text(
                          context.tr(
                            vi: "Mã PIN, Wi-Fi, Thành viên, Liên kết",
                            en: "PIN, Wi-Fi, Members, Unbind",
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            color: secondaryText,
                          ),
                        ),
                        children: [
                          const Divider(height: 1, color: Colors.white10),
                          ListTile(
                            leading: Icon(Icons.share_outlined,
                                color: AppColors.brandBlue),
                            title: Text(
                              context.tr(vi: "Chia sẻ PIN", en: "Share PIN"),
                              style:
                                  TextStyle(color: primaryText, fontSize: 14),
                            ),
                            trailing: const Icon(Icons.chevron_right, size: 20),
                            onTap: _createAndShareOneTimePin,
                          ),
                          ListTile(
                            leading: Icon(Icons.pin_outlined,
                                color: AppColors.brandBlue),
                            title: Text(
                              context.tr(
                                  vi: "Quản lý Mã PIN", en: "Manage PIN Codes"),
                              style:
                                  TextStyle(color: primaryText, fontSize: 14),
                            ),
                            trailing: const Icon(Icons.chevron_right, size: 20),
                            onTap: _showChangePinDialog,
                          ),
                          ListTile(
                            leading: const Icon(Icons.wifi_find_rounded,
                                color: Color(0xFF10B981)),
                            title: Text(
                              context.tr(
                                  vi: "Đổi cấu hình Wi-Fi",
                                  en: "Change Wi-Fi Config"),
                              style:
                                  TextStyle(color: primaryText, fontSize: 14),
                            ),
                            trailing: const Icon(Icons.chevron_right, size: 20),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (dialogCtx) =>
                                      WifiProvisioningScreen(
                                    deviceSerial: widget.mqttTopicId,
                                  ),
                                ),
                              );
                            },
                          ),
                          ListTile(
                            leading: const Icon(Icons.people_outline,
                                color: Color(0xFF8B5CF6)),
                            title: Text(
                              context.tr(
                                  vi: "Quản lý Thành viên",
                                  en: "Members Management"),
                              style:
                                  TextStyle(color: primaryText, fontSize: 14),
                            ),
                            trailing: const Icon(Icons.chevron_right, size: 20),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => AccessScreen(
                                    initialDeviceId: widget.deviceId,
                                    showBackButton: true,
                                  ),
                                ),
                              );
                            },
                          ),
                          ListTile(
                            leading: const Icon(Icons.link_off_rounded,
                                color: Colors.redAccent),
                            title: Text(
                              context.tr(
                                  vi: "Hủy quyền sở hữu hộp",
                                  en: "Unbind Device"),
                              style: const TextStyle(
                                  color: Colors.redAccent,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600),
                            ),
                            trailing: const Icon(Icons.chevron_right,
                                size: 20, color: Colors.redAccent),
                            onTap: () async {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: Text(context.tr(
                                    vi: 'Hủy quyền sở hữu?',
                                    en: 'Unbind Device?',
                                  )),
                                  content: Text(context.tr(
                                    vi: 'Thiết bị ${widget.boxName} sẽ chuyển sang trạng thái tự do (bất hoạt) để người dùng khác có thể liên kết.',
                                    en: 'Device ${widget.boxName} will be unlinked and set to inactive state for new owners to claim.',
                                  )),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(ctx, false),
                                      child: Text(
                                          context.tr(vi: 'Hủy', en: 'Cancel')),
                                    ),
                                    FilledButton(
                                      style: FilledButton.styleFrom(
                                        backgroundColor: Colors.redAccent,
                                      ),
                                      onPressed: () => Navigator.pop(ctx, true),
                                      child: Text(context.tr(
                                          vi: 'Hủy sở hữu', en: 'Unbind')),
                                    ),
                                  ],
                                ),
                              );

                              if (confirmed == true && context.mounted) {
                                final success =
                                    await SupabaseService.unbindDevice(
                                        widget.deviceId);
                                if (context.mounted) {
                                  if (success) {
                                    AppToast.show(
                                      context,
                                      message: context.tr(
                                        vi: 'Đã hủy quyền sở hữu thiết bị!',
                                        en: 'Device unbind successful!',
                                      ),
                                      type: ToastType.success,
                                    );
                                    Navigator.pop(context, widget.deviceId);
                                  } else {
                                    AppToast.show(
                                      context,
                                      message: context.tr(
                                        vi: 'Không thể hủy liên kết. Hãy thử lại.',
                                        en: 'Failed to unbind device. Try again.',
                                      ),
                                      type: ToastType.error,
                                    );
                                  }
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLiveValue({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(fontSize: 11)),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w700, color: color),
        ),
      ],
    );
  }
}
