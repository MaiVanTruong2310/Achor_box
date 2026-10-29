import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'glass_surface.dart';

/// Apple Home style tile: dark glass when idle, bright when [active].
class ActionTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String? subtitle;
  final bool active;
  final VoidCallback? onTap;

  const ActionTile({
    super.key,
    required this.icon,
    required this.color,
    required this.title,
    this.subtitle,
    this.active = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      style: active ? GlassStyle.light : GlassStyle.dark,
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.sm + 2),
      child: Builder(builder: (context) {
        return Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.titleSmall,
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.labelMedium,
                    ),
                ],
              ),
            ),
          ],
        );
      }),
    );
  }
}
