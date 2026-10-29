import 'dart:math' as math;

import 'package:flutter/material.dart';

/// iOS type scale (sizes and line heights of SF Pro text styles) set in
/// Inter, mapped onto Material's [TextTheme] slots:
///
/// | Slot           | iOS style   | Slot        | iOS style  |
/// |----------------|-------------|-------------|------------|
/// | displaySmall   | Large Title | bodyLarge   | Body       |
/// | headlineMedium | Title 1     | bodyMedium  | Subheadline|
/// | headlineSmall  | Title 2     | bodySmall   | Footnote   |
/// | titleLarge     | Title 3     | labelLarge  | Button     |
/// | titleMedium    | Headline    | labelMedium | Caption 1  |
/// | titleSmall     | Subheadline (emphasized) | labelSmall | Caption 2 |
abstract final class AppTypography {
  static const String fontFamily = 'Inter';

  /// Inter's dynamic metrics: tighter tracking as the size grows, the same
  /// optical correction SF Pro applies.
  static double tracking(double size) =>
      size * (-0.0223 + 0.185 * math.exp(-0.1745 * size));

  static TextTheme textTheme(Color primary, Color secondary) {
    TextStyle style(
      double size,
      double lineHeight,
      FontWeight weight, {
      Color? color,
    }) {
      return TextStyle(
        fontFamily: fontFamily,
        fontSize: size,
        height: lineHeight / size,
        fontWeight: weight,
        letterSpacing: tracking(size),
        color: color ?? primary,
      );
    }

    return TextTheme(
      displaySmall: style(34, 41, FontWeight.w700),
      headlineMedium: style(28, 34, FontWeight.w700),
      headlineSmall: style(22, 28, FontWeight.w700),
      titleLarge: style(20, 25, FontWeight.w600),
      titleMedium: style(17, 22, FontWeight.w600),
      titleSmall: style(15, 20, FontWeight.w600),
      bodyLarge: style(17, 22, FontWeight.w400),
      bodyMedium: style(15, 20, FontWeight.w400),
      bodySmall: style(13, 18, FontWeight.w400, color: secondary),
      labelLarge: style(17, 22, FontWeight.w600),
      labelMedium: style(12, 16, FontWeight.w500, color: secondary),
      labelSmall: style(11, 13, FontWeight.w500, color: secondary),
    );
  }
}
