import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'glass_surface.dart';

class GlassTabItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const GlassTabItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}

/// Floating iOS 26 style tab bar: a dark glass capsule over the page, the
/// selected tab marked by a lighter pill. Use with `Scaffold.extendBody`.
class GlassTabBar extends StatelessWidget {
  final List<GlassTabItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const GlassTabBar({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelected,
  });

  static const double _height = 62;
  static const double _inset = 4;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.md,
        0,
        AppSpacing.md,
        bottom > 0 ? bottom : AppSpacing.sm,
      ),
      child: GlassSurface(
        style: GlassStyle.dark,
        capsule: true,
        padding: const EdgeInsets.all(_inset),
        child: SizedBox(
          height: _height - _inset * 2,
          child: LayoutBuilder(builder: (context, constraints) {
            final tabWidth = constraints.maxWidth / items.length;
            return Stack(
              children: [
                AnimatedPositioned(
                  duration: AppDurations.normal,
                  curve: Curves.easeOutCubic,
                  left: tabWidth * selectedIndex,
                  top: 0,
                  bottom: 0,
                  width: tabWidth,
                  child: DecoratedBox(
                    decoration: ShapeDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      shape: const StadiumBorder(),
                    ),
                  ),
                ),
                Row(
                  children: [
                    for (var i = 0; i < items.length; i++)
                      Expanded(
                        child: _TabButton(
                          item: items[i],
                          selected: i == selectedIndex,
                          onTap: () => onSelected(i),
                        ),
                      ),
                  ],
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final GlassTabItem item;
  final bool selected;
  final VoidCallback onTap;

  const _TabButton({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final color = selected ? colors.accent : Colors.white;
    return Semantics(
      selected: selected,
      button: true,
      label: item.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(selected ? item.selectedIcon : item.icon,
                color: color, size: 24),
            const SizedBox(height: 2),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.text.labelSmall?.copyWith(
                color: color,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
