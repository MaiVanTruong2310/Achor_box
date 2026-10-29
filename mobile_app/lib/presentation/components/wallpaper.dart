import 'package:flutter/material.dart';

import '../../core/constants/app_assets.dart';

/// Apple Home style photo wallpaper (pre-blurred at build time), darkened at
/// the top so large white titles stay readable. Isolated in a
/// [RepaintBoundary] and never animated.
class Wallpaper extends StatelessWidget {
  final Widget child;

  const Wallpaper({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const RepaintBoundary(
          child: DecoratedBox(
            position: DecorationPosition.foreground,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x80000000),
                  Color(0x1A000000),
                  Color(0x4D000000)
                ],
                stops: [0, 0.35, 1],
              ),
            ),
            child: Image(
              image: AssetImage(AppAssets.wallpaperHome),
              fit: BoxFit.cover,
              gaplessPlayback: true,
            ),
          ),
        ),
        child,
      ],
    );
  }
}
