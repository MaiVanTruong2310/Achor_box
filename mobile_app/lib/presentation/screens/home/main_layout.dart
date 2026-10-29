import 'package:flutter/material.dart';

import '../../../core/constants/app_assets.dart';
import '../../../core/devices/device_controller.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../components/components.dart';
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
  int _index = 0;
  final Set<int> _visited = {0};

  late final List<Widget> _tabs = [
    HomeScreen(onOpenTab: _select),
    const DevicesScreen(),
    const AccessScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Start shared data now so every tab opens with it ready.
    globalDeviceController.initialize();
    globalNotificationController.initialize();
    // After a sign-in this user's PIN settings apply from now on, without
    // asking for the PIN right after the password.
    globalAppLockController.refresh();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Decode the wallpaper once; every tab and pushed page reuses it.
    precacheImage(const AssetImage(AppAssets.wallpaperHome), context);
  }

  void _select(int index) {
    setState(() {
      _index = index;
      _visited.add(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.black,
      body: IndexedStack(
        index: _index,
        children: [
          for (var i = 0; i < _tabs.length; i++)
            _visited.contains(i) ? _tabs[i] : const SizedBox.shrink(),
        ],
      ),
      bottomNavigationBar: GlassTabBar(
        selectedIndex: _index,
        onSelected: _select,
        items: [
          GlassTabItem(
            icon: AppIcons.box,
            selectedIcon: AppIcons.boxFill,
            label: context.tr(vi: 'Thiết bị', en: 'Devices'),
          ),
          GlassTabItem(
            icon: AppIcons.pin,
            selectedIcon: AppIcons.pinFill,
            label: context.tr(vi: 'Mã PIN', en: 'PINs'),
          ),
          GlassTabItem(
            icon: AppIcons.sharing,
            selectedIcon: AppIcons.sharingFill,
            label: context.tr(vi: 'Chia sẻ', en: 'Sharing'),
          ),
          GlassTabItem(
            icon: AppIcons.profile,
            selectedIcon: AppIcons.profileFill,
            label: context.tr(vi: 'Cá nhân', en: 'Profile'),
          ),
        ],
      ),
    );
  }
}
