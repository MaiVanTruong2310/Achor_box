import 'package:flutter/material.dart';

import '../../../../core/notifications/notification_controller.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/app_notification.dart';
import '../../../components/components.dart';

/// Latest unread high-priority notification, if any.
class WarningBanner extends StatelessWidget {
  final VoidCallback onOpen;

  const WarningBanner({super.key, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: globalNotificationController,
      builder: (context, _) {
        final warning = globalNotificationController.latestWarning;
        if (warning == null) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: AppCard(
            style: GlassStyle.light,
            onTap: () {
              globalNotificationController.markRead(warning.id);
              onOpen();
            },
            child: Builder(builder: (context) {
              final colors = context.colors;
              return Row(
                children: [
                  IconBadge(
                    icon: warning.icon,
                    color: warning.severity.color(colors),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          warning.localizedTitle(context),
                          style: context.text.titleSmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          warning.localizedBody(context),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Icon(AppIcons.chevronRight, color: colors.textTertiary),
                ],
              );
            }),
          ),
        );
      },
    );
  }
}
