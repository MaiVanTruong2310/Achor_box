import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_assets.dart';
import 'login_screen.dart';

class OnboardingItem {
  final String title;
  final String description;
  final String buttonText;
  final String imageAsset;

  const OnboardingItem({
    required this.title,
    required this.description,
    required this.buttonText,
    required this.imageAsset,
  });
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<OnboardingItem> _pages = const [
    OnboardingItem(
      title: "Điều Khiển Từ Xa",
      description:
          "Quản lý hộp bưu kiện an toàn của bạn từ bất cứ đâu. Giám sát trạng thái theo thời gian thực và nhận thông báo khi gói hàng được giao.",
      buttonText: "Tiếp Tục",
      imageAsset: AppAssets.splash1Image,
    ),
    OnboardingItem(
      title: "Lưu Trữ An Toàn & Tiện Lợi",
      description:
          "Biến hộp Anchor Box thành nơi nhận hàng tạp hóa, thực phẩm tươi sống hoặc các gói hàng cá nhân, đảm bảo an toàn và tránh nắng mưa.",
      buttonText: "Tiếp Tục",
      imageAsset: AppAssets.splash2Image,
    ),
    OnboardingItem(
      title: "Hệ Thống Thông Minh",
      description:
          "Tích hợp liền mạch với hệ thống nhà thông minh. Điều khiển khóa tự động, theo dõi bằng camera và báo cáo chi tiết qua ứng dụng.",
      buttonText: "Bắt đầu",
      imageAsset: AppAssets.splash3Image,
    ),
  ];

  void _navigateToLogin() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 750),
        reverseTransitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (context, animation, secondaryAnimation) => const LoginScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          final curveAnimation = CurvedAnimation(
            parent: animation,
            curve: Curves.easeInOutCubic,
          );

          final slideAnimation = Tween<Offset>(
            begin: const Offset(0.0, 0.04),
            end: Offset.zero,
          ).animate(curveAnimation);

          final scaleAnimation = Tween<double>(
            begin: 0.95,
            end: 1.0,
          ).animate(curveAnimation);

          return FadeTransition(
            opacity: curveAnimation,
            child: ScaleTransition(
              scale: scaleAnimation,
              child: SlideTransition(
                position: slideAnimation,
                child: child,
              ),
            ),
          );
        },
      ),
    );
  }

  void _onNextPressed() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    } else {
      _navigateToLogin();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Widget _buildPaginationDot(int index) {
    final bool isActive = _currentPage == index;
    if (isActive) {
      return Container(
        width: 28,
        height: 6,
        margin: const EdgeInsets.symmetric(horizontal: 3),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(3),
          color: Colors.white,
        ),
      );
    } else {
      return Container(
        width: 8,
        height: 8,
        margin: const EdgeInsets.symmetric(horizontal: 3),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(0.4),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentItem = _pages[_currentPage];

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Layer 1: Full Background Image with fallback to appLogo
          Positioned.fill(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: Image.asset(
                currentItem.imageAsset,
                key: ValueKey<int>(_currentPage),
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
                errorBuilder: (context, error, stackTrace) {
                  return Image.asset(
                    AppAssets.appLogo,
                    key: ValueKey<String>("fallback_$_currentPage"),
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: double.infinity,
                    errorBuilder: (context, error2, stackTrace2) {
                      return Container(
                        color: const Color(0xFF1E293B),
                        child: const Center(
                          child: Icon(Icons.markunread_mailbox_outlined, size: 90, color: Colors.white30),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),

          // Layer 2: Gray / Dark Overlay with ~80% Opacity
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.80),
            ),
          ),

          // Layer 3: Foreground Interactive Content
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Top Bar: App Logo & SKIP Button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Mini Brand Logo Header
                      Row(
                        children: [
                          Image.asset(
                            AppAssets.appLogo,
                            width: 32,
                            height: 32,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => const Icon(
                              Icons.markunread_mailbox,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            "Anchor Box",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),

                      // SKIP Button
                      GestureDetector(
                        onTap: _navigateToLogin,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Text(
                            "SKIP",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Middle PageView Content Area
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (index) {
                        setState(() {
                          _currentPage = index;
                        });
                      },
                      itemCount: _pages.length,
                      itemBuilder: (context, index) {
                        final item = _pages[index];
                        return Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Main Splash Logo Graphic with Hero tag for smooth glide animation
                            Hero(
                              tag: 'app_logo',
                              child: Container(
                                width: 140,
                                height: 110,
                                margin: const EdgeInsets.only(bottom: 32),
                                child: Image.asset(
                                  AppAssets.appLogo,
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Icon(
                                      index == 0
                                          ? Icons.markunread_mailbox_outlined
                                          : (index == 1
                                              ? Icons.security_outlined
                                              : Icons.smart_toy_outlined),
                                      size: 56,
                                      color: Colors.white,
                                    );
                                  },
                                ),
                              ),
                            ),

                            // Title
                            Text(
                              item.title,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Description Body Text
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12.0),
                              child: Text(
                                item.description,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 15,
                                  height: 1.5,
                                  fontWeight: FontWeight.w400,
                                  color: Colors.white.withOpacity(0.85),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),

                  // Bottom Controls: Pagination Dots & Action Button
                  Column(
                    children: [
                      // Dynamic 3-Dot Indicator
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _pages.length,
                          (index) => _buildPaginationDot(index),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Primary Action Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _onNextPressed,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.brandBlue,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Text(
                            currentItem.buttonText,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
