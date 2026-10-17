import 'package:flutter/material.dart';
import 'liquid_glass_container.dart';

export 'liquid_glass_container.dart';

/// Legacy Wrapper mapping to LiquidGlassContainer
class GlassContainer extends StatelessWidget {
  final Widget child;
  final double blur;
  final double opacity;
  final BorderRadiusGeometry? borderRadius;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? borderColor;
  final double borderWidth;
  final List<BoxShadow>? boxShadow;
  final VoidCallback? onTap;

  const GlassContainer({
    super.key,
    required this.child,
    this.blur = 22.0,
    this.opacity = 0.12,
    this.borderRadius,
    this.padding,
    this.margin,
    this.color,
    this.borderColor,
    this.borderWidth = 0.8,
    this.boxShadow,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    double radius = 26.0;
    if (borderRadius is BorderRadius) {
      radius = (borderRadius as BorderRadius).topLeft.x;
    }

    return LiquidGlassContainer(
      blur: blur,
      tintOpacity: opacity,
      tintColor: color ?? Colors.white,
      borderColor: borderColor ?? Colors.white,
      borderWidth: borderWidth,
      borderRadius: radius,
      padding: padding,
      margin: margin,
      onTap: onTap,
      child: child,
    );
  }
}
