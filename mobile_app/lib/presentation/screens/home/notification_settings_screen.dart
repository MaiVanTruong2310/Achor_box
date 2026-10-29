import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';

/// Per-type notification switches, stored in
/// `public.notification_preferences`. A missing row means enabled.
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends State<NotificationSettingsScreen> {
  final _controller = globalNotificationController;

  @override
  void initState() {
    super.initState();
    _controller.initialize();
  }

  bool _isOn(_Preference preference) =>
      preference.types.every((type) => _controller.preferences[type] ?? true);

  Future<void> _set(_Preference preference, bool enabled) async {
    final results = await Future.wait([
      for (final type in preference.types)
        _controller.setPreference(type, enabled),
    ]);
    if (!mounted || results.every((ok) => ok)) return;
    AppToast.show(
      context,
      message: context.tr(
        vi: 'Không lưu được cài đặt. Hãy kiểm tra kết nối mạng.',
        en: 'Could not save the setting. Check your connection.',
      ),
      type: ToastType.error,
    );
  }

  List<_PreferenceGroup> _groups(AppColors colors) => [
        _PreferenceGroup(
          header: context.tr(vi: 'Hộp nhận hàng', en: 'Delivery boxes'),
          items: [
            _Preference(
              ['parcel_detected'],
              AppIcons.parcelFill,
              colors.locked,
              context.tr(vi: 'Có kiện hàng mới', en: 'New parcel'),
              context.tr(
                  vi: 'Cân phát hiện hàng trong hộp',
                  en: 'The scale detects a parcel'),
            ),
            _Preference(
              ['parcel_delivered'],
              AppIcons.lock,
              colors.locked,
              context.tr(vi: 'Kiện hàng đã khóa', en: 'Parcel secured'),
              context.tr(
                  vi: 'Hộp tự đóng và khóa sau khi nhận hàng',
                  en: 'The box closes and locks after a delivery'),
            ),
            _Preference(
              ['box_unlocked', 'remote_unlock'],
              AppIcons.unlock,
              colors.unlocked,
              context.tr(vi: 'Hộp được mở khóa', en: 'Box unlocked'),
              context.tr(
                  vi: 'Từ ứng dụng hoặc trên hộp',
                  en: 'From the app or on the box'),
            ),
            _Preference(
              ['door_opened', 'door_closed'],
              AppIcons.lidOpen,
              colors.teal,
              context.tr(vi: 'Nắp hộp mở / đóng', en: 'Lid opened / closed'),
              null,
            ),
            _Preference(
              ['device_online', 'device_offline'],
              AppIcons.wifi,
              colors.accent,
              context.tr(vi: 'Trạng thái kết nối', en: 'Connection status'),
              context.tr(
                  vi: 'Hộp lên mạng hoặc mất kết nối',
                  en: 'The box comes online or goes offline'),
            ),
            _Preference(
              ['low_battery'],
              AppIcons.warning,
              colors.unlocked,
              context.tr(vi: 'Pin yếu', en: 'Low battery'),
              null,
            ),
          ],
        ),
        _PreferenceGroup(
          header: context.tr(vi: 'PIN và chia sẻ', en: 'PINs and sharing'),
          items: [
            _Preference(
              ['pin_used'],
              AppIcons.pinFill,
              colors.indigo,
              context.tr(vi: 'PIN được sử dụng', en: 'PIN used'),
              context.tr(
                  vi: 'Có người mở hộp bằng PIN một lần',
                  en: 'Someone opens the box with a one-time PIN'),
            ),
            _Preference(
              ['pin_created', 'pin_expired'],
              AppIcons.keyFill,
              colors.indigo,
              context.tr(
                  vi: 'Tạo và hết hạn PIN', en: 'PIN created or expired'),
              null,
            ),
            _Preference(
              ['access_invited', 'access_revoked'],
              AppIcons.userAdd,
              colors.purple,
              context.tr(vi: 'Chia sẻ quyền truy cập', en: 'Shared access'),
              context.tr(
                  vi: 'Được chia sẻ hoặc thu hồi quyền dùng hộp',
                  en: 'A box is shared with you or access is revoked'),
            ),
          ],
        ),
        _PreferenceGroup(
          header: context.tr(vi: 'Tài khoản', en: 'Account'),
          footer: context.tr(
            vi: 'Nên giữ bật Cảnh báo bảo mật để biết khi hộp bị mở trái phép hoặc bàn phím bị khóa do nhập sai nhiều lần.',
            en: 'Keep security alerts on to know when a box is forced open or its keypad locks after wrong codes.',
          ),
          items: [
            _Preference(
              ['security_alert'],
              AppIcons.security,
              colors.alert,
              context.tr(vi: 'Cảnh báo bảo mật', en: 'Security alerts'),
              null,
            ),
            _Preference(
              ['password_changed', 'profile_updated'],
              AppIcons.profileEdit,
              colors.accent,
              context.tr(vi: 'Thay đổi tài khoản', en: 'Account changes'),
              context.tr(
                  vi: 'Đổi mật khẩu hoặc cập nhật hồ sơ',
                  en: 'Password or profile updates'),
            ),
            _Preference(
              ['device_added', 'system'],
              AppIcons.notificationsFill,
              colors.offline,
              context.tr(vi: 'Thông báo hệ thống', en: 'System notices'),
              null,
            ),
          ],
        ),
      ];

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _controller,
      builder: (context, _) => AppPage(
        showBackButton: true,
        title: context.tr(vi: 'Thông báo', en: 'Notifications'),
        subtitle: context.tr(
          vi: 'Chọn sự kiện bạn muốn nhận',
          en: 'Choose what you want to hear about',
        ),
        children: [
          _Groups(
            groups: _groups,
            isOn: _isOn,
            onChanged: _set,
          ),
        ],
      ),
    );
  }
}

/// Builds the sections under the page's own theme, so tile and switch
/// colors match the dark wallpaper rather than the caller's theme.
class _Groups extends StatelessWidget {
  final List<_PreferenceGroup> Function(AppColors colors) groups;
  final bool Function(_Preference preference) isOn;
  final void Function(_Preference preference, bool enabled) onChanged;

  const _Groups({
    required this.groups,
    required this.isOn,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final group in groups(context.colors))
          GroupedSection(
            header: group.header,
            footer: group.footer,
            children: [
              for (final item in group.items)
                GroupedTile(
                  leading:
                      IconBadge(icon: item.icon, color: item.color, size: 30),
                  title: item.label,
                  subtitle: item.subtitle,
                  trailing: Switch.adaptive(
                    value: isOn(item),
                    onChanged: (value) => onChanged(item, value),
                  ),
                  onTap: () => onChanged(item, !isOn(item)),
                ),
            ],
          ),
      ],
    );
  }
}

class _PreferenceGroup {
  final String header;
  final String? footer;
  final List<_Preference> items;

  const _PreferenceGroup({
    required this.header,
    required this.items,
    this.footer,
  });
}

/// One switch; it may cover several `event_type`s that read as one setting.
class _Preference {
  final List<String> types;
  final IconData icon;
  final Color color;
  final String label;
  final String? subtitle;

  const _Preference(
    this.types,
    this.icon,
    this.color,
    this.label,
    this.subtitle,
  );
}
