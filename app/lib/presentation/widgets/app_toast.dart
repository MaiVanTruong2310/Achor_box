import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/app_notification.dart';

enum ToastType { success, error, info }

class AppToast {
  static void show(
    BuildContext context, {
    required String message,
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    final overlayState = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => _ToastWidget(
        message: message,
        type: type,
        duration: duration,
        onDismissed: () {
          if (overlayEntry.mounted) {
            overlayEntry.remove();
          }
        },
      ),
    );

    overlayState.insert(overlayEntry);
  }
}

class _ToastWidget extends StatefulWidget {
  final String message;
  final ToastType type;
  final Duration duration;
  final VoidCallback onDismissed;

  const _ToastWidget({
    required this.message,
    required this.type,
    required this.duration,
    required this.onDismissed,
  });

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late AnimationController _progressController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _progressController = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0.0, -0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));

    _animationController.forward();
    _progressController.forward().then((_) {
      _dismiss();
    });
  }

  void _dismiss() {
    if (!mounted) return;
    _animationController.reverse().then((_) {
      widget.onDismissed();
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  /// Same green / blue / red as notifications and device history.
  NotificationSeverity get _severity => switch (widget.type) {
        ToastType.success => NotificationSeverity.success,
        ToastType.error => NotificationSeverity.danger,
        ToastType.info => NotificationSeverity.info,
      };

  IconData get _iconData => switch (widget.type) {
        ToastType.success => AppIcons.success,
        ToastType.error => AppIcons.error,
        ToastType.info => AppIcons.info,
      };

  String _typeTitle(BuildContext context) => switch (widget.type) {
        ToastType.success => context.tr(vi: 'Thành công', en: 'Done'),
        ToastType.error => context.tr(vi: 'Có lỗi', en: 'Something went wrong'),
        ToastType.info => context.tr(vi: 'Thông báo', en: 'Notice'),
      };

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = _severity.color(colors);
    return Positioned(
      top: MediaQuery.of(context).padding.top + 16,
      right: 16,
      child: Material(
        color: Colors.transparent,
        child: SlideTransition(
          position: _slideAnimation,
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.82,
              constraints: const BoxConstraints(maxWidth: 320),
              child: DecoratedBox(
                decoration: ShapeDecoration(
                  // Theme surface tinted with the tone, so it reads in
                  // both Light and Dark Mode.
                  color: Color.alphaBlend(
                    accent.withValues(alpha: isDark ? 0.16 : 0.08),
                    colors.surface,
                  ),
                  shape: RoundedSuperellipseBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(color: accent.withValues(alpha: 0.35)),
                  ),
                  shadows: [
                    BoxShadow(
                      color:
                          Colors.black.withValues(alpha: isDark ? 0.4 : 0.14),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Content Row
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 12, 13),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // Icon Box
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: accent,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _iconData,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Text Content
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    _typeTitle(context),
                                    style: context.text.titleSmall
                                        ?.copyWith(color: accent),
                                  ),
                                  const SizedBox(height: 2),
                                  Semantics(
                                    liveRegion: true,
                                    child: Text(
                                      widget.message,
                                      style: context.text.bodySmall?.copyWith(
                                        color: colors.textPrimary
                                            .withValues(alpha: 0.85),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Close Button
                            InkResponse(
                              onTap: _dismiss,
                              radius: 20,
                              child: Container(
                                width: 30,
                                height: 30,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: colors.textPrimary
                                      .withValues(alpha: 0.08),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.close_rounded,
                                  color: colors.textSecondary,
                                  size: 17,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Animated Progress Line at Bottom
                      AnimatedBuilder(
                        animation: _progressController,
                        builder: (context, child) {
                          return FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: 1.0 - _progressController.value,
                            child: Container(
                              height: 3,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    accent.withValues(alpha: 0.55),
                                    accent,
                                  ],
                                ),
                                borderRadius: const BorderRadius.only(
                                  bottomLeft: Radius.circular(20),
                                  bottomRight: Radius.circular(20),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
