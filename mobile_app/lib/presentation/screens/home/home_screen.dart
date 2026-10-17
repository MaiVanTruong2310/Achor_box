import 'dart:async';

import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../services/mqtt_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/liquid_glass_segmented_control.dart';
import '../../widgets/neon_bubble_background.dart';
import 'add_device_qr_screen.dart';
import 'device_detail_screen.dart';
import 'notification_center_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => HomeScreenState();
}

class HomeScreenState extends State<HomeScreen>
    with AutomaticKeepAliveClientMixin {
  static const _onlineTimeout = Duration(seconds: 90);
  int _selectedFilterIndex = 0; // 0: All, 1: Online, 2: Alerts

  final MqttService _mqttService = MqttService();
  bool _isUnlocking = false;
  late String _userName;

  final List<Map<String, dynamic>> _devices = [];
  final Set<String> _recentlyUnboundDeviceIds = {};
  StreamSubscription<List<Map<String, dynamic>>>? _devicesSubscription;
  Timer? _onlineRefreshTimer;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _userName = SupabaseService.cachedUserName;
    _mqttService.connect();
    _loadUserProfile();
    _listenToDevices();
    _onlineRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (!mounted) return;
      setState(() {
        for (final device in _devices) {
          final lastSeen =
              DateTime.tryParse(device['lastSeenAt']?.toString() ?? '');
          device['isOnline'] = lastSeen != null &&
              DateTime.now().toUtc().difference(lastSeen.toUtc()) <
                  _onlineTimeout;
          device['statusText'] =
              device['isOnline'] == true ? 'Online' : 'Offline';
        }
      });
    });
  }

  void _listenToDevices() {
    final stream = SupabaseService.getDevicesStream();
    if (stream == null) return;

    _devicesSubscription = stream.listen((rows) {
      if (!mounted) return;
      setState(() {
        _devices
          ..clear()
          ..addAll(rows
              .where((row) =>
                  !_recentlyUnboundDeviceIds.contains(row['id']?.toString()))
              .map(_mapDatabaseDevice));
      });
    });
  }

  Map<String, dynamic> _mapDatabaseDevice(Map<String, dynamic> row) {
    final status = row['status']?.toString().toLowerCase() ?? 'offline';
    final lastSeen = DateTime.tryParse(row['last_seen_at']?.toString() ?? '');
    final isRecentlySeen = lastSeen != null &&
        DateTime.now().toUtc().difference(lastSeen.toUtc()) < _onlineTimeout;
    final battery = row['battery_level'];
    final weight = row['weight_kg'] ?? row['weight'];
    final lock = row['lock_status']?.toString();

    return {
      'id': row['id'],
      'serial': row['serial_number'],
      'mqttTopicId': row['serial_number'],
      'name': row['name'] ?? row['serial_number'] ?? 'Hộp giao hàng',
      'isOnline': status == 'online' && isRecentlySeen,
      'statusText': status == 'online' && isRecentlySeen ? 'Online' : 'Offline',
      'lastSeenAt': row['last_seen_at'],
      'locationText': row['location_label'] ?? 'Chưa thiết lập vị trí',
      'batteryLevel': battery == null ? '--' : '$battery%',
      'timeAgo': 'Đã đồng bộ',
      'hasAlert': status == 'alert' || row['has_alert'] == true,
      'weight': weight == null ? '--' : '$weight kg',
      'lockStatus': lock == null
          ? 'Không rõ'
          : (lock.toLowerCase() == 'unlocked' ? 'Mở' : 'Đóng'),
      'icon': Icons.inventory_2_outlined,
    };
  }

  @override
  void dispose() {
    _devicesSubscription?.cancel();
    _onlineRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadUserProfile() async {
    final user = SupabaseService.currentUser;
    if (user != null) {
      final profile = await SupabaseService.getCurrentProfile();
      if (mounted &&
          profile != null &&
          profile['full_name'] != null &&
          (profile['full_name'] as String).isNotEmpty) {
        setState(() {
          _userName = profile['full_name'];
        });
      } else if (mounted && user.userMetadata?['full_name'] != null) {
        setState(() {
          _userName = user.userMetadata!['full_name'];
        });
      }
    }
  }

  Future<void> _handleRemoteUnlock(Map<String, dynamic> device) async {
    setState(() {
      _isUnlocking = true;
    });

    final String topicId =
        device['serial'] ?? device['mqttTopicId'] ?? 'DBX-98C377AD9D60';
    final commandId = SupabaseService.newDeviceCommandId();
    final sentByMqtt = _mqttService.sendCommand(topicId, {
      'command': 'UNLOCK',
      'command_id': commandId,
    });
    final queued = await SupabaseService.queueDeviceCommand(
      commandId: commandId,
      deviceId: device['id'].toString(),
      command: 'UNLOCK',
    );
    if (!sentByMqtt && !queued) {
      if (mounted) {
        setState(() => _isUnlocking = false);
        AppToast.show(
          context,
          message: context.tr(
            vi: 'Không thể gửi lệnh mở khóa. Hãy kiểm tra kết nối mạng.',
            en: 'Unable to send unlock command. Check your connection.',
          ),
          type: ToastType.error,
        );
      }
      return;
    }

    AppToast.show(
      context,
      message: context.tr(
          vi: "Đã gửi lệnh MỞ KHÓA TỪ XA đến ${device['name']}!",
          en: "Remote UNLOCK command sent to ${device['name']}!"),
      type: ToastType.success,
    );
    await NotificationService.create(
      type: 'remote_unlock',
      title: 'Remote unlock',
      body: context.tr(
        vi: 'Đã gửi lệnh mở khóa đến ${device['name']}.',
        en: 'An unlock command was sent to ${device['name']}.',
      ),
    );

    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() {
        _isUnlocking = false;
      });
    }
  }

  Future<void> _openDeviceDetail(Map<String, dynamic> device) async {
    final unboundDeviceId = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (context) => DeviceDetailScreen(
          deviceId: device['id'].toString(),
          mqttTopicId:
              device['serial'] ?? device['mqttTopicId'] ?? 'DBX-98C377AD9D60',
          boxName: device['name'],
          isOnline: device['isOnline'],
          statusText: device['statusText'],
          locationText: device['locationText'],
          batteryLevel: device['batteryLevel'],
          weight: device['weight'] ?? "--",
          lockStatus: device['lockStatus'] ?? "Không rõ",
        ),
      ),
    );
    if (!mounted || unboundDeviceId == null) return;
    setState(() {
      _recentlyUnboundDeviceIds.add(unboundDeviceId);
      _devices.removeWhere((item) => item['id']?.toString() == unboundDeviceId);
    });
  }

  Future<void> showAddDeviceModal() async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (context) => const AddDeviceQrScreen(),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _recentlyUnboundDeviceIds.remove(result['id']?.toString());
        final existingIndex =
            _devices.indexWhere((device) => device['id'] == result['id']);
        if (existingIndex >= 0) {
          _devices[existingIndex] = result;
        } else {
          _devices.insert(0, result);
        }
      });
      await NotificationService.create(
        type: 'device_added',
        title: 'Device added',
        body: context.tr(
          vi: 'Thiết bị ${result['name']} đã được thêm vào tài khoản.',
          en: '${result['name']} was added to your account.',
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    // Filter devices based on tab
    List<Map<String, dynamic>> filteredDevices = _devices;
    if (_selectedFilterIndex == 1) {
      filteredDevices = _devices.where((d) => d['isOnline'] == true).toList();
    } else if (_selectedFilterIndex == 2) {
      filteredDevices = _devices.where((d) => d['hasAlert'] == true).toList();
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      animate: true,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Stack(
            children: [
              // Main Scrollable Body
              SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 110),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Header Row: Avatar, Greeting & Actions
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            // User Profile Avatar Circle
                            ValueListenableBuilder<String?>(
                              valueListenable:
                                  SupabaseService.avatarUrlNotifier,
                              builder: (context, liveAvatarUrl, child) {
                                final avatarUrl = liveAvatarUrl ??
                                    SupabaseService.cachedAvatarUrl;
                                return Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient:
                                        (avatarUrl == null || avatarUrl.isEmpty)
                                            ? LinearGradient(
                                                colors: [
                                                  AppColors.brandBlue,
                                                  const Color(0xFF6366F1),
                                                ],
                                              )
                                            : null,
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.brandBlue
                                            .withOpacity(0.3),
                                        blurRadius: 10,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                    border: Border.all(
                                      color: Colors.white.withOpacity(0.8),
                                      width: 1.5,
                                    ),
                                    image: (avatarUrl != null &&
                                            avatarUrl.isNotEmpty)
                                        ? DecorationImage(
                                            image: NetworkImage(avatarUrl),
                                            fit: BoxFit.cover,
                                          )
                                        : null,
                                  ),
                                  child: (avatarUrl == null ||
                                          avatarUrl.isEmpty)
                                      ? Center(
                                          child: Text(
                                            _userName.isEmpty
                                                ? '?'
                                                : _userName[0].toUpperCase(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 19,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        )
                                      : null,
                                );
                              },
                            ),
                            const SizedBox(width: 12),

                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  context.tr(
                                      vi: "Chào buổi sáng,",
                                      en: "Good morning,"),
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: isDark
                                        ? const Color(0xFFB8C4D8)
                                        : AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                ValueListenableBuilder<String?>(
                                  valueListenable:
                                      SupabaseService.userNameNotifier,
                                  builder: (context, liveName, child) => Text(
                                    liveName?.trim().isNotEmpty == true
                                        ? liveName!
                                        : _userName,
                                    style: TextStyle(
                                      fontSize: 21,
                                      fontWeight: FontWeight.w700,
                                      color: isDark
                                          ? const Color(0xFFF8FAFC)
                                          : AppColors.textPrimary,
                                      letterSpacing: -0.3,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),

                        // Notification Bell Badge Icon
                        AnimatedBuilder(
                          animation: globalNotificationController,
                          builder: (context, child) => LiquidGlassContainer(
                            borderRadius: 16.0,
                            blur: 16.0,
                            tintOpacity: 0.12,
                            padding: EdgeInsets.zero,
                            child: SizedBox(
                              width: 44,
                              height: 44,
                              child: Stack(
                                children: [
                                  Center(
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      icon: Icon(
                                        Icons.notifications_none_outlined,
                                        size: 22,
                                        color: isDark
                                            ? const Color(0xFFF1F5F9)
                                            : AppColors.textPrimary,
                                      ),
                                      onPressed: () =>
                                          Navigator.of(context).push(
                                        MaterialPageRoute(
                                            builder: (_) =>
                                                const NotificationCenterScreen()),
                                      ),
                                    ),
                                  ),
                                  if (globalNotificationController.unreadCount >
                                      0)
                                    Positioned(
                                      right: 4,
                                      top: 3,
                                      child: Container(
                                        constraints: const BoxConstraints(
                                            minWidth: 17, minHeight: 17),
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 4),
                                        decoration: const BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: Color(0xFFEF4444)),
                                        alignment: Alignment.center,
                                        child: Text(
                                          globalNotificationController
                                                      .unreadCount >
                                                  9
                                              ? '9+'
                                              : '${globalNotificationController.unreadCount}',
                                          style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // 2. Search Bar Row
                    LiquidGlassContainer(
                      borderRadius: 18.0,
                      blur: 18.0,
                      tintOpacity: 0.12,
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: SizedBox(
                        height: 50,
                        child: Row(
                          children: [
                            Icon(
                              Icons.search,
                              size: 21,
                              color: isDark
                                  ? const Color(0xFF94A3B8)
                                  : AppColors.textMuted,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isDark
                                      ? const Color(0xFFF1F5F9)
                                      : AppColors.textPrimary,
                                ),
                                decoration: InputDecoration(
                                  hintText: context.tr(
                                      vi: "Tìm kiếm thiết bị...",
                                      en: "Search devices..."),
                                  hintStyle: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w400,
                                    color: isDark
                                        ? const Color(0xFF94A3B8)
                                        : AppColors.textMuted,
                                  ),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 3. High-priority device warning
                    AnimatedBuilder(
                      animation: globalNotificationController,
                      builder: (context, child) {
                        final warning =
                            globalNotificationController.latestWarning;
                        if (warning == null) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: LiquidGlassContainer(
                            borderRadius: 16,
                            blur: 16,
                            tintOpacity: 0.14,
                            borderColor: const Color(0xFFF59E0B)
                                .withValues(alpha: isDark ? 0.22 : 0.6),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 11),
                            onTap: () {
                              globalNotificationController.markRead(warning.id);
                              Navigator.of(context).push(MaterialPageRoute(
                                  builder: (_) =>
                                      const NotificationCenterScreen()));
                            },
                            child: Row(
                              children: [
                                Icon(warning.icon,
                                    color: const Color(0xFFF59E0B), size: 21),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    warning.localizedBody(context),
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      height: 1.3,
                                      fontWeight: FontWeight.w500,
                                      color: isDark
                                          ? const Color(0xFFFBBF24)
                                          : const Color(0xFF92400E),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

                    // 4. Sliding Segmented Control Filters
                    LiquidGlassSegmentedControl(
                      height: 44.0,
                      borderRadius: 22.0,
                      selectorBorderRadius: 18.0,
                      selectedIndex: _selectedFilterIndex,
                      OnItemSelected: (index) {
                        setState(() {
                          _selectedFilterIndex = index;
                        });
                      },
                      items: [
                        LiquidGlassSegmentItem(
                            label: context.tr(vi: "Tất cả", en: "All")),
                        LiquidGlassSegmentItem(
                            label: context.tr(vi: "Trực tuyến", en: "Online")),
                        LiquidGlassSegmentItem(
                            label: context.tr(vi: "Cảnh báo", en: "Alerts")),
                      ],
                    ),
                    const SizedBox(height: 20),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          context.tr(
                              vi: "Thiết bị của bạn", en: "Your devices"),
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: isDark
                                ? const Color(0xFFF8FAFC)
                                : AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          context.tr(
                              vi: "${filteredDevices.length} thiết bị",
                              en: "${filteredDevices.length} devices"),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: isDark
                                ? const Color(0xFFB8C4D8)
                                : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 5. Device Cards List
                    ...filteredDevices.map((device) => Padding(
                          padding: const EdgeInsets.only(bottom: 14.0),
                          child: _buildDeviceCard(
                            boxName: device['name'],
                            isOnline: device['isOnline'],
                            statusText: device['statusText'],
                            locationText: device['locationText'],
                            batteryLevel: device['batteryLevel'],
                            timeAgo: device['timeAgo'],
                            iconData:
                                device['icon'] ?? Icons.inventory_2_outlined,
                            onCardTap: () => _openDeviceDetail(device),
                            onUnlockTap: () => _handleRemoteUnlock(device),
                          ),
                        )),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDeviceCard({
    required String boxName,
    required bool isOnline,
    required String statusText,
    required String locationText,
    required String batteryLevel,
    required String timeAgo,
    required IconData iconData,
    required VoidCallback onCardTap,
    required VoidCallback onUnlockTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText =
        isDark ? const Color(0xFFF1F5F9) : AppColors.textPrimary;
    final secondaryText =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;
    final mutedText = isDark ? const Color(0xFF7F91A8) : AppColors.textMuted;
    final statusColor =
        isOnline ? const Color(0xFF10B981) : const Color(0xFFF59E0B);

    return LiquidGlassContainer(
      borderRadius: 22.0,
      blur: 18.0,
      tintOpacity: 0.18,
      padding: const EdgeInsets.all(16.0),
      onTap: onCardTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: isDark
                        ? const [Color(0xFF334155), Color(0xFF1E293B)]
                        : const [Color(0xFFE2E8F0), Color(0xFFCBD5E1)],
                  ),
                  border: Border.all(
                    color: Colors.white.withOpacity(isDark ? 0.15 : 0.4),
                  ),
                ),
                child: Icon(
                  iconData,
                  size: 30,
                  color: isDark ? const Color(0xFF38BDF8) : AppColors.brandBlue,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            boxName,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: primaryText,
                            ),
                          ),
                        ),
                        Container(
                          width: 7,
                          height: 7,
                          margin: const EdgeInsets.only(right: 5),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: statusColor,
                          ),
                        ),
                        Text(
                          statusText,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: statusColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      locationText,
                      style: TextStyle(
                        fontSize: 13,
                        color: secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Icon(Icons.battery_5_bar, size: 15, color: secondaryText),
              const SizedBox(width: 4),
              Text(
                batteryLevel,
                style: TextStyle(fontSize: 12, color: secondaryText),
              ),
              const SizedBox(width: 10),
              Container(
                width: 3,
                height: 3,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: mutedText,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                timeAgo,
                style: TextStyle(fontSize: 12, color: secondaryText),
              ),
              const Spacer(),
              SizedBox(
                height: 40,
                child: ElevatedButton.icon(
                  onPressed: _isUnlocking ? null : onUnlockTap,
                  icon: const Icon(
                    Icons.lock_open_rounded,
                    size: 16,
                    color: Colors.white,
                  ),
                  label: Text(
                    context.tr(vi: "MỞ KHÓA", en: "UNLOCK"),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandBlue,
                    padding: const EdgeInsets.symmetric(horizontal: 15),
                    elevation: 1,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(13),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
