import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';
import 'wallpaper.dart';

/// Standard screen layout over the photo wallpaper: optional back button,
/// large white title, scrollable glass content and pull to refresh.
class AppPage extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final List<Widget> children;
  final Future<void> Function()? onRefresh;
  final bool showBackButton;

  const AppPage({
    super.key,
    required this.title,
    required this.children,
    this.subtitle,
    this.actions = const [],
    this.onRefresh,
    this.showBackButton = false,
  });

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom + AppSpacing.xxl;

    return Theme(
      data: AppTheme.darkTheme,
      child: Builder(builder: (context) {
        final scrollView = CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xs,
                  AppSpacing.xs,
                  AppSpacing.xs,
                  0,
                ),
                child: SizedBox(
                  height: AppSizes.minTapTarget,
                  child: Row(
                    children: [
                      if (showBackButton) const AppBackButton(),
                      const Spacer(),
                      ...actions,
                    ],
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.page,
                AppSpacing.xxs,
                AppSpacing.page,
                0,
              ),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: context.text.displaySmall),
                    if (subtitle != null) ...[
                      const SizedBox(height: AppSpacing.xxs),
                      Text(
                        subtitle!,
                        style: context.text.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.page,
                AppSpacing.xs,
                AppSpacing.page,
                bottomInset,
              ),
              sliver: SliverList.list(children: children),
            ),
          ],
        );

        return Scaffold(
          backgroundColor: Colors.black,
          body: Wallpaper(
            child: BackdropGroup(
              child: SafeArea(
                bottom: false,
                child: onRefresh == null
                    ? scrollView
                    : RefreshIndicator.adaptive(
                        onRefresh: onRefresh!,
                        child: scrollView,
                      ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

class AppBackButton extends StatelessWidget {
  const AppBackButton({super.key});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).brightness == Brightness.dark
        ? context.colors.textPrimary
        : context.colors.accent;
    return TextButton(
      onPressed: () => Navigator.maybePop(context),
      style: TextButton.styleFrom(
        foregroundColor: color,
        padding: const EdgeInsets.only(right: AppSpacing.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(AppIcons.chevronLeft, size: 22, color: color),
          Text(
            context.tr(vi: 'Quay lại', en: 'Back'),
            style: context.text.bodyLarge?.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
