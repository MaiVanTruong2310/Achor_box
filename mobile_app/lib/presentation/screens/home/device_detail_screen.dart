import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/app_notification.dart';
import '../../../data/models/device.dart';
import '../../../data/models/device_event.dart';
import '../../../services/mqtt_service.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/animated_delivery_box.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/device_pin_dialogs.dart';
import 'access_screen.dart';
import 'wifi_provisioning_screen.dart';

/// One box: hold-to-open control, live sensor tiles, recent activity and,
/// for the owner, management actions. Live data comes from the `devices`
/// row (Realtime) and MQTT status/sensor topics.
class DeviceDetailScreen extends StatefulWidget {
  final Device device;

  const DeviceDetailScreen({super.key, required this.device});

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen> {
  final MqttService _mqttService = MqttService();
  StreamSubscription<List<Map<String, dynamic>>>? _deviceSubscription;
  StreamSubscription<List<Map<String, dynamic>>>? _eventsSubscription;
  StreamSubscription<Map<String, dynamic>>? _statusSubscription;
  StreamSubscription<Map<String, dynamic>>? _sensorSubscription;
  Timer? _holdTimer;
  Timer? _clock;

  late Device _device;
  DateTime _now = DateTime.now();
  List<Map<String, dynamic>> _events = const [];

  /// Last state reported over MQTT, newer than the database row.
  DateTime? _mqttSeenAt;
  bool? _mqttDoorOpen;
  DeviceLockState? _mqttLock;
  bool? _mqttPackage;
  bool? _mqttScaleReady;
  double? _mqttWeight;

  /// After a command, show the expected lock state until the box reports.
  DeviceLockState? _pendingLock;
  DateTime? _pendingLockUntil;

  bool _isSending = false;
  bool _isHolding = false;
  double _holdProgress = 0;

  bool get _canControl => widget.device.canControl;
  bool get _isOwner => widget.device.isOwner;

  bool get _isOnline {
    final mqtt = _mqttSeenAt;
    if (mqtt != null && _now.difference(mqtt) < Device.onlineTimeout) {
      return true;
    }
    return _device.isOnlineAt(_now);
  }

  DeviceLockState get _lock {
    final until = _pendingLockUntil;
    if (_pendingLock != null && until != null && _now.isBefore(until)) {
      return _pendingLock!;
    }
    return _mqttLock ?? _device.lockState;
  }

  bool get _isOpen => _lock == DeviceLockState.unlocked;
  bool get _doorOpen => _mqttDoorOpen ?? _device.doorOpen;
  bool get _packageDetected => _mqttPackage ?? _device.packageDetected;
  bool get _scaleReady => _mqttScaleReady ?? _device.scaleReady;
  double? get _weightKg => _mqttWeight ?? _device.weightKg;

  @override
  void initState() {
    super.initState();
    _device = widget.device;
    _subscribeToLiveData();
    _clock = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });

    // A freshly provisioned box needs time to reboot, join Wi-Fi and send
    // its first heartbeat. Only the owner configures the box's Wi-Fi.
    if (_isOwner) {
      Future<void>.delayed(const Duration(seconds: 20), () {
        if (mounted && !_isOnline) _promptWifiProvisioning();
      });
    }
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _clock?.cancel();
    _deviceSubscription?.cancel();
    _eventsSubscription?.cancel();
    _statusSubscription?.cancel();
    _sensorSubscription?.cancel();
    super.dispose();
  }

  Future<void> _subscribeToLiveData() async {
    _deviceSubscription =
        SupabaseService.watchDevice(widget.device.id)?.listen((rows) {
      if (!mounted || rows.isEmpty) return;
      setState(() {
        _device = Device.fromRow(
          rows.first,
          currentUserId: SupabaseService.currentUser?.id,
          memberLevel: widget.device.accessLevel,
        );
        _now = DateTime.now();
      });
    }, onError: (Object error) => debugPrint('Device stream error: $error'));
    _eventsSubscription =
        SupabaseService.watchDeviceEvents(widget.device.id)?.listen((rows) {
      if (mounted) setState(() => _events = rows);
    }, onError: (Object error) => debugPrint('Events stream error: $error'));

    final connected = await _mqttService.connect(boxId: widget.device.serial);
    if (!connected || !mounted) return;
    _statusSubscription = _mqttService.statusStream.listen((data) {
      if (!mounted) return;
      setState(() {
        _now = DateTime.now();
        _mqttSeenAt = _now;
        final door = data['door']?.toString();
        if (door != null) _mqttDoorOpen = door == 'open';
        final lock = data['lock']?.toString();
        if (lock != null) {
          _mqttLock = lock == 'unlocked'
              ? DeviceLockState.unlocked
              : DeviceLockState.locked;
        }
      });
    });
    _sensorSubscription = _mqttService.sensorStream.listen((data) {
      if (!mounted) return;
      setState(() {
        _mqttPackage = data['package_detected'] == true;
        _mqttScaleReady = data['scale_ready'] == true;
        final weight = data['weight_kg'] ?? data['weight'];
        if (weight is num) _mqttWeight = weight.toDouble();
      });
    });
  }

  Future<void> _promptWifiProvisioning() async {
    final configure = await showConfirmDialog(
      context,
      title: context.tr(vi: 'Hộp chưa có Wi-Fi', en: 'Box is offline'),
      message: context.tr(
        vi: 'Hộp chưa kết nối mạng. Gửi Wi-Fi cho hộp qua Bluetooth ngay?',
        en: 'The box is not connected. Send it Wi-Fi over Bluetooth now?',
      ),
      confirmLabel: context.tr(vi: 'Kết nối Wi-Fi', en: 'Connect Wi-Fi'),
    );
    if (configure && mounted) _openWifi();
  }

  void _openWifi() {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) =>
          WifiProvisioningScreen(deviceSerial: widget.device.serial),
    ));
  }

  void _startHold() {
    if (!_canControl || _isSending || _isOpen) return;
    setState(() {
      _isHolding = true;
      _holdProgress = 0;
    });
    _holdTimer?.cancel();
    _holdTimer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (!mounted) return;
      setState(() =>
          _holdProgress = (_holdProgress + 0.035).clamp(0.0, 1.0).toDouble());
      if (_holdProgress >= 1) {
        timer.cancel();
        _sendCommand(DeviceLockState.unlocked);
      }
    });
  }

  void _cancelHold() {
    _holdTimer?.cancel();
    if (_isSending || !mounted) return;
    setState(() {
      _isHolding = false;
      _holdProgress = 0;
    });
  }

  /// Sends over MQTT (fast) and queues in Supabase (reliable); the firmware
  /// de-duplicates by command id.
  Future<void> _sendCommand(DeviceLockState target) async {
    if (!_canControl || _isSending) return;
    final unlock = target == DeviceLockState.unlocked;
    final command = unlock ? 'UNLOCK' : 'LOCK';
    setState(() {
      _isSending = true;
      _isHolding = false;
    });

    final commandId = SupabaseService.newDeviceCommandId();
    final sentByMqtt = _mqttService.sendCommand(widget.device.serial, {
      'command': command,
      'command_id': commandId,
    });
    final queued = await SupabaseService.queueDeviceCommand(
      commandId: commandId,
      deviceId: widget.device.id,
      command: command,
    );
    if (!mounted) return;
    final sent = sentByMqtt || queued;
    setState(() {
      if (sent) {
        _pendingLock = target;
        _pendingLockUntil = DateTime.now().add(const Duration(seconds: 12));
        _now = DateTime.now();
      }
      _isSending = false;
      _holdProgress = 0;
    });
    final name = _device.displayName;
    AppToast.show(
      context,
      message: !sent
          ? context.tr(
              vi: 'Không gửi được lệnh. Hãy kiểm tra kết nối mạng.',
              en: 'Could not send the command. Check your connection.')
          : unlock
              ? context.tr(
                  vi: 'Đã gửi lệnh mở khóa đến $name.',
                  en: 'Unlock sent to $name.')
              : context.tr(
                  vi: 'Đã gửi lệnh khóa đến $name.', en: 'Lock sent to $name.'),
      type: sent ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _changeBoxPin() async {
    final newPin = await showChangeDevicePinDialog(context);
    if (newPin == null || !mounted) return;
    final saved = await SupabaseService.setDeviceAccessPin(
      deviceId: widget.device.id,
      pin: newPin,
    );
    if (!mounted) return;
    AppToast.show(
      context,
      message: saved
          ? context.tr(
              vi: 'Đã cập nhật mã PIN của hộp.', en: 'The box PIN was updated.')
          : context.tr(
              vi: 'Không cập nhật được PIN. Hãy thử lại.',
              en: 'Could not update the PIN. Please try again.'),
      type: saved ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _createOneTimePin() async {
    final result = await SupabaseService.createOneTimeDevicePin(
      deviceId: widget.device.id,
      expiresMinutes: 30,
    );
    if (!mounted) return;
    if (result == null) {
      AppToast.show(
        context,
        message: context.tr(
          vi: 'Không tạo được PIN một lần. Hãy thử lại.',
          en: 'Could not create a one-time PIN. Please try again.',
        ),
        type: ToastType.error,
      );
      return;
    }
    await showOneTimePinCreatedDialog(context, result);
  }

  void _openMembers() {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => AccessScreen(
        initialDeviceId: widget.device.id,
        showBackButton: true,
      ),
    ));
  }

  Future<void> _unbind() async {
    final name = _device.displayName;
    final confirmed = await showConfirmDialog(
      context,
      title: context.tr(vi: 'Gỡ hộp khỏi tài khoản?', en: 'Remove this box?'),
      message: context.tr(
        vi: '$name sẽ không còn thuộc về bạn và mọi người được chia sẻ cũng mất quyền. Người khác có thể thêm hộp này sau đó.',
        en: '$name will no longer be yours and everyone it is shared with loses access. Someone else can add it afterwards.',
      ),
      confirmLabel: context.tr(vi: 'Gỡ hộp', en: 'Remove'),
      destructive: true,
    );
    if (!confirmed || !mounted) return;
    final success = await SupabaseService.unbindDevice(widget.device.id);
    if (!mounted) return;
    AppToast.show(
      context,
      message: success
          ? context.tr(vi: 'Đã gỡ $name.', en: '$name was removed.')
          : context.tr(
              vi: 'Không gỡ được hộp. Hãy thử lại.',
              en: 'Could not remove the box. Please try again.'),
      type: success ? ToastType.success : ToastType.error,
    );
    if (success) Navigator.pop(context, widget.device.id);
  }

  String _instruction() {
    if (!_canControl) {
      return context.tr(
          vi: 'Bạn chỉ có quyền xem', en: 'You have view-only access');
    }
    if (_isSending) {
      return context.tr(vi: 'Đang gửi lệnh...', en: 'Sending...');
    }
    if (_isOpen) return context.tr(vi: 'Chạm để khóa', en: 'Tap to lock');
    return _isHolding
        ? context.tr(vi: 'Tiếp tục giữ...', en: 'Keep holding...')
        : context.tr(vi: 'Giữ để mở khóa', en: 'Hold to unlock');
  }

  String _eventTime(dynamic value) {
    final time = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (time == null) return '';
    String two(int number) => number.toString().padLeft(2, '0');
    final today = DateUtils.isSameDay(time, _now);
    final clock = '${two(time.hour)}:${two(time.minute)}';
    return today ? clock : '$clock ${two(time.day)}/${two(time.month)}';
  }

  @override
  Widget build(BuildContext context) {
    final online = _isOnline;
    final battery = _device.batteryLevel;
    final weight = _weightKg;

    return AppPage(
      showBackButton: true,
      title: _device.displayName,
      subtitle: _device.location ?? _device.serial,
      children: [
        const SizedBox(height: AppSpacing.sm),
        _StatusPills(online: online, battery: battery),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapDown: (_) {
              if (!_isOpen) _startHold();
            },
            onTapUp: (_) => _cancelHold(),
            onTapCancel: _cancelHold,
            onTap: _isOpen && _canControl
                ? () => _sendCommand(DeviceLockState.locked)
                : null,
            child: Semantics(
              button: _canControl,
              label: _instruction(),
              child: AnimatedDeliveryBox(
                openFraction: _isOpen ? 1 : _holdProgress * 0.82,
                holdProgress: _isOpen ? 0 : _holdProgress,
                isOpen: _isOpen,
                isBusy: _isSending,
                instruction: _instruction(),
              ),
            ),
          ),
        ),
        SectionHeader(title: context.tr(vi: 'Trạng thái', en: 'Status')),
        _SensorGrid(
          lock: _lock,
          doorOpen: _doorOpen,
          packageDetected: _packageDetected,
          weightLabel:
              weight == null ? '--' : '${weight.toStringAsFixed(2)} kg',
          scaleReady: _scaleReady,
        ),
        SectionHeader(
          title: context.tr(vi: 'Hoạt động gần đây', en: 'Recent activity'),
        ),
        _ActivityList(
          events: _events.take(8).toList(),
          timeLabel: _eventTime,
        ),
        if (_isOwner)
          _OwnerActions(
            onOneTimePin: _createOneTimePin,
            onChangePin: _changeBoxPin,
            onWifi: _openWifi,
            onMembers: _openMembers,
            onUnbind: _unbind,
          ),
      ],
    );
  }
}

class _StatusPills extends StatelessWidget {
  final bool online;
  final int? battery;

  const _StatusPills({required this.online, required this.battery});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final level = battery;
    return Wrap(
      spacing: AppSpacing.xs,
      runSpacing: AppSpacing.xs,
      children: [
        StatusPill(
          label: online
              ? context.tr(vi: 'Trực tuyến', en: 'Online')
              : context.tr(vi: 'Ngoại tuyến', en: 'Offline'),
          color: online ? colors.locked : colors.offline,
        ),
        if (level != null)
          StatusPill(
            icon: level <= 20
                ? Icons.battery_alert_rounded
                : Icons.battery_std_rounded,
            label: context.tr(vi: 'Pin $level%', en: 'Battery $level%'),
            color: level <= 20 ? colors.alert : colors.teal,
          ),
      ],
    );
  }
}

/// Apple Home style 2x2 tiles; a tile turns bright when it needs attention.
class _SensorGrid extends StatelessWidget {
  final DeviceLockState lock;
  final bool doorOpen;
  final bool packageDetected;
  final String weightLabel;
  final bool scaleReady;

  const _SensorGrid({
    required this.lock,
    required this.doorOpen,
    required this.packageDetected,
    required this.weightLabel,
    required this.scaleReady,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final unlocked = lock == DeviceLockState.unlocked;
    final tiles = [
      ActionTile(
        icon: unlocked ? AppIcons.unlock : AppIcons.lock,
        color: switch (lock) {
          DeviceLockState.unlocked => colors.unlocked,
          DeviceLockState.locked => colors.locked,
          DeviceLockState.unknown => colors.offline,
        },
        title: context.tr(vi: 'Khóa', en: 'Lock'),
        subtitle: switch (lock) {
          DeviceLockState.unlocked => context.tr(vi: 'Đang mở', en: 'Unlocked'),
          DeviceLockState.locked => context.tr(vi: 'Đã khóa', en: 'Locked'),
          DeviceLockState.unknown => context.tr(vi: 'Không rõ', en: 'Unknown'),
        },
        active: unlocked,
      ),
      ActionTile(
        icon: doorOpen ? AppIcons.lidOpen : AppIcons.lid,
        color: doorOpen ? colors.unlocked : colors.teal,
        title: context.tr(vi: 'Nắp hộp', en: 'Lid'),
        subtitle: doorOpen
            ? context.tr(vi: 'Đang mở', en: 'Open')
            : context.tr(vi: 'Đã đóng', en: 'Closed'),
        active: doorOpen,
      ),
      ActionTile(
        icon: AppIcons.parcelFill,
        color: packageDetected ? colors.indigo : colors.offline,
        title: context.tr(vi: 'Kiện hàng', en: 'Parcel'),
        subtitle: packageDetected
            ? context.tr(vi: 'Có hàng', en: 'Inside')
            : context.tr(vi: 'Hộp trống', en: 'Empty'),
        active: packageDetected,
      ),
      ActionTile(
        icon: AppIcons.weight,
        color: scaleReady ? colors.accent : colors.offline,
        title: context.tr(vi: 'Cân nặng', en: 'Weight'),
        subtitle: scaleReady
            ? weightLabel
            : context.tr(vi: 'Cân chưa sẵn sàng', en: 'Scale not ready'),
      ),
    ];
    return Column(
      children: [
        for (var row = 0; row < tiles.length; row += 2) ...[
          if (row > 0) const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(child: tiles[row]),
              const SizedBox(width: AppSpacing.sm),
              Expanded(child: tiles[row + 1]),
            ],
          ),
        ],
      ],
    );
  }
}

class _ActivityList extends StatelessWidget {
  final List<Map<String, dynamic>> events;
  final String Function(dynamic createdAt) timeLabel;

  const _ActivityList({required this.events, required this.timeLabel});

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return AppCard(
        child: Builder(builder: (context) {
          return Row(
            children: [
              Icon(AppIcons.history, color: context.colors.textSecondary),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  context.tr(
                    vi: 'Chưa có hoạt động nào được ghi nhận.',
                    en: 'No activity recorded yet.',
                  ),
                  style: context.text.bodyMedium,
                ),
              ),
            ],
          );
        }),
      );
    }
    return GroupedSection(
      children: [
        for (final event in events)
          Builder(builder: (context) {
            final type = event['event_type']?.toString().toUpperCase() ?? '';
            return GroupedTile(
              leading: IconBadge(
                icon: DeviceEventStyle.icon(type),
                color: DeviceEventStyle.severity(type).color(context.colors),
                size: 30,
              ),
              title: DeviceEventStyle.label(context, type),
              value: timeLabel(event['created_at']),
              showChevron: false,
            );
          }),
      ],
    );
  }
}

class _OwnerActions extends StatelessWidget {
  final VoidCallback onOneTimePin;
  final VoidCallback onChangePin;
  final VoidCallback onWifi;
  final VoidCallback onMembers;
  final VoidCallback onUnbind;

  const _OwnerActions({
    required this.onOneTimePin,
    required this.onChangePin,
    required this.onWifi,
    required this.onMembers,
    required this.onUnbind,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GroupedSection(
          header: context.tr(vi: 'Quản lý hộp', en: 'Manage box'),
          children: [
            GroupedTile(
              leading: IconBadge(
                  icon: AppIcons.pinFill, color: colors.indigo, size: 30),
              title: context.tr(vi: 'Tạo PIN một lần', en: 'One-time PIN'),
              subtitle: context.tr(
                  vi: 'Cho người giao hàng, hết hạn sau 30 phút',
                  en: 'For a courier, expires in 30 minutes'),
              onTap: onOneTimePin,
            ),
            GroupedTile(
              leading: IconBadge(
                  icon: AppIcons.keyFill, color: colors.accent, size: 30),
              title: context.tr(vi: 'Đổi mã PIN của hộp', en: 'Change box PIN'),
              onTap: onChangePin,
            ),
            GroupedTile(
              leading:
                  IconBadge(icon: AppIcons.wifi, color: colors.teal, size: 30),
              title: context.tr(vi: 'Wi-Fi của hộp', en: 'Box Wi-Fi'),
              onTap: onWifi,
            ),
            GroupedTile(
              leading: IconBadge(
                  icon: AppIcons.sharingFill, color: colors.purple, size: 30),
              title: context.tr(vi: 'Thành viên', en: 'Members'),
              onTap: onMembers,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        GroupedSection(
          children: [
            GroupedTile(
              title: context.tr(vi: 'Gỡ hộp khỏi tài khoản', en: 'Remove box'),
              destructive: true,
              showChevron: false,
              onTap: onUnbind,
            ),
          ],
        ),
      ],
    );
  }
}
