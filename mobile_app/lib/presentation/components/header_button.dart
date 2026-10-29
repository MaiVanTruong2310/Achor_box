import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'glass_surface.dart';

/// Small glass capsule action, used beside a [SectionHeader].
class HeaderButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  const HeaderButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      capsule: true,
      onTap: onPressed,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      child: Builder(builder: (context) {
        final color = context.colors.textPrimary
            .withValues(alpha: onPressed == null ? 0.4 : 1);
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: AppSpacing.xxs),
            Text(
              label,
              style: context.text.titleSmall?.copyWith(color: color),
            ),
          ],
        );
      }),
    );
  }
}
