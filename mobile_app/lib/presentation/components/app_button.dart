import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

enum AppButtonVariant { primary, secondary, destructive, plain }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool expand;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.expand = true,
  });

  const AppButton.secondary({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.expand = true,
  }) : variant = AppButtonVariant.secondary;

  const AppButton.destructive({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.expand = true,
  }) : variant = AppButtonVariant.destructive;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final action = isLoading ? null : onPressed;
    final content = _ButtonContent(
      label: label,
      icon: icon,
      isLoading: isLoading,
      spinnerColor:
          variant == AppButtonVariant.primary ? colors.onAccent : colors.accent,
    );

    final Widget button = switch (variant) {
      AppButtonVariant.primary =>
        FilledButton(onPressed: action, child: content),
      AppButtonVariant.destructive => FilledButton(
          onPressed: action,
          style: FilledButton.styleFrom(
            backgroundColor: colors.alert.withValues(alpha: 0.12),
            foregroundColor: colors.alert,
          ),
          child: content,
        ),
      AppButtonVariant.secondary => FilledButton(
          onPressed: action,
          style: FilledButton.styleFrom(
            backgroundColor: colors.surface,
            foregroundColor: colors.accent,
          ),
          child: content,
        ),
      AppButtonVariant.plain => TextButton(onPressed: action, child: content),
    };

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}

class _ButtonContent extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isLoading;
  final Color spinnerColor;

  const _ButtonContent({
    required this.label,
    required this.icon,
    required this.isLoading,
    required this.spinnerColor,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return SizedBox.square(
        dimension: 20,
        child: CircularProgressIndicator(strokeWidth: 2.4, color: spinnerColor),
      );
    }
    if (icon == null) return Text(label);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: AppSpacing.xs),
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
