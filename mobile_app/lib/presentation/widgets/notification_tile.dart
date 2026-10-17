import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/localization/language_controller.dart';
import '../../data/models/app_notification.dart';
import 'liquid_glass_container.dart';

class NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const NotificationTile({
    super.key,
    required this.notification,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final color = switch (notification.severity) {
      NotificationSeverity.success => const Color(0xFF10B981),
      NotificationSeverity.warning => const Color(0xFFF59E0B),
      NotificationSeverity.danger => const Color(0xFFEF4444),
      NotificationSeverity.info => const Color(0xFF0EA5E9),
    };
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final age = DateTime.now().difference(notification.createdAt.toLocal());
    final time = age.inMinutes < 1
        ? context.tr(vi: 'Vừa xong', en: 'Just now')
        : age.inHours < 1
            ? context.tr(
                vi: '${age.inMinutes} phút trước', en: '${age.inMinutes}m ago')
            : age.inDays < 1
                ? context.tr(
                    vi: '${age.inHours} giờ trước', en: '${age.inHours}h ago')
                : context.tr(
                    vi: '${age.inDays} ngày trước', en: '${age.inDays}d ago');

    return Dismissible(
      key: ValueKey(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
            color: Colors.redAccent, borderRadius: BorderRadius.circular(22)),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      child: LiquidGlassContainer(
        borderRadius: 22,
        blur: 18,
        tintOpacity: notification.isRead ? 0.08 : 0.16,
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(14)),
              child: Icon(notification.icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.localizedTitle(context),
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: notification.isRead
                                ? FontWeight.w600
                                : FontWeight.w700,
                            color: isDark
                                ? const Color(0xFFF8FAFC)
                                : AppColors.textPrimary,
                          ),
                        ),
                      ),
                      if (!notification.isRead)
                        Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                                color: color, shape: BoxShape.circle)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.localizedBody(context),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 12.5,
                        height: 1.35,
                        color: isDark
                            ? const Color(0xFFA7B5C8)
                            : AppColors.textSecondary),
                  ),
                  const SizedBox(height: 7),
                  Text(time,
                      style: TextStyle(
                          fontSize: 11,
                          color: isDark
                              ? const Color(0xFF7F91A8)
                              : AppColors.textMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
