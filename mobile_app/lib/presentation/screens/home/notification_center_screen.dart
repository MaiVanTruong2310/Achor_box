import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../data/models/app_notification.dart';
import '../../widgets/ios26_back_button.dart';
import '../../widgets/liquid_glass_segmented_control.dart';
import '../../widgets/neon_bubble_background.dart';
import '../../widgets/notification_tile.dart';

class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() =>
      _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  int _filter = 0;

  bool _matches(AppNotification item) => switch (_filter) {
        1 => {
            'low_battery',
            'device_offline',
            'device_online',
            'remote_unlock',
            'box_unlocked',
            'door_opened',
            'door_closed',
            'parcel_detected',
            'parcel_delivered',
            'device_added'
          }.contains(item.type),
        2 => {
            'access_invited',
            'access_revoked',
            'pin_created',
            'pin_used',
            'pin_expired'
          }.contains(item.type),
        3 => {'profile_updated', 'password_changed', 'security_alert', 'system'}
            .contains(item.type),
        _ => true,
      };

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: AnimatedBuilder(
            animation: globalNotificationController,
            builder: (context, child) {
              final items =
                  globalNotificationController.items.where(_matches).toList();
              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                    child: Row(
                      children: [
                        const Ios26BackButton(),
                        Expanded(
                          child: Text(
                            context.tr(vi: 'Thông báo', en: 'Notifications'),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: textColor),
                          ),
                        ),
                        SizedBox(
                          width: 88,
                          child: TextButton(
                            onPressed:
                                globalNotificationController.unreadCount == 0
                                    ? null
                                    : globalNotificationController.markAllRead,
                            child: Text(
                                context.tr(vi: 'Đọc hết', en: 'Read all'),
                                maxLines: 1),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: LiquidGlassSegmentedControl(
                      height: 44,
                      borderRadius: 22,
                      selectorBorderRadius: 18,
                      selectedIndex: _filter,
                      OnItemSelected: (index) =>
                          setState(() => _filter = index),
                      items: [
                        LiquidGlassSegmentItem(
                            label: context.tr(vi: 'Tất cả', en: 'All')),
                        LiquidGlassSegmentItem(
                            label: context.tr(vi: 'Thiết bị', en: 'Devices')),
                        LiquidGlassSegmentItem(
                            label: context.tr(vi: 'Truy cập', en: 'Access')),
                        LiquidGlassSegmentItem(
                            label: context.tr(vi: 'Hệ thống', en: 'System')),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Expanded(
                    child: items.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.notifications_none_rounded,
                                    size: 52,
                                    color: textColor.withValues(alpha: 0.35)),
                                const SizedBox(height: 12),
                                Text(
                                    context.tr(
                                        vi: 'Chưa có thông báo',
                                        en: 'No notifications yet'),
                                    style: TextStyle(
                                        color: textColor,
                                        fontWeight: FontWeight.w600)),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                            itemCount: items.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final item = items[index];
                              return NotificationTile(
                                notification: item,
                                onTap: () => globalNotificationController
                                    .markRead(item.id),
                                onDelete: () => globalNotificationController
                                    .delete(item.id),
                              );
                            },
                          ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
