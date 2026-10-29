import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Dark glass for idle items over the wallpaper (white content); light glass
/// for active ones (dark content), like Apple Home's off/on tiles.
enum GlassStyle { dark, light }

/// Liquid Glass surface: continuous (superellipse) corners, saturated
/// backdrop blur, a translucent tint and a specular rim. Children render with
/// the matching theme, so text and icons pick the right colors on their own.
///
/// Blurs use `BackdropFilter.grouped`: every surface under one
/// [BackdropGroup] shares a single backdrop pass, and over the static
/// wallpaper nothing is recomputed until something repaints.
class GlassSurface extends StatelessWidget {
  final Widget child;

  /// Defaults to dark glass on dark backgrounds and light glass otherwise.
  final GlassStyle? style;
  final BorderRadius borderRadius;
  final bool capsule;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const GlassSurface({
    super.key,
    required this.child,
    this.style,
    this.borderRadius = AppRadius.lgAll,
    this.capsule = false,
    this.padding = EdgeInsets.zero,
    this.onTap,
    this.onLongPress,
  });

  static const _darkTint = Color(0x52000000);
  static const _lightTint = Color(0xE6FFFFFF);
  static const double _blur = 24;

  static final ui.ImageFilter _filter = ui.ImageFilter.compose(
    outer: ui.ImageFilter.blur(sigmaX: _blur, sigmaY: _blur),
    inner: ui.ColorFilter.matrix(_saturation(1.6)),
  );

  static List<double> _saturation(double s) {
    const r = 0.2126, g = 0.7152, b = 0.0722;
    final i = 1 - s;
    return [
      i * r + s, i * g, i * b, 0, 0, //
      i * r, i * g + s, i * b, 0, 0, //
      i * r, i * g, i * b + s, 0, 0, //
      0, 0, 0, 1, 0,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final isLight = (style ??
            (Theme.of(context).brightness == Brightness.dark
                ? GlassStyle.dark
                : GlassStyle.light)) ==
        GlassStyle.light;
    final radius = capsule ? BorderRadius.circular(999) : borderRadius;
    final shape = RoundedSuperellipseBorder(borderRadius: radius);

    return DecoratedBox(
      decoration: ShapeDecoration(
        shape: shape,
        shadows: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isLight ? 0.12 : 0.18),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRSuperellipse(
        borderRadius: radius,
        child: BackdropFilter.grouped(
          filter: _filter,
          child: CustomPaint(
            foregroundPainter:
                _SpecularRimPainter(shape: shape, isLight: isLight),
            child: Theme(
              data: isLight ? AppTheme.lightTheme : AppTheme.darkTheme,
              child: Material(
                color: isLight ? _lightTint : _darkTint,
                shape: shape,
                child: InkWell(
                  customBorder: shape,
                  onTap: onTap,
                  onLongPress: onLongPress,
                  child: Padding(padding: padding, child: child),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SpecularRimPainter extends CustomPainter {
  final ShapeBorder shape;
  final bool isLight;

  const _SpecularRimPainter({required this.shape, required this.isLight});

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final strength = isLight ? 0.95 : 0.35;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withValues(alpha: strength),
          Colors.white.withValues(alpha: strength * 0.1),
          Colors.white.withValues(alpha: strength * 0.4),
        ],
        stops: const [0, 0.5, 1],
      ).createShader(rect);
    canvas.drawPath(shape.getInnerPath(rect.deflate(0.5)), paint);
  }

  @override
  bool shouldRepaint(_SpecularRimPainter old) =>
      old.isLight != isLight || old.shape != shape;
}
