import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';

/// The app-wide event tone: green = success, blue = info, orange =
/// needs attention, red = danger. Toasts, notifications, the Home banner
/// and the device history all take their color from here.
enum NotificationSeverity { info, success, warning, danger }

extension NotificationSeverityColor on NotificationSeverity {
  Color color(AppColors colors) => switch (this) {
        NotificationSeverity.success => colors.locked,
        NotificationSeverity.info => colors.accent,
        NotificationSeverity.warning => colors.unlocked,
        NotificationSeverity.danger => colors.alert,
      };
}

enum NotificationCategory { device, access, system }

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

  AppNotification copyWith({bool? isRead}) => AppNotification(
        id: id,
        deviceId: deviceId,
        type: type,
        title: title,
        body: body,
        isRead: isRead ?? this.isRead,
        createdAt: createdAt,
      );

  NotificationCategory get category => switch (type) {
        'low_battery' ||
        'device_offline' ||
        'device_online' ||
        'remote_unlock' ||
        'box_unlocked' ||
        'door_opened' ||
        'door_closed' ||
        'parcel_detected' ||
        'parcel_delivered' ||
        'device_added' =>
          NotificationCategory.device,
        'access_invited' ||
        'access_revoked' ||
        'pin_created' ||
        'pin_used' ||
        'pin_expired' =>
          NotificationCategory.access,
        _ => NotificationCategory.system,
      };

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
        'low_battery' => AppIcons.warning,
        'device_offline' => AppIcons.wifiOff,
        'device_online' => AppIcons.wifi,
        'remote_unlock' => AppIcons.unlock,
        'box_unlocked' => AppIcons.unlock,
        'door_opened' => AppIcons.lidOpen,
        'door_closed' => AppIcons.lid,
        'parcel_detected' => AppIcons.boxFill,
        'parcel_delivered' => AppIcons.parcelFill,
        'device_added' => AppIcons.boxFill,
        'access_invited' => AppIcons.userAdd,
        'access_revoked' => AppIcons.userRemove,
        'pin_created' || 'pin_used' || 'pin_expired' => AppIcons.pinFill,
        'profile_updated' => AppIcons.profileEdit,
        'password_changed' || 'security_alert' => AppIcons.security,
        _ => AppIcons.notificationsFill,
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
        // The device RPC stores a specific Vietnamese title per alert.
        'security_alert' => switch (title) {
            'Cảnh báo mở hộp trái phép' => context.tr(
                vi: 'Cảnh báo mở hộp trái phép', en: 'Box opened while locked'),
            'Bàn phím tạm khóa' =>
              context.tr(vi: 'Bàn phím tạm khóa', en: 'Keypad locked'),
            _ => context.tr(vi: 'Cảnh báo bảo mật', en: 'Security alert'),
          },
        _ => title.isEmpty
            ? context.tr(vi: 'Thông báo hệ thống', en: 'System notification')
            : title,
      };

  /// Body text, or an empty string when there is none. Server-generated
  /// bodies are stored in Vietnamese, so known templates are translated.
  String localizedBody(BuildContext context) {
    final text = body?.trim() ?? '';
    if (text.isEmpty || !globalLanguageController.isEnglish) return text;
    for (final (pattern, english) in _serverBodies) {
      final match = pattern.firstMatch(text);
      if (match == null) continue;
      return english.replaceAllMapped(RegExp(r'\$(\d)'), (ref) {
        final value = match.group(int.parse(ref.group(1)!))!;
        return _englishTerms[value] ?? value;
      });
    }
    return text;
  }

  /// Vietnamese bodies written by the Supabase RPCs, most specific first.
  static final _serverBodies = <(RegExp, String)>[
    (
      RegExp(r'^(.+) vừa nhận lệnh mở khóa từ (.+)\.$'),
      r'$1 received an unlock command from $2.'
    ),
    (
      RegExp(r'^(.+) vừa nhận lệnh mở khóa\.$'),
      r'$1 received an unlock command.'
    ),
    (
      RegExp(r'^(.+) vừa được mở bằng PIN một lần\.$'),
      r'$1 was opened with a one-time PIN.'
    ),
    (
      RegExp(r'^(.+) vừa được chia sẻ với bạn \((.+)\)\.$'),
      r'$1 was shared with you ($2).'
    ),
    (RegExp(r'^(.+) vừa được mở\.$'), r'$1 was opened.'),
    (RegExp(r'^(.+) đã được đóng lại\.$'), r'$1 was closed.'),
    (RegExp(r'^(.+) bị mở khi đang khóa\.$'), r'$1 was opened while locked.'),
    (
      RegExp(r'^Cân điện tử phát hiện hàng trong (.+)\.$'),
      r'The scale detected a parcel in $1.'
    ),
    (
      RegExp(r'^(.+) đã đóng và khóa sau khi nhận hàng\.$'),
      r'$1 closed and locked after the delivery.'
    ),
    (
      RegExp(r'^Có quá nhiều lần nhập mã sai trên (.+)\.$'),
      r'Too many wrong codes were entered on $1.'
    ),
    (RegExp(r'^(.+) đang trực tuyến\.$'), r'$1 is online.'),
    (
      RegExp(r'^Bạn không còn quyền truy cập (.+)\.$'),
      r'You no longer have access to $1.'
    ),
  ];

  static const _englishTerms = {
    'toàn quyền': 'full access',
    'chỉ xem': 'view only',
    'ứng dụng': 'the app',
  };
}
