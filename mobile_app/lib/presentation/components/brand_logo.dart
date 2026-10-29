import 'package:flutter/material.dart';

import '../../core/constants/app_assets.dart';

enum BrandLogoVariant { mark, stacked }

/// The hand-inked Anchor Box logo, navy on light backgrounds and white on
/// dark ones unless [onDark] is forced.
class BrandLogo extends StatelessWidget {
  final BrandLogoVariant variant;
  final double height;
  final bool? onDark;

  const BrandLogo({
    super.key,
    this.variant = BrandLogoVariant.mark,
    this.height = 64,
    this.onDark,
  });

  @override
  Widget build(BuildContext context) {
    final dark = onDark ?? Theme.of(context).brightness == Brightness.dark;
    final asset = switch (variant) {
      BrandLogoVariant.mark =>
        dark ? AppAssets.anchorMarkWhite : AppAssets.anchorMarkNavy,
      BrandLogoVariant.stacked =>
        dark ? AppAssets.logoStackedWhite : AppAssets.logoStackedNavy,
    };
    return Image.asset(
      asset,
      height: height,
      fit: BoxFit.contain,
      semanticLabel: 'Anchor Box',
    );
  }
}
