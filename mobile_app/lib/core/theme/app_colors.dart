import 'package:flutter/material.dart';

/// Semantic color roles. Screens read these through `context.colors`
/// and never use raw hex values.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  final Color background;
  final Color backdropTop;
  final Color backdropMiddle;
  final Color backdropBottom;
  final Color surface;
  final Color card;
  final Color surfaceMuted;
  final Color separator;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color accent;
  final Color onAccent;
  final Color brand;
  final Color locked;
  final Color unlocked;
  final Color alert;
  final Color offline;
  final Color purple;
  final Color teal;
  final Color indigo;

  const AppColors({
    required this.background,
    required this.backdropTop,
    required this.backdropMiddle,
    required this.backdropBottom,
    required this.surface,
    required this.card,
    required this.surfaceMuted,
    required this.separator,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.accent,
    required this.onAccent,
    required this.brand,
    required this.locked,
    required this.unlocked,
    required this.alert,
    required this.offline,
    required this.purple,
    required this.teal,
    required this.indigo,
  });

  static const light = AppColors(
    background: Color(0xFFF2F2F7),
    backdropTop: Color(0xFFCFE2FF),
    backdropMiddle: Color(0xFFE7E3FA),
    backdropBottom: Color(0xFFF7EEE9),
    surface: Color(0xFFFFFFFF),
    card: Color(0xC7FFFFFF),
    surfaceMuted: Color(0xFFE5E5EA),
    separator: Color(0xFFC6C6C8),
    textPrimary: Color(0xFF000000),
    textSecondary: Color(0xFF8A8A8E),
    textTertiary: Color(0xFFC4C4C6),
    accent: Color(0xFF007AFF),
    onAccent: Color(0xFFFFFFFF),
    brand: Color(0xFF0B1F3A),
    locked: Color(0xFF34C759),
    unlocked: Color(0xFFFF9500),
    alert: Color(0xFFFF3B30),
    offline: Color(0xFF8E8E93),
    purple: Color(0xFFAF52DE),
    teal: Color(0xFF30B0C7),
    indigo: Color(0xFF5856D6),
  );

  static const dark = AppColors(
    background: Color(0xFF000000),
    backdropTop: Color(0xFF0F1D36),
    backdropMiddle: Color(0xFF17152B),
    backdropBottom: Color(0xFF0A0A0F),
    surface: Color(0xFF1C1C1E),
    card: Color(0xC71C1C1E),
    surfaceMuted: Color(0xFF2C2C2E),
    separator: Color(0xFF38383A),
    textPrimary: Color(0xFFFFFFFF),
    textSecondary: Color(0xFF8D8D93),
    textTertiary: Color(0xFF48484A),
    accent: Color(0xFF0A84FF),
    onAccent: Color(0xFFFFFFFF),
    brand: Color(0xFF0B1F3A),
    locked: Color(0xFF30D158),
    unlocked: Color(0xFFFF9F0A),
    alert: Color(0xFFFF453A),
    offline: Color(0xFF8E8E93),
    purple: Color(0xFFBF5AF2),
    teal: Color(0xFF40C8E0),
    indigo: Color(0xFF5E5CE6),
  );

  @override
  AppColors copyWith({
    Color? background,
    Color? backdropTop,
    Color? backdropMiddle,
    Color? backdropBottom,
    Color? surface,
    Color? card,
    Color? surfaceMuted,
    Color? separator,
    Color? textPrimary,
    Color? textSecondary,
    Color? textTertiary,
    Color? accent,
    Color? onAccent,
    Color? brand,
    Color? locked,
    Color? unlocked,
    Color? alert,
    Color? offline,
    Color? purple,
    Color? teal,
    Color? indigo,
  }) {
    return AppColors(
      background: background ?? this.background,
      backdropTop: backdropTop ?? this.backdropTop,
      backdropMiddle: backdropMiddle ?? this.backdropMiddle,
      backdropBottom: backdropBottom ?? this.backdropBottom,
      surface: surface ?? this.surface,
      card: card ?? this.card,
      surfaceMuted: surfaceMuted ?? this.surfaceMuted,
      separator: separator ?? this.separator,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textTertiary: textTertiary ?? this.textTertiary,
      accent: accent ?? this.accent,
      onAccent: onAccent ?? this.onAccent,
      brand: brand ?? this.brand,
      locked: locked ?? this.locked,
      unlocked: unlocked ?? this.unlocked,
      alert: alert ?? this.alert,
      offline: offline ?? this.offline,
      purple: purple ?? this.purple,
      teal: teal ?? this.teal,
      indigo: indigo ?? this.indigo,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColors(
      background: mix(background, other.background),
      backdropTop: mix(backdropTop, other.backdropTop),
      backdropMiddle: mix(backdropMiddle, other.backdropMiddle),
      backdropBottom: mix(backdropBottom, other.backdropBottom),
      surface: mix(surface, other.surface),
      card: mix(card, other.card),
      surfaceMuted: mix(surfaceMuted, other.surfaceMuted),
      separator: mix(separator, other.separator),
      textPrimary: mix(textPrimary, other.textPrimary),
      textSecondary: mix(textSecondary, other.textSecondary),
      textTertiary: mix(textTertiary, other.textTertiary),
      accent: mix(accent, other.accent),
      onAccent: mix(onAccent, other.onAccent),
      brand: mix(brand, other.brand),
      locked: mix(locked, other.locked),
      unlocked: mix(unlocked, other.unlocked),
      alert: mix(alert, other.alert),
      offline: mix(offline, other.offline),
      purple: mix(purple, other.purple),
      teal: mix(teal, other.teal),
      indigo: mix(indigo, other.indigo),
    );
  }
}
