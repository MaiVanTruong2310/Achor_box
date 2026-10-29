import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/preferences/onboarding_store.dart';
import '../../../core/theme/app_theme.dart';
import '../../components/components.dart';
import 'login_screen.dart';
import 'register_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  double _page = 0;

  @override
  void initState() {
    super.initState();
    _pageController.addListener(() {
      setState(() => _page = _pageController.page ?? 0);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  List<_Slide> _slides(BuildContext context) => [
        _Slide(
          icon: AppIcons.box,
          title: context.tr(
              vi: 'Nhận hàng cả khi vắng nhà',
              en: 'Get parcels while you are out'),
          body: context.tr(
            vi: 'Người giao hàng mở hộp bằng mã PIN một lần, đặt hàng vào và hộp tự khóa lại an toàn.',
            en: 'Couriers open the box with a one-time PIN, drop the parcel and the box locks again.',
          ),
        ),
        _Slide(
          icon: AppIcons.notifications,
          title: context.tr(vi: 'Biết ngay mọi chuyện', en: 'Know right away'),
          body: context.tr(
            vi: 'Nhận thông báo khi có hàng, khi nắp hộp mở và khi có người mở trái phép.',
            en: 'Get notified when a parcel arrives, when the lid opens or when someone forces it.',
          ),
        ),
        _Slide(
          icon: AppIcons.unlock,
          title:
              context.tr(vi: 'Bạn nắm toàn quyền', en: 'You stay in control'),
          body: context.tr(
            vi: 'Mở khóa từ xa, quản lý mã PIN và chia sẻ quyền truy cập cho người thân.',
            en: 'Unlock remotely, manage PINs and share access with your family.',
          ),
        ),
      ];

  Future<void> _finish(Widget destination) async {
    await OnboardingStore.markCompleted();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => destination),
    );
  }

  @override
  Widget build(BuildContext context) {
    final slides = _slides(context);
    final isLast = _page > slides.length - 1.5;

    return Scaffold(
      backgroundColor: Colors.black,
      body: AppBackdrop(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Column(
              children: [
                SizedBox(
                  height: AppSizes.minTapTarget + AppSpacing.xs,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: AnimatedOpacity(
                      opacity: isLast ? 0 : 1,
                      duration: AppDurations.fast,
                      child: TextButton(
                        onPressed:
                            isLast ? null : () => _finish(const LoginScreen()),
                        child: Text(context.tr(vi: 'Bỏ qua', en: 'Skip')),
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                const BrandLogo(
                  variant: BrandLogoVariant.stacked,
                  height: 168,
                ),
                const Spacer(),
                SizedBox(
                  height: 190,
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: slides.length,
                    itemBuilder: (context, index) => _SlideView(slides[index]),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _PageDots(
                  count: slides.length,
                  position: _page,
                  color: Colors.white,
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: isLast
                      ? context.tr(vi: 'Tạo tài khoản', en: 'Create account')
                      : context.tr(vi: 'Tiếp tục', en: 'Continue'),
                  onPressed: isLast
                      ? () => _finish(const RegisterScreen())
                      : () => _pageController.nextPage(
                            duration: AppDurations.slow,
                            curve: Curves.easeOutCubic,
                          ),
                ),
                const SizedBox(height: AppSpacing.xs),
                AnimatedOpacity(
                  opacity: isLast ? 1 : 0,
                  duration: AppDurations.fast,
                  child: TextButton(
                    onPressed:
                        isLast ? () => _finish(const LoginScreen()) : null,
                    child: Text(context.tr(
                        vi: 'Tôi đã có tài khoản',
                        en: 'I already have an account')),
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Slide {
  final IconData icon;
  final String title;
  final String body;

  const _Slide({required this.icon, required this.title, required this.body});
}

class _SlideView extends StatelessWidget {
  final _Slide slide;

  const _SlideView(this.slide);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(slide.icon, color: Colors.white, size: 32),
        const SizedBox(height: AppSpacing.md),
        Text(
          slide.title,
          textAlign: TextAlign.center,
          style: context.text.headlineSmall,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          slide.body,
          textAlign: TextAlign.center,
          style: context.text.bodyMedium?.copyWith(
            color: context.colors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _PageDots extends StatelessWidget {
  final int count;
  final double position;
  final Color color;

  const _PageDots({
    required this.count,
    required this.position,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          Container(
            width: 8 + 16 * _activeAmount(i),
            height: 8,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.25 + 0.75 * _activeAmount(i)),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
      ],
    );
  }

  double _activeAmount(int index) =>
      (1 - (position - index).abs()).clamp(0.0, 1.0).toDouble();
}
