import 'dart:ui';
import 'package:flutter/material.dart';

/// iOS 26 Liquid Glass Container
/// Highly translucent frosted-glass surface supporting both Light & Dark Mode.
/// Features strong background blur, adaptive glass tinting, specular highlights,
/// and ambient drop shadow.
class LiquidGlassContainer extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final double blur;
  final double tintOpacity;
  final Color? tintColor;
  final Color? borderColor;
  final double borderWidth;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;

  const LiquidGlassContainer({
    super.key,
    required this.child,
    this.borderRadius = 26.0,
    this.blur = 22.0,
    this.tintOpacity = 0.12,
    this.tintColor,
    this.borderColor,
    this.borderWidth = 0.8,
    this.padding,
    this.margin,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBorderRadius = BorderRadius.circular(borderRadius);

    // Adaptive Glass Tint & Border Colors
    final baseTintColor =
        tintColor ?? (isDark ? const Color(0xFF182235) : Colors.white);
    final baseBorderColor = borderColor ??
        Colors.white.withOpacity(isDark ? 0.16 : 0.35);

    Widget glassCard = Container(
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: effectiveBorderRadius,
        boxShadow: [
          // Soft separation from the page background.
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.22 : 0.08),
            blurRadius: isDark ? 24 : 20,
            offset: const Offset(0, 7),
          ),
          // Inner Specular Light Glow Shadow
          BoxShadow(
            color: isDark
                ? Colors.white.withOpacity(0.06)
                : Colors.white.withOpacity(0.3),
            blurRadius: 12,
            spreadRadius: 1,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: effectiveBorderRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Stack(
            children: [
              // 1. Translucent Tint Surface
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: effectiveBorderRadius,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: isDark
                          ? [
                              baseTintColor.withOpacity(0.72),
                              baseTintColor.withOpacity(0.62),
                              baseTintColor.withOpacity(0.54),
                            ]
                          : [
                              baseTintColor.withOpacity(
                                (tintOpacity + 0.12).clamp(0.0, 1.0),
                              ),
                              baseTintColor.withOpacity(
                                tintOpacity.clamp(0.0, 1.0),
                              ),
                              baseTintColor.withOpacity(
                                (tintOpacity - 0.04).clamp(0.0, 1.0),
                              ),
                            ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                    border: Border.all(
                      color: baseBorderColor,
                      width: borderWidth,
                    ),
                  ),
                ),
              ),

              // 2. Specular Edge Highlight (Light reflection on top & left edge)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: effectiveBorderRadius,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white.withOpacity(isDark ? 0.08 : 0.32),
                        Colors.white.withOpacity(isDark ? 0.02 : 0.06),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.3, 0.7],
                    ),
                  ),
                ),
              ),

              // 3. Main Child Content
              Padding(
                padding: padding ?? EdgeInsets.zero,
                child: child,
              ),
            ],
          ),
        ),
      ),
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
