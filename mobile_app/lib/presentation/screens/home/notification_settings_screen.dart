import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/ios26_back_button.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';

class NotificationSettingsScreen extends StatelessWidget {
  const NotificationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final groups = <_PreferenceGroup>[
      _PreferenceGroup(
        context.tr(vi: 'Thiết bị', en: 'Devices'),
        [
          _Preference('low_battery', Icons.battery_alert_rounded,
              context.tr(vi: 'Pin yếu', en: 'Low battery')),
          _Preference('device_offline', Icons.cloud_off_rounded,
              context.tr(vi: 'Mất kết nối', en: 'Device offline')),
          _Preference('remote_unlock', Icons.lock_open_rounded,
              context.tr(vi: 'Mở khóa từ xa', en: 'Remote unlock')),
          _Preference('parcel_detected', Icons.inventory_2_rounded,
              context.tr(vi: 'Phát hiện kiện hàng', en: 'Parcel detected')),
        ],
      ),
      _PreferenceGroup(
        context.tr(vi: 'Quyền truy cập', en: 'Access'),
        [
          _Preference('access_invited', Icons.person_add_alt_1_rounded,
              context.tr(vi: 'Lời mời thành viên', en: 'Member invitations')),
          _Preference('access_revoked', Icons.person_remove_alt_1_rounded,
              context.tr(vi: 'Thu hồi quyền', en: 'Access revoked')),
          _Preference('pin_created', Icons.pin_rounded,
              context.tr(vi: 'Thay đổi mã PIN', en: 'PIN changes')),
          _Preference('pin_used', Icons.password_rounded,
              context.tr(vi: 'Mã PIN được sử dụng', en: 'PIN usage')),
        ],
      ),
      _PreferenceGroup(
        context.tr(vi: 'Tài khoản', en: 'Account'),
        [
          _Preference('profile_updated', Icons.manage_accounts_rounded,
              context.tr(vi: 'Thay đổi hồ sơ', en: 'Profile changes')),
          _Preference('security_alert', Icons.shield_rounded,
              context.tr(vi: 'Cảnh báo bảo mật', en: 'Security alerts')),
          _Preference('system', Icons.campaign_rounded,
              context.tr(vi: 'Thông báo hệ thống', en: 'System notifications')),
        ],
      ),
    ];

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: AnimatedBuilder(
            animation: globalNotificationController,
            builder: (context, child) => CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                    child: Row(
                      children: [
                        const Ios26BackButton(),
                        Expanded(
                          child: Text(
                            context.tr(
                                vi: 'Cài đặt thông báo',
                                en: 'Notification settings'),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: primary),
                          ),
                        ),
                        const SizedBox(width: 88),
                      ],
                    ),
                  ),
                ),
                for (final group in groups) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 2, 22, 8),
                      child: Text(group.title,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: primary.withValues(alpha: 0.68))),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                      child: LiquidGlassContainer(
                        borderRadius: 24,
                        blur: 20,
                        tintOpacity: 0.12,
                        child: Column(
                          children: [
                            for (var index = 0;
                                index < group.items.length;
                                index++) ...[
                              SwitchListTile.adaptive(
                                secondary: Icon(group.items[index].icon,
                                    color: AppColors.brandBlue, size: 21),
                                title: Text(group.items[index].label,
                                    style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: primary)),
                                value: globalNotificationController
                                        .preferences[group.items[index].type] ??
                                    true,
                                activeTrackColor: AppColors.brandBlue,
                                onChanged: (value) async {
                                  await globalNotificationController
                                      .setPreference(
                                          group.items[index].type, value);
                                  if (!context.mounted) return;
                                  AppToast.show(
                                    context,
                                    message: context.tr(
                                        vi: 'Đã lưu cài đặt thông báo.',
                                        en: 'Notification setting saved.'),
                                    type: ToastType.success,
                                  );
                                },
                              ),
                              if (index != group.items.length - 1)
                                Divider(
                                    height: 1,
                                    indent: 58,
                                    endIndent: 18,
                                    color: primary.withValues(alpha: 0.08)),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PreferenceGroup {
  final String title;
  final List<_Preference> items;
  const _PreferenceGroup(this.title, this.items);
}

class _Preference {
  final String type;
  final IconData icon;
  final String label;
  const _Preference(this.type, this.icon, this.label);
}
