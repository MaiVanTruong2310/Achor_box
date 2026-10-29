import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'glass_surface.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final GlassStyle? style;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const AppCard({
    super.key,
    required this.child,
    this.style,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      style: style,
      padding: padding,
      onTap: onTap,
      onLongPress: onLongPress,
      child: child,
    );
  }
}
