import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../components/components.dart';

/// Shared layout of the sign-in flow: logo, large title, form, footer.
class AuthScaffold extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final Widget? footer;
  final bool showBackButton;

  const AuthScaffold({
    super.key,
    required this.title,
    required this.children,
    this.subtitle,
    this.footer,
    this.showBackButton = false,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: AppBackdrop(
        // Styles below must come from the backdrop's theme, not this context.
        child: Builder(
          builder: (context) => SafeArea(
            child: Column(
              children: [
                SizedBox(
                  height: AppSizes.minTapTarget + AppSpacing.xs,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: showBackButton
                        ? const Padding(
                            padding: EdgeInsets.only(left: AppSpacing.xs),
                            child: AppBackButton(),
                          )
                        : null,
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.xl,
                      AppSpacing.xs,
                      AppSpacing.xl,
                      AppSpacing.xl,
                    ),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 440),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Center(child: BrandLogo(height: 72)),
                            const SizedBox(height: AppSpacing.xl),
                            Text(
                              title,
                              textAlign: TextAlign.center,
                              style: context.text.headlineMedium,
                            ),
                            if (subtitle != null) ...[
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                subtitle!,
                                textAlign: TextAlign.center,
                                style: context.text.bodyMedium?.copyWith(
                                  color: context.colors.textSecondary,
                                ),
                              ),
                            ],
                            const SizedBox(height: AppSpacing.xl),
                            ...children,
                            if (footer != null) ...[
                              const SizedBox(height: AppSpacing.lg),
                              footer!,
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AuthFooterLink extends StatelessWidget {
  final String prompt;
  final String action;
  final VoidCallback onPressed;

  const AuthFooterLink({
    super.key,
    required this.prompt,
    required this.action,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Flexible(
          child: Text(
            prompt,
            style: context.text.bodyMedium
                ?.copyWith(color: context.colors.textSecondary),
          ),
        ),
        TextButton(onPressed: onPressed, child: Text(action)),
      ],
    );
  }
}
