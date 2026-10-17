import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/liquid_glass_segmented_control.dart';
import '../../widgets/neon_bubble_background.dart';
import 'access_screen.dart';
import 'devices_screen.dart';
import 'home_screen.dart';
import '../auth/login_screen.dart';
import 'profile_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;
  double _page = 0;
  late final PageController _pageController;
  final GlobalKey<HomeScreenState> _homeKey = GlobalKey<HomeScreenState>();

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    globalNotificationController.initialize();
    _screens = [
      HomeScreen(key: _homeKey),
      const DevicesScreen(key: ValueKey('DevicesScreen')),
      const AccessScreen(key: ValueKey('AccessScreen')),
      const ProfileScreen(key: ValueKey('ProfileScreen')),
    ];
    _pageController = PageController();
    _pageController.addListener(_syncPagePosition);
  }

  void _syncPagePosition() {
    if (!_pageController.hasClients) return;
    final nextPage = _pageController.page ?? _currentIndex.toDouble();
    if (mounted && nextPage != _page) {
      setState(() => _page = nextPage);
    }
  }

  void _selectPage(int index) {
    setState(() => _currentIndex = index);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    _pageController
      ..removeListener(_syncPagePosition)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // PageView content
          PageView(
            controller: _pageController,
            onPageChanged: (index) {
              if (_currentIndex != index) {
                setState(() => _currentIndex = index);
              }
            },
            children: _screens,
          ),

          // Floating iOS 26 Liquid Glass Segmented Navigation Bar
          Positioned(
            left: 18,
            right: 18,
            bottom: 24,
            child: LiquidGlassSegmentedControl(
              height: 64,
              borderRadius: 32,
              selectorBorderRadius: 25,
              selectedIndex: _currentIndex,
              position: _page,
              OnItemSelected: _selectPage,
              items: [
                LiquidGlassSegmentItem(
                  label: context.tr(vi: "Trang chủ", en: "Home"),
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home_rounded,
                ),
                LiquidGlassSegmentItem(
                  label: context.tr(vi: "Thiết bị", en: "Devices"),
                  icon: Icons.devices_outlined,
                  activeIcon: Icons.devices_rounded,
                ),
                LiquidGlassSegmentItem(
                  label: context.tr(vi: "Truy cập", en: "Access"),
                  icon: Icons.vpn_key_outlined,
                  activeIcon: Icons.vpn_key_rounded,
                ),
                LiquidGlassSegmentItem(
                  label: context.tr(vi: "Cá nhân", en: "Profile"),
                  icon: Icons.person_outline_rounded,
                  activeIcon: Icons.person_rounded,
                ),
              ],
            ),
          ),

          Positioned(
            right: 22,
            bottom: 104,
            child: FloatingActionButton(
              heroTag: 'main_add_device',
              onPressed: () => _homeKey.currentState?.showAddDeviceModal(),
              backgroundColor: AppColors.brandBlue,
              elevation: 7,
              shape: const CircleBorder(),
              child: const Icon(
                Icons.add_rounded,
                color: Colors.white,
                size: 30,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlaceholderTab extends StatelessWidget {
  final String title;
  final IconData icon;

  const _PlaceholderTab({
    super.key,
    required this.title,
    required this.icon,
  });

  Future<void> _handleLogout(BuildContext context) async {
    globalNotificationController.reset();
    await SupabaseService.signOut();

    if (!context.mounted) return;

    AppToast.show(
      context,
      message: "Đã đăng xuất khỏi tài khoản.",
      type: ToastType.info,
    );

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAccountTab = title == "Tài Khoản";
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(
            title,
            style: TextStyle(
              color: isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
          backgroundColor: Colors.transparent,
          elevation: 0,
          iconTheme: IconThemeData(
            color: isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary,
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: LiquidGlassContainer(
              borderRadius: 24,
              blur: 24,
              tintOpacity: 0.22,
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    icon,
                    size: 54,
                    color:
                        isDark ? const Color(0xFF38BDF8) : AppColors.brandBlue,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark
                          ? const Color(0xFFF1F5F9)
                          : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isAccountTab
                        ? "Tài khoản của bạn: ${SupabaseService.currentUser?.email ?? 'Khách'}"
                        : "Tính năng đang được tích hợp dữ liệu Supabase",
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark
                          ? const Color(0xFFA7B5C8)
                          : AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (isAccountTab) ...[
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: () => _handleLogout(context),
                        icon: const Icon(Icons.logout,
                            size: 18, color: Colors.white),
                        label: const Text(
                          "ĐĂNG XUẤT",
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
