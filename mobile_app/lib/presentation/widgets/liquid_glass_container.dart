import 'dart:ui';
import 'package:flutter/material.dart';

/// iOS 26 Liquid Glass Container
/// Translucent glass surface supporting both Light & Dark Mode, with adaptive
/// tinting, specular highlights and an ambient drop shadow.
///
/// Performance: by default the glass is "faux" (tint + border + specular
/// gradient, no backdrop blur). Over the app's soft bubble background a real
/// blur looks nearly identical but is the most expensive GPU operation in
/// Flutter, multiplied by every card on screen. Set [realBlur] only where the
/// content behind is detailed (camera preview, photos, sheets over content);
/// those blurs share one backdrop through the page's [BackdropGroup].
class LiquidGlassContainer extends StatelessWidget {
  final Widget child;
  final double borderRadius;

  /// Blur sigma, used only when [realBlur] is true.
  final double blur;
  final double tintOpacity;
  final Color? tintColor;
  final Color? borderColor;
  final double borderWidth;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final bool realBlur;

  const LiquidGlassContainer({
    super.key,
    required this.child,
    this.borderRadius = 26.0,
    this.blur = 16.0,
    this.tintOpacity = 0.12,
    this.tintColor,
    this.borderColor,
    this.borderWidth = 0.8,
    this.padding,
    this.margin,
    this.onTap,
    this.realBlur = false,
  });

  /// Without a blur the bubbles show through more sharply, so light-mode
  /// faux glass is slightly more opaque to keep the frosted, readable look.
  static const double _fauxLightTintBoost = 0.06;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBorderRadius = BorderRadius.circular(borderRadius);

    // Adaptive Glass Tint & Border Colors
    final baseTintColor =
        tintColor ?? (isDark ? const Color(0xFF182235) : Colors.white);
    final baseBorderColor =
        borderColor ?? Colors.white.withValues(alpha: isDark ? 0.16 : 0.35);
    final lightTint = tintOpacity + (realBlur ? 0 : _fauxLightTintBoost);

    double alpha(double value) => value.clamp(0.0, 1.0).toDouble();

    Widget surface = Stack(
      children: [
        // 1. Translucent Tint Surface
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: effectiveBorderRadius,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [
                        baseTintColor.withValues(alpha: 0.72),
                        baseTintColor.withValues(alpha: 0.62),
                        baseTintColor.withValues(alpha: 0.54),
                      ]
                    : [
                        baseTintColor.withValues(
                            alpha: alpha(lightTint + 0.12)),
                        baseTintColor.withValues(alpha: alpha(lightTint)),
                        baseTintColor.withValues(
                            alpha: alpha(lightTint - 0.04)),
                      ],
                stops: const [0.0, 0.5, 1.0],
              ),
              border: Border.all(color: baseBorderColor, width: borderWidth),
            ),
          ),
        ),

        // 2. Specular Edge Highlight (Light reflection on top & left edge)
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: effectiveBorderRadius,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withValues(alpha: isDark ? 0.08 : 0.32),
                  Colors.white.withValues(alpha: isDark ? 0.02 : 0.06),
                  Colors.transparent,
                ],
                stops: const [0.0, 0.3, 0.7],
              ),
            ),
          ),
        ),

        // 3. Main Child Content
        Padding(padding: padding ?? EdgeInsets.zero, child: child),
      ],
    );

    if (realBlur && blur > 0) {
      surface = BackdropFilter.grouped(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: surface,
      );
    }

    final Widget glassCard = Container(
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: effectiveBorderRadius,
        boxShadow: [
          // Soft separation from the page background.
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.22 : 0.08),
            blurRadius: isDark ? 24 : 20,
            offset: const Offset(0, 7),
          ),
          // Inner Specular Light Glow Shadow
          BoxShadow(
            color: Colors.white.withValues(alpha: isDark ? 0.06 : 0.3),
            blurRadius: 12,
            spreadRadius: 1,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: ClipRRect(borderRadius: effectiveBorderRadius, child: surface),
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: effectiveBorderRadius,
          onTap: onTap,
          child: glassCard,
        ),
      );
    }

    return glassCard;
  }
}
