import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'grouped_section.dart';
import 'icon_badge.dart';

class ChoiceOption<T> {
  final T value;
  final String label;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final bool destructive;

  const ChoiceOption({
    required this.value,
    required this.label,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.destructive = false,
  });
}

/// iOS-style action sheet listing [options]; the [selected] one shows a
/// checkmark. Returns the chosen value, or null when dismissed.
Future<T?> showChoiceSheet<T>(
  BuildContext context, {
  required String title,
  required List<ChoiceOption<T>> options,
  T? selected,
  String? message,
}) {
  return showModalBottomSheet<T>(
    context: context,
    useSafeArea: true,
    builder: (sheetContext) {
      final colors = sheetContext.colors;
      return Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              textAlign: TextAlign.center,
              style: sheetContext.text.titleMedium,
            ),
            if (message != null) ...[
              const SizedBox(height: AppSpacing.xxs),
              Text(
                message,
                textAlign: TextAlign.center,
                style: sheetContext.text.bodySmall,
              ),
            ],
            const SizedBox(height: AppSpacing.md),
            GroupedSection(
              children: [
                for (final option in options)
                  GroupedTile(
                    title: option.label,
                    subtitle: option.subtitle,
                    destructive: option.destructive,
                    leading: option.icon == null
                        ? null
                        : IconBadge(
                            icon: option.icon!,
                            color: option.destructive
                                ? colors.alert
                                : option.iconColor ?? colors.accent,
                            size: 30,
                          ),
                    trailing: option.value == selected
                        ? Icon(AppIcons.check, color: colors.accent, size: 20)
                        : null,
                    showChevron: false,
                    onTap: () => Navigator.pop(sheetContext, option.value),
                  ),
              ],
            ),
          ],
        ),
      );
    },
  );
}
