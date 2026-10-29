import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Section title over the wallpaper; shows a chevron when tappable,
/// like Apple Home's "Cameras ›", and an optional trailing [action].
class SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onTap;
  final Widget? action;

  const SectionHeader({
    super.key,
    required this.title,
    this.onTap,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    final style = context.text.titleLarge;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.xl, bottom: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Align(
              alignment: Alignment.centerLeft,
              child: InkWell(
                onTap: onTap,
                borderRadius: AppRadius.smAll,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(child: Text(title, style: style)),
                    if (onTap != null)
                      Icon(
                        AppIcons.chevronRight,
                        size: 18,
                        color: style?.color?.withValues(alpha: 0.6),
                      ),
                  ],
                ),
              ),
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}
