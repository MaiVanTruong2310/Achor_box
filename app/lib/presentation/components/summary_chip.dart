import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'glass_surface.dart';

/// Status pill under a page title, like Apple Home's Climate / Lights /
/// Security chips.
class SummaryChip extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String value;
  final VoidCallback? onTap;

  const SummaryChip({
    super.key,
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      capsule: true,
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.xs,
        AppSpacing.lg,
        AppSpacing.xs,
      ),
      child: Builder(builder: (context) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(width: AppSpacing.xs),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title, style: context.text.titleSmall),
                Text(
                  value,
                  style: context.text.labelMedium?.copyWith(
                    color: context.colors.textPrimary.withValues(alpha: 0.75),
                  ),
                ),
              ],
            ),
          ],
        );
      }),
    );
  }
}
