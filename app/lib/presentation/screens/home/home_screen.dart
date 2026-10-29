import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/devices/device_controller.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/device.dart';
import '../../../services/device_command_service.dart';
import '../../../services/mqtt_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import 'add_device_qr_screen.dart';
import 'device_detail_screen.dart';
import 'notification_center_screen.dart';
import 'widgets/device_card.dart';
import 'widgets/getting_started_card.dart';
import 'widgets/home_shortcuts.dart';
import 'widgets/home_summary.dart';
import 'widgets/warning_banner.dart';

class HomeScreen extends StatefulWidget {
  /// Switches the main tab bar, e.g. to the PIN or Sharing tab.
  final ValueChanged<int> onOpenTab;

  const HomeScreen({super.key, required this.onOpenTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const _pinTab = 1;
  static const _sharingTab = 2;

  final _deviceController = globalDeviceController;
  Timer? _clock;
  final Set<String> _busyIds = {};
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    MqttService().connect();
    _deviceController.addListener(_onDevicesChanged);
    _clock = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _deviceController.removeListener(_onDevicesChanged);
    _clock?.cancel();
    super.dispose();
  }

  void _onDevicesChanged() {
    if (mounted) setState(() => _now = DateTime.now());
  }

  Future<void> _refresh() => _deviceController.refresh();

  String _greeting(BuildContext context) {
    final hour = _now.hour;
    final name = SupabaseService.cachedUserName;
    if (hour < 11) {
      return context.tr(vi: 'Chào buổi sáng, $name', en: 'Good morning, $name');
    }
    if (hour < 14) {
      return context.tr(
          vi: 'Chào buổi trưa, $name', en: 'Good afternoon, $name');
    }
    if (hour < 18) {
      return context.tr(
          vi: 'Chào buổi chiều, $name', en: 'Good afternoon, $name');
    }
    return context.tr(vi: 'Chào buổi tối, $name', en: 'Good evening, $name');
  }

  Future<void> _toggleLock(Device device) async {
    final command =
        device.isUnlocked ? DeviceCommand.lock : DeviceCommand.unlock;
    if (command == DeviceCommand.unlock) {
      final confirmed = await showConfirmDialog(
        context,
        title: context.tr(vi: 'Mở khóa hộp?', en: 'Unlock box?'),
        message: context.tr(
          vi: '${device.displayName} sẽ mở chốt để có thể lấy hàng.',
          en: '${device.displayName} will release its latch.',
        ),
        confirmLabel: context.tr(vi: 'Mở khóa', en: 'Unlock'),
      );
      if (!confirmed || !mounted) return;
    }

    setState(() => _busyIds.add(device.id));
    final sent = await DeviceCommandService.send(
      deviceId: device.id,
      serial: device.serial,
      command: command,
    );
    if (!mounted) return;
    setState(() => _busyIds.remove(device.id));
    AppToast.show(
      context,
      message: sent
          ? (command == DeviceCommand.unlock
              ? context.tr(
                  vi: 'Đã gửi lệnh mở khóa ${device.displayName}.',
                  en: 'Unlock sent to ${device.displayName}.')
              : context.tr(
                  vi: 'Đã gửi lệnh khóa ${device.displayName}.',
                  en: 'Lock sent to ${device.displayName}.'))
          : context.tr(
              vi: 'Không gửi được lệnh. Hãy kiểm tra kết nối mạng.',
              en: 'Could not send the command. Check your connection.'),
      type: sent ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _openDetail(Device device) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DeviceDetailScreen(device: device),
      ),
    );
  }

  Future<void> _addDevice() async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(builder: (_) => const AddDeviceQrScreen()),
    );
    if (result == null || !mounted) return;
    await NotificationService.create(
      type: 'device_added',
      title: 'Device added',
      body: context.tr(
        vi: 'Thiết bị ${result['name']} đã được thêm vào tài khoản.',
        en: '${result['name']} was added to your account.',
      ),
    );
  }

  void _openNotifications() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const NotificationCenterScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final devices = _deviceController.devices;
    return AppPage(
      title: context.tr(vi: 'Thiết bị', en: 'Devices'),
      subtitle: _greeting(context),
      onRefresh: _refresh,
      actions: [
        ListenableBuilder(
          listenable: globalNotificationController,
          builder: (context, _) {
            final unread = globalNotificationController.unreadCount;
            return IconButton(
              tooltip: context.tr(vi: 'Thông báo', en: 'Notifications'),
              onPressed: _openNotifications,
              icon: Badge(
                isLabelVisible: unread > 0,
                label: Text(unread > 9 ? '9+' : '$unread'),
                child: const Icon(AppIcons.notifications),
              ),
            );
          },
        ),
        IconButton(
          tooltip: context.tr(vi: 'Thêm hộp', en: 'Add box'),
          onPressed: _addDevice,
          icon: const Icon(AppIcons.add),
        ),
      ],
      children: [
        const SizedBox(height: AppSpacing.md),
        if (_deviceController.loading)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.xxl),
            child: Center(child: CircularProgressIndicator.adaptive()),
          )
        else if (devices.isEmpty)
          GettingStartedCard(onAddDevice: _addDevice)
        else ...[
          HomeSummary(devices: devices, now: _now),
          SectionHeader(
            title: context.tr(vi: 'Hộp nhận hàng', en: 'Delivery boxes'),
          ),
          WarningBanner(onOpen: _openNotifications),
          for (final device in devices)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: DeviceCard(
                device: device,
                isOnline: device.isOnlineAt(_now),
                isBusy: _busyIds.contains(device.id),
                onTap: () => _openDetail(device),
                onToggleLock:
                    device.canControl ? () => _toggleLock(device) : null,
              ),
            ),
        ],
        SectionHeader(title: context.tr(vi: 'Lối tắt', en: 'Shortcuts')),
        HomeShortcuts(
          onPins: () => widget.onOpenTab(_pinTab),
          onSharing: () => widget.onOpenTab(_sharingTab),
          onNotifications: _openNotifications,
          onAddDevice: _addDevice,
        ),
      ],
    );
  }
}
