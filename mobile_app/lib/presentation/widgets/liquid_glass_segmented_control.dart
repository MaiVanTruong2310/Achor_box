import 'dart:ui';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/constants/legacy_colors.dart';

/// Data class for segmented item / bottom nav tab
class LiquidGlassSegmentItem {
  final String label;
  final IconData? icon;
  final IconData? selectedIcon;

  const LiquidGlassSegmentItem({
    required this.label,
    this.icon,
    IconData? selectedIcon,
    IconData? activeIcon,
  }) : selectedIcon = selectedIcon ?? activeIcon;
}

/// iOS 26 Liquid Glass Segmented Control / Sliding Navigation Bar Widget
/// Features a single translucent glass pill selector that physically slides between items
/// using `AnimatedPositioned` with a smooth `Curves.easeOutCubic` curve.
class LiquidGlassSegmentedControl extends StatelessWidget {
  final List<LiquidGlassSegmentItem> items;
  final int selectedIndex;
  final double? position;
  final ValueChanged<int> OnItemSelected;
  final double height;
  final double padding;
  final double borderRadius;
  final double selectorBorderRadius;
  final Color? activeColor;
  final Color? inactiveColor;

  const LiquidGlassSegmentedControl({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.OnItemSelected,
    this.position,
    this.height = 54.0,
    this.padding = 4.0,
    this.borderRadius = 28.0,
    this.selectorBorderRadius = 22.0,
    this.activeColor,
    this.inactiveColor,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final outerRadius = BorderRadius.circular(borderRadius);
    final innerSelectorRadius = BorderRadius.circular(selectorBorderRadius);

    final resolvedActiveColor = activeColor ??
        (isDark ? const Color(0xFF7DD3FC) : LegacyColors.brandBlue);
    final resolvedInactiveColor = inactiveColor ??
        (isDark ? const Color(0xFFB7C4D6) : const Color(0xFF64748B));

    return Container(
      height: height,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      decoration: BoxDecoration(
        borderRadius: outerRadius,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.22 : 0.08),
            blurRadius: 20,
            spreadRadius: -2,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: isDark
                ? Colors.white.withOpacity(0.06)
                : Colors.white.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, -1),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: outerRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: outerRadius,
              // Translucent Frosted Outer Shell
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [
                        const Color(0xFF1B273A).withOpacity(0.86),
                        const Color(0xFF111A2A).withOpacity(0.78),
                      ]
                    : [
                        Colors.white.withOpacity(0.40),
                        Colors.white.withOpacity(0.20),
                      ],
              ),
              border: Border.all(
                color: Colors.white.withOpacity(isDark ? 0.16 : 0.50),
                width: 0.8,
              ),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final totalWidth = constraints.maxWidth - (padding * 2);
                final itemWidth = totalWidth / items.length;
                final selectorHeight = height - (padding * 2);
                final resolvedPosition = (position ?? selectedIndex.toDouble())
                    .clamp(
                      0.0,
                      (items.length - 1).toDouble(),
                    )
                    .toDouble();
                final dragFraction =
                    resolvedPosition - resolvedPosition.floor();
                final stretch = math.sin(math.pi * dragFraction) * 0.08;
                final selectorWidth = itemWidth * (1 + stretch);
                final selectorLeft = padding +
                    (resolvedPosition * itemWidth) -
                    ((selectorWidth - itemWidth) / 2);

                return Stack(
                  children: [
                    // 1. Sliding Physical Liquid Glass Pill Selector
                    AnimatedPositioned(
                      duration: position == null
                          ? const Duration(milliseconds: 320)
                          : Duration.zero,
                      curve: Curves.easeOutCubic,
                      left: selectorLeft,
                      top: padding,
                      width: selectorWidth,
                      height: selectorHeight,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: innerSelectorRadius,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black
                                  .withOpacity(isDark ? 0.16 : 0.10),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: innerSelectorRadius,
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: innerSelectorRadius,
                                // iOS 26 Liquid Glass Selector Pill Specular Gradient
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: isDark
                                      ? [
                                          Colors.white.withOpacity(0.16),
                                          Colors.white.withOpacity(0.10),
                                          Colors.white.withOpacity(0.07),
                                        ]
                                      : [
                                          Colors.white.withOpacity(0.70),
                                          Colors.white.withOpacity(0.35),
                                          Colors.white.withOpacity(0.25),
                                        ],
                                  stops: const [0.0, 0.5, 1.0],
                                ),
                                border: Border.all(
                                  color: Colors.white.withOpacity(
                                    isDark ? 0.24 : 0.75,
                                  ),
                                  width: 0.8,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),

                    // 2. Interactive Tab Items Row
                    Positioned.fill(
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: padding),
                        child: Row(
                          children: items.asMap().entries.map((entry) {
                            final index = entry.key;
                            final item = entry.value;
                            final selectedAmount =
                                (1.0 - (resolvedPosition - index).abs())
                                    .clamp(0.0, 1.0)
                                    .toDouble();
                            final itemColor = Color.lerp(
                              resolvedInactiveColor,
                              resolvedActiveColor,
                              selectedAmount,
                            )!;

                            return Expanded(
                              child: GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () => OnItemSelected(index),
                                child: Center(
                                  child: AnimatedDefaultTextStyle(
                                    duration: position == null
                                        ? const Duration(milliseconds: 200)
                                        : Duration.zero,
                                    style: TextStyle(
                                      color: itemColor,
                                      fontWeight: selectedAmount > 0.5
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      fontSize: item.icon == null ? 13 : 12.5,
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (item.icon != null) ...[
                                          AnimatedScale(
                                            scale:
                                                1.0 + (0.12 * selectedAmount),
                                            duration: position == null
                                                ? const Duration(
                                                    milliseconds: 250)
                                                : Duration.zero,
                                            curve: Curves.easeOutBack,
                                            child: Icon(
                                              selectedAmount > 0.5
                                                  ? (item.selectedIcon ??
                                                      item.icon!)
                                                  : item.icon!,
                                              size: 21,
                                              color: itemColor,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                        ],
                                        Text(
                                          item.label,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
