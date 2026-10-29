import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import 'wallpaper.dart';

/// Apple Home style background of the onboarding and sign-in screens: the
/// same photo wallpaper as the main tabs with white content on top, in both
/// Light and Dark Mode. Read styles inside [child] from its own context.
class AppBackdrop extends StatelessWidget {
  final Widget child;

  const AppBackdrop({super.key, required this.child});

  /// Dark theme tuned for white text over the photo: brighter secondary
  /// text, translucent glass inputs and white text buttons.
  static final ThemeData theme = _buildTheme();

  /// Extra dimming so white text stays readable over the light middle of
  /// the photo.
  static const _scrim = Color(0x40000000);

  static ThemeData _buildTheme() {
    final base = AppTheme.darkTheme;
    final colors = AppColors.dark.copyWith(
      textSecondary: const Color(0xD9FFFFFF),
      textTertiary: const Color(0x99FFFFFF),
    );
    final text =
        AppTypography.textTheme(colors.textPrimary, colors.textSecondary);
    const radius = AppRadius.mdAll;
    return base.copyWith(
      extensions: [colors],
      textTheme: text,
      inputDecorationTheme: base.inputDecorationTheme.copyWith(
        fillColor: const Color(0x47000000),
        hintStyle: text.bodyLarge?.copyWith(color: colors.textTertiary),
        labelStyle: text.bodyMedium?.copyWith(color: colors.textSecondary),
        floatingLabelStyle: text.bodySmall?.copyWith(color: Colors.white),
        prefixIconColor: colors.textSecondary,
        suffixIconColor: colors.textSecondary,
        enabledBorder: const OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: Color(0x33FFFFFF), width: 0.8),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: Colors.white, width: 1.5),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          minimumSize: const Size(AppSizes.minTapTarget, AppSizes.minTapTarget),
          textStyle: text.labelLarge,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Theme(
        data: theme,
        child: Wallpaper(
          child: DecoratedBox(
            decoration: const BoxDecoration(color: _scrim),
            child: BackdropGroup(child: child),
          ),
        ),
      ),
    );
  }
}
