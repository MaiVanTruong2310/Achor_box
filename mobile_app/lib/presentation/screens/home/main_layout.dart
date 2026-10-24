import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../widgets/liquid_glass_segmented_control.dart';
import 'access_screen.dart';
import 'devices_screen.dart';
import 'home_screen.dart';
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
