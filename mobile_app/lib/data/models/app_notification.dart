import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';

enum NotificationSeverity { info, success, warning, danger }

class AppNotification {
  final String id;
  final String? deviceId;
  final String type;
  final String title;
  final String? body;
  final bool isRead;
  final DateTime createdAt;

  const AppNotification({
    required this.id,
    required this.deviceId,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'].toString(),
      deviceId: json['device_id'] as String?,
      type: json['type'] as String? ?? 'system',
      title: json['title'] as String? ?? '',
      body: json['body'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  NotificationSeverity get severity => switch (type) {
        'low_battery' ||
        'device_offline' ||
        'pin_expired' =>
          NotificationSeverity.warning,
        'security_alert' => NotificationSeverity.danger,
        'device_online' ||
        'remote_unlock' ||
        'box_unlocked' ||
        'door_closed' ||
        'parcel_detected' ||
        'parcel_delivered' ||
        'device_added' ||
        'pin_created' =>
          NotificationSeverity.success,
        _ => NotificationSeverity.info,
      };

  IconData get icon => switch (type) {
        'low_battery' => Icons.battery_alert_rounded,
        'device_offline' => Icons.cloud_off_rounded,
        'device_online' => Icons.cloud_done_rounded,
        'remote_unlock' => Icons.lock_open_rounded,
        'box_unlocked' => Icons.lock_open_rounded,
        'door_opened' => Icons.door_front_door_rounded,
        'door_closed' => Icons.door_front_door_outlined,
        'parcel_detected' => Icons.inventory_2_rounded,
        'parcel_delivered' => Icons.inventory_rounded,
        'device_added' => Icons.add_to_home_screen_rounded,
        'access_invited' => Icons.person_add_alt_1_rounded,
        'access_revoked' => Icons.person_remove_alt_1_rounded,
        'pin_created' || 'pin_used' || 'pin_expired' => Icons.pin_rounded,
        'profile_updated' => Icons.manage_accounts_rounded,
        'password_changed' || 'security_alert' => Icons.shield_rounded,
        _ => Icons.notifications_rounded,
      };

  String localizedTitle(BuildContext context) => switch (type) {
        'low_battery' =>
          context.tr(vi: 'Pin thiết bị yếu', en: 'Low device battery'),
        'device_offline' =>
          context.tr(vi: 'Thiết bị mất kết nối', en: 'Device offline'),
        'device_online' =>
          context.tr(vi: 'Thiết bị đã kết nối', en: 'Device online'),
        'remote_unlock' =>
          context.tr(vi: 'Đã mở khóa từ xa', en: 'Remote unlock completed'),
        'box_unlocked' =>
          context.tr(vi: 'Hộp đã được mở khóa', en: 'Box unlocked'),
        'door_opened' => context.tr(vi: 'Nắp hộp đã mở', en: 'Box door opened'),
        'door_closed' =>
          context.tr(vi: 'Nắp hộp đã đóng', en: 'Box door closed'),
        'parcel_detected' =>
          context.tr(vi: 'Đã nhận kiện hàng', en: 'Parcel detected'),
        'parcel_delivered' => context.tr(
            vi: 'Kiện hàng đã được khóa an toàn', en: 'Parcel secured'),
        'device_added' =>
          context.tr(vi: 'Đã thêm thiết bị', en: 'Device added'),
        'access_invited' => context.tr(
            vi: 'Bạn được chia sẻ một hộp', en: 'A box was shared with you'),
        'access_revoked' => context.tr(
            vi: 'Quyền truy cập đã bị thu hồi', en: 'Your access was revoked'),
        'pin_created' => context.tr(vi: 'Đã tạo mã PIN', en: 'PIN created'),
        'pin_used' => context.tr(vi: 'Mã PIN đã được dùng', en: 'PIN used'),
        'pin_expired' => context.tr(vi: 'Mã PIN đã hết hạn', en: 'PIN expired'),
        'profile_updated' =>
          context.tr(vi: 'Hồ sơ đã cập nhật', en: 'Profile updated'),
        'password_changed' =>
          context.tr(vi: 'Mật khẩu đã thay đổi', en: 'Password changed'),
        'security_alert' =>
          context.tr(vi: 'Cảnh báo bảo mật', en: 'Security alert'),
        _ => title.isEmpty
            ? context.tr(vi: 'Thông báo hệ thống', en: 'System notification')
            : title,
      };

  String localizedBody(BuildContext context) {
    if (body?.isNotEmpty == true) return body!;
    return context.tr(vi: 'Nhấn để xem chi tiết.', en: 'Tap to view details.');
  }
}
