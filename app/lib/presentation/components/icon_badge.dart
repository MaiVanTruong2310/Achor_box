import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Rounded-square icon tile, like the icons of iOS Settings rows.
class IconBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  final bool filled;

  const IconBadge({
    super.key,
    required this.icon,
    required this.color,
    this.size = AppSizes.iconBadge,
    this.filled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: filled ? color : color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(size * 0.28),
      ),
      child: Icon(
        icon,
        size: size * 0.56,
        color: filled ? Colors.white : color,
      ),
    );
  }
}
