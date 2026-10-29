import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';
import 'app_notification.dart';

/// Presentation of a `public.device_events` row (technical log written by
/// the firmware RPCs, `event_type` in upper snake case).
abstract final class DeviceEventStyle {
  static NotificationSeverity severity(String type) => switch (type) {
        'UNAUTHORIZED_OPEN' || 'KEYPAD_LOCKED' => NotificationSeverity.danger,
        'WRONG_PIN' ||
        'LOW_BATTERY' ||
        'OFFLINE' =>
          NotificationSeverity.warning,
        'ONLINE' ||
        'PACKAGE_DETECTED' ||
        'PACKAGE_DELIVERED' ||
        'DOOR_CLOSED' ||
        'REMOTE_LOCK' ||
        'AUTHORIZED_OPEN' =>
          NotificationSeverity.success,
        _ => NotificationSeverity.info,
      };

  static IconData icon(String type) => switch (type) {
        'DOOR_OPENED' => AppIcons.lidOpen,
        'DOOR_CLOSED' => AppIcons.lid,
        'UNAUTHORIZED_OPEN' || 'KEYPAD_LOCKED' => AppIcons.security,
        'WRONG_PIN' || 'LOW_BATTERY' => AppIcons.warning,
        'UNLOCKED' || 'REMOTE_UNLOCK' || 'AUTHORIZED_OPEN' => AppIcons.unlock,
        'REMOTE_LOCK' => AppIcons.lock,
        'PACKAGE_DETECTED' => AppIcons.boxFill,
        'PACKAGE_DELIVERED' => AppIcons.parcelFill,
        'ONLINE' => AppIcons.wifi,
        'OFFLINE' => AppIcons.wifiOff,
        'REMOTE_TARE' => AppIcons.weight,
        'ONE_TIME_PIN_USED' => AppIcons.pinFill,
        _ => AppIcons.history,
      };

  static String label(BuildContext context, String type) => switch (type) {
        'DOOR_OPENED' => context.tr(vi: 'Nắp hộp đã mở', en: 'Lid opened'),
        'DOOR_CLOSED' => context.tr(vi: 'Nắp hộp đã đóng', en: 'Lid closed'),
        'UNAUTHORIZED_OPEN' =>
          context.tr(vi: 'Mở hộp trái phép', en: 'Opened while locked'),
        'AUTHORIZED_OPEN' =>
          context.tr(vi: 'Mở hộp hợp lệ', en: 'Opened with access'),
        'UNLOCKED' => context.tr(vi: 'Đã mở khóa', en: 'Unlocked'),
        'PACKAGE_DETECTED' =>
          context.tr(vi: 'Phát hiện kiện hàng', en: 'Parcel detected'),
        'PACKAGE_DELIVERED' =>
          context.tr(vi: 'Đã nhận và khóa hàng', en: 'Parcel secured'),
        'WRONG_PIN' => context.tr(vi: 'Nhập sai mã', en: 'Wrong code entered'),
        'KEYPAD_LOCKED' =>
          context.tr(vi: 'Bàn phím bị khóa', en: 'Keypad locked'),
        'ONLINE' => context.tr(vi: 'Thiết bị trực tuyến', en: 'Box online'),
        'OFFLINE' => context.tr(vi: 'Thiết bị mất kết nối', en: 'Box offline'),
        'LOW_BATTERY' => context.tr(vi: 'Pin yếu', en: 'Low battery'),
        'REMOTE_UNLOCK' => context.tr(
            vi: 'Lệnh mở khóa từ ứng dụng', en: 'Unlock sent from the app'),
        'REMOTE_LOCK' => context.tr(
            vi: 'Lệnh đóng khóa từ ứng dụng', en: 'Lock sent from the app'),
        'REMOTE_TARE' =>
          context.tr(vi: 'Lệnh đặt lại cân', en: 'Scale reset from the app'),
        'ONE_TIME_PIN_USED' =>
          context.tr(vi: 'Mở bằng PIN một lần', en: 'Opened with one-time PIN'),
        _ => type.replaceAll('_', ' '),
      };
}
