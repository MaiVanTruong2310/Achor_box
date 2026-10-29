import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Pre-configured color presets for Neon Bubble Background
enum NeonBubblePreset {
  iosLiquid, // Sky Blue, Purple, Mint Cyan, Soft Coral
  cyberpunk, // Electric Blue, Neon Magenta, Golden Amber
  emerald, // Emerald Green, Teal, Cyan, Mint
  sunset, // Warm Orange, Deep Rose, Golden Yellow
}

/// Data class representing an ambient glowing color bubble
class NeonBubble {
  final Alignment alignment;
  final double radius;
  final Color color;
  final double opacity;

  const NeonBubble({
    required this.alignment,
    required this.radius,
    required this.color,
    this.opacity = 0.35,
  });
}

/// Reusable Page Wrapper Widget for Ambient Glowing Neon Blur Bubbles
/// Perfectly pairs with LiquidGlassContainer for iOS 26 Liquid Glass UI.
///
/// Performance: the bubbles are static by default and painted once in their
/// own [RepaintBoundary]. A looping animation would force a new frame 60-120
/// times per second for as long as the page is visible, and every glass
/// surface above it would be recomposited each frame (the phone heats up).
/// Set [animate] only for short-lived screens.
class NeonBubbleBackground extends StatefulWidget {
  final Widget child;
  final Color? backgroundColor;
  final List<NeonBubble>? customBubbles;
  final NeonBubblePreset preset;
  final bool animate;

  const NeonBubbleBackground({
    super.key,
    required this.child,
    this.backgroundColor,
    this.customBubbles,
    this.preset = NeonBubblePreset.iosLiquid,
    this.animate = false,
  });

  @override
  State<NeonBubbleBackground> createState() => _NeonBubbleBackgroundState();
}

class _NeonBubbleBackgroundState extends State<NeonBubbleBackground>
    with SingleTickerProviderStateMixin {
  AnimationController? _animationController;

  /// Shared by every `BackdropFilter.grouped` on this page, so real blurs
  /// sample the backdrop once instead of once per glass surface.
  final BackdropKey _backdropKey = BackdropKey();

  @override
  void initState() {
    super.initState();
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant NeonBubbleBackground oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.animate != widget.animate) _syncAnimation();
  }

  void _syncAnimation() {
    if (widget.animate) {
      // The ticker is muted automatically while the page is off screen
      // (TickerMode), so a hidden tab does not keep rendering.
      _animationController ??= AnimationController(
        vsync: this,
        duration: const Duration(seconds: 8),
      )..repeat(reverse: true);
    } else {
      _animationController?.dispose();
      _animationController = null;
    }
  }

  @override
  void dispose() {
    _animationController?.dispose();
    super.dispose();
  }

  List<NeonBubble> _getPresetBubbles() {
    if (widget.customBubbles != null && widget.customBubbles!.isNotEmpty) {
      return widget.customBubbles!;
    }

    switch (widget.preset) {
      case NeonBubblePreset.cyberpunk:
        return const [
          NeonBubble(
              alignment: Alignment(-1.2, -0.8),
              radius: 240,
              color: Color(0xFF00E5FF),
              opacity: 0.30),
          NeonBubble(
              alignment: Alignment(1.3, -0.2),
              radius: 260,
              color: Color(0xFFFF007F),
              opacity: 0.28),
          NeonBubble(
              alignment: Alignment(-0.8, 0.7),
              radius: 220,
              color: Color(0xFFFFB300),
              opacity: 0.25),
        ];
      case NeonBubblePreset.emerald:
        return const [
          NeonBubble(
              alignment: Alignment(1.2, -0.9),
              radius: 250,
              color: Color(0xFF00E676),
              opacity: 0.28),
          NeonBubble(
              alignment: Alignment(-1.1, -0.1),
              radius: 230,
              color: Color(0xFF00B0FF),
              opacity: 0.25),
          NeonBubble(
              alignment: Alignment(1.0, 0.8),
              radius: 220,
              color: Color(0xFF1DE9B6),
              opacity: 0.25),
        ];
      case NeonBubblePreset.sunset:
        return const [
          NeonBubble(
              alignment: Alignment(-1.1, -0.9),
              radius: 260,
              color: Color(0xFFFF6D00),
              opacity: 0.30),
          NeonBubble(
              alignment: Alignment(1.3, -0.3),
              radius: 240,
              color: Color(0xFFFF1744),
              opacity: 0.25),
          NeonBubble(
              alignment: Alignment(-0.9, 0.8),
              radius: 230,
              color: Color(0xFFFFD600),
              opacity: 0.22),
        ];
      case NeonBubblePreset.iosLiquid:
        return const [
          // Top Right Sky Blue
          NeonBubble(
              alignment: Alignment(1.3, -0.95),
              radius: 250,
              color: Color(0xFF64B5F6),
              opacity: 0.32),
          // Center Left Soft Purple
          NeonBubble(
              alignment: Alignment(-1.3, -0.1),
              radius: 240,
              color: Color(0xFFBA68C8),
              opacity: 0.28),
          // Bottom Right Mint Cyan
          NeonBubble(
              alignment: Alignment(1.2, 0.8),
              radius: 260,
              color: Color(0xFF4DB6AC),
              opacity: 0.28),
          // Bottom Left Coral Pink
          NeonBubble(
              alignment: Alignment(-1.1, 0.95),
              radius: 210,
              color: Color(0xFFFF8A80),
              opacity: 0.22),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final bubbles = _getPresetBubbles();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBackground = widget.backgroundColor ??
        (isDark ? const Color(0xFF0B1220) : Colors.white);
    final glowMultiplier = isDark ? 0.55 : 1.0;

    Widget bubbleLayer(double floatOffset) => Stack(
          children: [
            for (final (index, bubble) in bubbles.indexed)
              Align(
                alignment: bubble.alignment,
                child: Transform.translate(
                  offset: Offset(
                    (index % 3 == 0) ? floatOffset * 0.5 : -floatOffset * 0.5,
                    (index % 2 == 0) ? floatOffset : -floatOffset,
                  ),
                  child: _BubbleDot(
                    bubble: bubble,
                    glowMultiplier: glowMultiplier,
                  ),
                ),
              ),
          ],
        );

    final controller = _animationController;
    final background = controller == null
        ? bubbleLayer(0)
        : AnimatedBuilder(
            animation: controller,
            builder: (context, _) =>
                bubbleLayer(math.sin(controller.value * math.pi) * 12),
          );

    return Scaffold(
      backgroundColor: effectiveBackground,
      body: BackdropGroup(
        backdropKey: _backdropKey,
        child: Stack(
          children: [
            Positioned.fill(child: RepaintBoundary(child: background)),
            // Page content is outside the animated subtree: it never rebuilds
            // or repaints because the bubbles move.
            widget.child,
          ],
        ),
      ),
    );
  }
}

class _BubbleDot extends StatelessWidget {
  final NeonBubble bubble;
  final double glowMultiplier;

  const _BubbleDot({required this.bubble, required this.glowMultiplier});

  @override
  Widget build(BuildContext context) {
    final strength =
        (bubble.opacity * glowMultiplier).clamp(0.0, 1.0).toDouble();
    return SizedBox(
      width: bubble.radius,
      height: bubble.radius,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              bubble.color.withValues(alpha: strength),
              bubble.color.withValues(alpha: strength * 0.3),
              Colors.transparent,
            ],
            stops: const [0.0, 0.5, 1.0],
          ),
        ),
      ),
    );
  }
}
