import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';
import 'app_backdrop.dart';
import 'app_button.dart';
import 'glass_surface.dart';
import 'icon_badge.dart';
import 'inline_message.dart';

/// Shows [dialog] over a dimmed backdrop. Use with [GlassDialog].
Future<T?> showGlassDialog<T>(BuildContext context, Widget dialog) {
  return showDialog<T>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.5),
    builder: (_) => dialog,
  );
}

/// Liquid Glass popup for short forms such as passwords and PINs: dark
/// glass with the same white text and glass inputs as the sign-in screens,
/// in both Light and Dark Mode. Errors show inside it; actions stack
/// vertically like an iOS alert and stay disabled while [busy].
class GlassDialog extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String title;
  final String? message;
  final List<Widget> fields;
  final String? error;
  final bool busy;
  final String confirmLabel;
  final bool destructive;
  final VoidCallback onConfirm;
  final VoidCallback? onCancel;

  const GlassDialog({
    super.key,
    required this.icon,
    required this.title,
    required this.confirmLabel,
    required this.onConfirm,
    this.iconColor,
    this.message,
    this.fields = const [],
    this.error,
    this.busy = false,
    this.destructive = false,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: AppBackdrop.theme,
      child: Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.xl,
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: GlassSurface(
            style: GlassStyle.dark,
            borderRadius: AppRadius.xlAll,
            child: Theme(
              // GlassSurface switches to the plain dark theme; keep the
              // glass inputs and brighter secondary text.
              data: AppBackdrop.theme,
              child: Builder(builder: _content),
            ),
          ),
        ),
      ),
    );
  }

  Widget _content(BuildContext context) {
    final colors = context.colors;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: IconBadge(
              icon: icon,
              color: destructive ? colors.alert : iconColor ?? colors.accent,
              size: 52,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            title,
            textAlign: TextAlign.center,
            style: context.text.titleLarge,
          ),
          if (message != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: context.text.bodyMedium
                  ?.copyWith(color: colors.textSecondary),
            ),
          ],
          if (fields.isNotEmpty) const SizedBox(height: AppSpacing.lg),
          for (var i = 0; i < fields.length; i++) ...[
            if (i > 0) const SizedBox(height: AppSpacing.sm),
            fields[i],
          ],
          if (error != null) ...[
            const SizedBox(height: AppSpacing.md),
            InlineMessage(error!),
          ],
          const SizedBox(height: AppSpacing.lg),
          destructive
              ? AppButton.destructive(
                  label: confirmLabel,
                  isLoading: busy,
                  onPressed: onConfirm,
                )
              : AppButton(
                  label: confirmLabel,
                  isLoading: busy,
                  onPressed: onConfirm,
                ),
          const SizedBox(height: AppSpacing.xs),
          AppButton(
            variant: AppButtonVariant.plain,
            label: context.tr(vi: 'Hủy', en: 'Cancel'),
            onPressed:
                busy ? null : onCancel ?? () => Navigator.pop(context, false),
          ),
        ],
      ),
    );
  }
}
