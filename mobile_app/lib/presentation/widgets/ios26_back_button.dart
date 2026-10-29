import 'package:flutter/material.dart';

import '../../core/constants/legacy_colors.dart';
import '../../core/localization/language_controller.dart';
import 'liquid_glass_container.dart';

class Ios26BackButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Color? foregroundColor;
  final bool overlay;

  const Ios26BackButton({
    super.key,
    this.onPressed,
    this.foregroundColor,
    this.overlay = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = foregroundColor ??
        (isDark ? const Color(0xFFF8FAFC) : LegacyColors.textPrimary);

    return Semantics(
      button: true,
      label: context.tr(vi: 'Quay lại', en: 'Back'),
      child: LiquidGlassContainer(
        borderRadius: 22,
        blur: 22,
        tintOpacity: overlay ? 0.18 : 0.12,
        borderWidth: 0.8,
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
        onTap: onPressed ?? () => Navigator.maybePop(context),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chevron_left_rounded, size: 21, color: color),
            const SizedBox(width: 2),
            Text(
              context.tr(vi: 'Quay lại', en: 'Back'),
              style: TextStyle(
                color: color,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
