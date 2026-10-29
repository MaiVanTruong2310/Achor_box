import 'package:flutter/material.dart';

import '../../../../core/localization/language_controller.dart';
import '../../../../core/notifications/notification_controller.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../components/components.dart';

class HomeShortcuts extends StatelessWidget {
  final VoidCallback onPins;
  final VoidCallback onSharing;
  final VoidCallback onNotifications;
  final VoidCallback onAddDevice;

  const HomeShortcuts({
    super.key,
    required this.onPins,
    required this.onSharing,
    required this.onNotifications,
    required this.onAddDevice,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return ListenableBuilder(
      listenable: globalNotificationController,
      builder: (context, _) {
        final unread = globalNotificationController.unreadCount;
        final tiles = [
          ActionTile(
            icon: AppIcons.pinFill,
            color: colors.purple,
            title: context.tr(vi: 'Mã PIN', en: 'PIN codes'),
            subtitle: context.tr(vi: 'Tạo mã cho shipper', en: 'For couriers'),
            onTap: onPins,
          ),
          ActionTile(
            icon: AppIcons.sharingFill,
            color: colors.teal,
            title: context.tr(vi: 'Chia sẻ', en: 'Sharing'),
            subtitle: context.tr(vi: 'Mời người thân', en: 'Invite family'),
            onTap: onSharing,
          ),
          ActionTile(
            icon: AppIcons.notificationsFill,
            color: colors.alert,
            title: context.tr(vi: 'Thông báo', en: 'Notifications'),
            subtitle: unread > 0
                ? context.tr(vi: '$unread chưa đọc', en: '$unread unread')
                : context.tr(vi: 'Đã đọc hết', en: 'All caught up'),
            active: unread > 0,
            onTap: onNotifications,
          ),
          ActionTile(
            icon: AppIcons.scan,
            color: colors.accent,
            title: context.tr(vi: 'Thêm hộp', en: 'Add box'),
            subtitle: context.tr(vi: 'Quét mã QR', en: 'Scan QR code'),
            onTap: onAddDevice,
          ),
        ];
        return GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          mainAxisSpacing: AppSpacing.sm,
          crossAxisSpacing: AppSpacing.sm,
          childAspectRatio: 2.7,
          children: tiles,
        );
      },
    );
  }
}
