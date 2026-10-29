import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

enum InlineMessageTone { error, info }

class InlineMessage extends StatelessWidget {
  final String message;
  final InlineMessageTone tone;

  const InlineMessage(
    this.message, {
    super.key,
    this.tone = InlineMessageTone.error,
  });

  @override
  Widget build(BuildContext context) {
    final color = tone == InlineMessageTone.error
        ? context.colors.alert
        : context.colors.accent;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: AppRadius.mdAll,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              tone == InlineMessageTone.error ? AppIcons.error : AppIcons.info,
              size: 20,
              color: color,
            ),
            const SizedBox(width: AppSpacing.xs),
            Expanded(
              child: Text(
                message,
                style: context.text.bodyMedium?.copyWith(color: color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
