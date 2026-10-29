import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/app_notification.dart';
import '../components/components.dart';

/// One row of the notification center: glass card that swipes left to
/// delete. Unread rows carry a bold title and an accent dot.
class NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final String timeLabel;

  /// Name of the related box, when the user still has access to it.
  final String? deviceName;
  final VoidCallback onTap;
  final VoidCallback onLongPress;
  final VoidCallback onDelete;

  const NotificationTile({
    super.key,
    required this.notification,
    required this.timeLabel,
    required this.onTap,
    required this.onLongPress,
    required this.onDelete,
    this.deviceName,
  });

  @override
  Widget build(BuildContext context) {
    final unread = !notification.isRead;
    final body = notification.localizedBody(context);
    final deleteLabel = context.tr(vi: 'Xóa', en: 'Delete');

    return Dismissible(
      key: ValueKey(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppSpacing.xl),
        decoration: ShapeDecoration(
          color: context.colors.alert,
          shape: const RoundedSuperellipseBorder(borderRadius: AppRadius.lgAll),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(AppIcons.trash, color: Colors.white, size: 20),
            const SizedBox(width: AppSpacing.xs),
            Text(
              deleteLabel,
              style: context.text.titleSmall?.copyWith(color: Colors.white),
            ),
          ],
        ),
      ),
      child: GlassSurface(
        onTap: onTap,
        onLongPress: onLongPress,
        padding: const EdgeInsets.all(AppSpacing.sm + 2),
        child: Builder(builder: (context) {
          final colors = context.colors;
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconBadge(
                icon: notification.icon,
                color: notification.severity.color(colors),
                size: 40,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            notification.localizedTitle(context),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: context.text.titleSmall?.copyWith(
                              fontWeight:
                                  unread ? FontWeight.w700 : FontWeight.w500,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(timeLabel, style: context.text.labelMedium),
                        if (unread) ...[
                          const SizedBox(width: AppSpacing.xs),
                          Semantics(
                            label: context.tr(vi: 'Chưa đọc', en: 'Unread'),
                            child: Container(
                              width: 9,
                              height: 9,
                              margin: const EdgeInsets.only(top: 5),
                              decoration: BoxDecoration(
                                color: colors.accent,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (body.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        body,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: context.text.bodySmall?.copyWith(
                          color: colors.textPrimary
                              .withValues(alpha: unread ? 0.8 : 0.6),
                        ),
                      ),
                    ],
                    if (deviceName != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Row(
                        children: [
                          Icon(AppIcons.box,
                              size: 14, color: colors.textSecondary),
                          const SizedBox(width: AppSpacing.xxs),
                          Flexible(
                            child: Text(
                              deviceName!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: context.text.labelMedium,
                            ),
                          ),
                          Icon(AppIcons.chevronRight,
                              size: 14, color: colors.textSecondary),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}
