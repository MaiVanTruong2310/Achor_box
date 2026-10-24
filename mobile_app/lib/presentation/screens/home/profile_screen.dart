import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/ios26_back_button.dart';
import '../../widgets/neon_bubble_background.dart';
import '../auth/login_screen.dart';
import 'edit_profile_screen.dart';
import 'notification_settings_screen.dart';
import '../security/security_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _userName = "Mai Trường";
  String _userEmail = "maitruong@example.com";
  String _selectedTheme = "System";
  String? _avatarUrl;
  bool _isUploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _avatarUrl = SupabaseService.cachedAvatarUrl;
    _loadProfileData();
    _syncThemeState();
  }

  void _syncThemeState() {
    switch (globalThemeController.themeMode) {
      case ThemeMode.dark:
        _selectedTheme = "Dark";
        break;
      case ThemeMode.light:
        _selectedTheme = "Light";
        break;
      case ThemeMode.system:
        _selectedTheme = "System";
        break;
    }
  }

  Future<void> _loadProfileData() async {
    final user = SupabaseService.currentUser;
    if (user != null) {
      setState(() {
        _userEmail = user.email ?? "maitruong@example.com";
      });

      final profile = await SupabaseService.getCurrentProfile();
      if (mounted && profile != null) {
        setState(() {
          if (profile['full_name'] != null &&
              (profile['full_name'] as String).isNotEmpty) {
            _userName = profile['full_name'];
          }
          _avatarUrl = SupabaseService.cachedAvatarUrl;
        });
      } else if (mounted && user.userMetadata?['full_name'] != null) {
        setState(() {
          _userName = user.userMetadata!['full_name'];
        });
      }
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          child: LiquidGlassContainer(
            borderRadius: 24,
            blur: 28,
            tintOpacity: 0.28,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    "Thay đổi ảnh đại diện",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark
                          ? const Color(0xFFF8FAFC)
                          : AppColors.textPrimary,
                    ),
                  ),
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.brandBlue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.camera_alt_outlined,
                        color: AppColors.brandBlue, size: 22),
                  ),
                  title: Text(
                    "Chụp ảnh mới",
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? const Color(0xFFF1F5F9)
                          : AppColors.textPrimary,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    _handlePickImage(ImageSource.camera);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.photo_library_outlined,
                        color: Color(0xFF10B981), size: 22),
                  ),
                  title: Text(
                    "Chọn từ thư viện",
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? const Color(0xFFF1F5F9)
                          : AppColors.textPrimary,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    _handlePickImage(ImageSource.gallery);
                  },
                ),
                if (_avatarUrl != null)
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.delete_outline,
                          color: Colors.redAccent, size: 22),
                    ),
                    title: const Text(
                      "Xóa ảnh đại diện",
                      style: TextStyle(
                          fontWeight: FontWeight.w600, color: Colors.redAccent),
                    ),
                    onTap: () async {
                      Navigator.pop(context);
                      final success = await SupabaseService.removeAvatar();
                      if (mounted && success) {
                        setState(() => _avatarUrl = null);
                        AppToast.show(context,
                            message: "Đã xóa ảnh đại diện.",
                            type: ToastType.info);
                      }
                    },
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _handlePickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (pickedFile == null) return;

      if (!mounted) return;
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: pickedFile.path,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: 88,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle:
                context.tr(vi: 'Cắt ảnh đại diện', en: 'Crop profile photo'),
            toolbarColor: const Color(0xFF071422),
            toolbarWidgetColor: Colors.white,
            activeControlsWidgetColor: AppColors.brandBlue,
            initAspectRatio: CropAspectRatioPreset.square,
            lockAspectRatio: true,
            hideBottomControls: false,
          ),
          IOSUiSettings(
            title: context.tr(vi: 'Cắt ảnh đại diện', en: 'Crop profile photo'),
            aspectRatioLockEnabled: true,
            resetAspectRatioEnabled: false,
            aspectRatioPickerButtonHidden: true,
            rotateButtonsHidden: false,
          ),
        ],
      );

      if (croppedFile == null) return;

      setState(() => _isUploadingAvatar = true);

      final bytes = await croppedFile.readAsBytes();

      final publicUrl = await SupabaseService.uploadAvatar(bytes, 'jpg');

      if (publicUrl != null) {
        final updated = await SupabaseService.updateProfileAvatarUrl(publicUrl);
        if (mounted && updated) {
          setState(() {
            _avatarUrl = publicUrl;
            _isUploadingAvatar = false;
          });
          AppToast.show(context,
              message: "Đã cập nhật ảnh đại diện thành công!",
              type: ToastType.success);
        } else if (mounted) {
          setState(() => _isUploadingAvatar = false);
          AppToast.show(
            context,
            message: context.tr(
              vi: "Ảnh đã tải lên nhưng chưa thể cập nhật hồ sơ.",
              en: "The image was uploaded, but the profile could not be updated.",
            ),
            type: ToastType.error,
          );
        }
      } else {
        if (mounted) {
          setState(() => _isUploadingAvatar = false);
          AppToast.show(
            context,
            message: SupabaseService.lastAvatarError ??
                context.tr(
                  vi: "Không thể tải ảnh lên. Vui lòng thử lại.",
                  en: "Unable to upload the image. Please try again.",
                ),
            type: ToastType.error,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
        AppToast.show(context, message: "Lỗi: $e", type: ToastType.error);
      }
    }
  }

  Future<void> _handleSignOut() async {
    globalNotificationController.reset();
    await SupabaseService.signOut();
    if (mounted) {
      AppToast.show(
        context,
        message: "Đã đăng xuất thành công.",
        type: ToastType.info,
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  void _navigateToSubScreen(String title, {Widget? customContent}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ProfileSubDetailScreen(
          title: title,
          child: customContent,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      animate: true,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: SingleChildScrollView(
            padding:
                const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title Header
                Text(
                  context.tr(vi: "Hồ sơ & Cài đặt", en: "Profile & Settings"),
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: isDark
                        ? const Color(0xFFF8FAFC)
                        : AppColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 16),

                // 1. User Info Header Card (iOS 26 Liquid Glass Container)
                LiquidGlassContainer(
                  borderRadius: 26.0,
                  blur: 22.0,
                  tintOpacity: 0.12,
                  borderWidth: 0.8,
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      // Avatar with tap-to-change
                      GestureDetector(
                        onTap: _pickAndUploadAvatar,
                        child: Stack(
                          children: [
                            Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.brandBlue.withOpacity(0.12),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.9),
                                  width: 2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.brandBlue.withOpacity(0.2),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                                image:
                                    _avatarUrl != null && _avatarUrl!.isNotEmpty
                                        ? DecorationImage(
                                            image: NetworkImage(_avatarUrl!),
                                            fit: BoxFit.cover,
                                          )
                                        : null,
                              ),
                              child: _isUploadingAvatar
                                  ? const Center(
                                      child: SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          color: AppColors.brandBlue,
                                        ),
                                      ),
                                    )
                                  : (_avatarUrl == null || _avatarUrl!.isEmpty)
                                      ? Center(
                                          child: Text(
                                            _userName.isNotEmpty
                                                ? _userName[0].toUpperCase()
                                                : "M",
                                            style: const TextStyle(
                                              fontSize: 24,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.brandBlue,
                                            ),
                                          ),
                                        )
                                      : null,
                            ),
                            Positioned(
                              right: 0,
                              bottom: 0,
                              child: Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.brandBlue,
                                  border:
                                      Border.all(color: Colors.white, width: 2),
                                ),
                                child: const Icon(
                                  Icons.camera_alt,
                                  size: 11,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),

                      // User Text Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _userName,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: isDark
                                    ? const Color(0xFFF1F5F9)
                                    : AppColors.textPrimary,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              _userEmail,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                color: isDark
                                    ? const Color(0xFFA7B5C8)
                                    : AppColors.textSecondary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),

                      // Edit Action Icon
                      IconButton(
                        icon: Icon(
                          Icons.edit_outlined,
                          color: isDark
                              ? const Color(0xFFA7B5C8)
                              : AppColors.textSecondary,
                          size: 20,
                        ),
                        onPressed: () async {
                          final changed =
                              await Navigator.of(context).push<bool>(
                            MaterialPageRoute(
                              builder: (context) => const EditProfileScreen(),
                            ),
                          );
                          if (changed == true && mounted) {
                            await _loadProfileData();
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 2. Settings Group Card (iOS 26 Liquid Glass Container)
                LiquidGlassContainer(
                  borderRadius: 26.0,
                  blur: 22.0,
                  tintOpacity: 0.12,
                  borderWidth: 0.8,
                  child: Column(
                    children: [
                      // Item 1: Language
                      _buildSettingTile(
                        icon: Icons.language,
                        title: context.tr(vi: "Ngôn ngữ", en: "Language"),
                        value: globalLanguageController.isEnglish
                            ? "English"
                            : "Tiếng Việt",
                        onTap: () {
                          _navigateToSubScreen(
                            context.tr(vi: "Ngôn ngữ", en: "Language"),
                            customContent: _buildLanguageSelector(),
                          );
                        },
                      ),
                      Divider(
                          height: 1,
                          indent: 60,
                          endIndent: 20,
                          color: Colors.grey.withOpacity(0.15)),

                      // Item 2: Theme
                      _buildSettingTile(
                        icon: Icons.dark_mode_outlined,
                        title: context.tr(vi: "Giao diện", en: "Theme"),
                        value: context.tr(
                          vi: _selectedTheme == "Dark"
                              ? "Tối"
                              : (_selectedTheme == "Light"
                                  ? "Sáng"
                                  : "Hệ thống"),
                          en: _selectedTheme,
                        ),
                        onTap: () {
                          _navigateToSubScreen(
                            context.tr(vi: "Giao diện", en: "Theme"),
                            customContent: _buildThemeSelector(),
                          );
                        },
                      ),
                      Divider(
                          height: 1,
                          indent: 60,
                          endIndent: 20,
                          color: Colors.grey.withOpacity(0.15)),

                      // Item 3: Notifications
                      _buildSettingTile(
                        icon: Icons.notifications_none_outlined,
                        title: context.tr(vi: "Thông báo", en: "Notifications"),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) =>
                                  const NotificationSettingsScreen()),
                        ),
                      ),
                      Divider(
                          height: 1,
                          indent: 60,
                          endIndent: 20,
                          color: Colors.grey.withOpacity(0.15)),

                      // Item 4: Security & 2FA
                      _buildSettingTile(
                        icon: Icons.shield_outlined,
                        title: context.tr(
                            vi: "Bảo mật & 2FA", en: "Security & 2FA"),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) => const SecurityScreen()),
                        ),
                      ),
                      Divider(
                          height: 1,
                          indent: 60,
                          endIndent: 20,
                          color: Colors.grey.withOpacity(0.15)),

                      // Item 5: Help & FAQ
                      _buildSettingTile(
                        icon: Icons.help_outline_rounded,
                        title: context.tr(
                            vi: "Trợ giúp & Hỏi đáp", en: "Help & FAQ"),
                        onTap: () {
                          _navigateToSubScreen(context.tr(
                              vi: "Trợ giúp & Hỏi đáp", en: "Help & FAQ"));
                        },
                      ),
                      Divider(
                          height: 1,
                          indent: 60,
                          endIndent: 20,
                          color: Colors.grey.withOpacity(0.15)),

                      // Item 6: Contact support
                      _buildSettingTile(
                        icon: Icons.headset_mic_outlined,
                        title: context.tr(
                            vi: "Liên hệ hỗ trợ", en: "Contact support"),
                        onTap: () {
                          _navigateToSubScreen(context.tr(
                              vi: "Liên hệ hỗ trợ", en: "Contact support"));
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 3. Sign Out Button (iOS 26 Liquid Glass Action Button)
                LiquidGlassContainer(
                  borderRadius: 26.0,
                  blur: 20.0,
                  tintOpacity: 0.08,
                  borderColor: Colors.redAccent.withOpacity(0.4),
                  borderWidth: 1.0,
                  onTap: _handleSignOut,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 15.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.logout,
                            color: Colors.redAccent, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          context.tr(vi: "Đăng xuất", en: "Sign out"),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.redAccent,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    String? value,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.brandBlue.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 20, color: AppColors.brandBlue),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: isDark ? const Color(0xFFF1F5F9) : AppColors.textPrimary,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value != null) ...[
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                color:
                    isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Icon(
            Icons.chevron_right,
            size: 18,
            color: isDark ? const Color(0xFF7F91A8) : AppColors.textMuted,
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageSelector() {
    return StatefulBuilder(
      builder: (context, setSubState) {
        return Column(
          children: [
            RadioListTile<String>(
              title: const Text("Tiếng Việt"),
              value: "vi",
              groupValue: globalLanguageController.locale.languageCode,
              activeColor: AppColors.brandBlue,
              onChanged: (val) async {
                if (val != null) {
                  await globalLanguageController.setLanguage(val);
                  setSubState(() {});
                }
              },
            ),
            RadioListTile<String>(
              title: const Text("English"),
              value: "en",
              groupValue: globalLanguageController.locale.languageCode,
              activeColor: AppColors.brandBlue,
              onChanged: (val) async {
                if (val != null) {
                  await globalLanguageController.setLanguage(val);
                  setSubState(() {});
                }
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildThemeSelector() {
    return StatefulBuilder(
      builder: (context, setSubState) {
        return Column(
          children: [
            RadioListTile<String>(
              title: Text(context.tr(vi: "Theo hệ thống", en: "System")),
              value: "System",
              groupValue: _selectedTheme,
              activeColor: AppColors.brandBlue,
              onChanged: (val) async {
                if (val != null) {
                  setState(() => _selectedTheme = val);
                  setSubState(() {});
                  await globalThemeController.setThemeMode(ThemeMode.system);
                }
              },
            ),
            RadioListTile<String>(
              title: Text(context.tr(vi: "Giao diện sáng", en: "Light Mode")),
              value: "Light",
              groupValue: _selectedTheme,
              activeColor: AppColors.brandBlue,
              onChanged: (val) async {
                if (val != null) {
                  setState(() => _selectedTheme = val);
                  setSubState(() {});
                  await globalThemeController.setThemeMode(ThemeMode.light);
                }
              },
            ),
            RadioListTile<String>(
              title: Text(context.tr(vi: "Giao diện tối", en: "Dark Mode")),
              value: "Dark",
              groupValue: _selectedTheme,
              activeColor: AppColors.brandBlue,
              onChanged: (val) async {
                if (val != null) {
                  setState(() => _selectedTheme = val);
                  setSubState(() {});
                  await globalThemeController.setThemeMode(ThemeMode.dark);
                }
              },
            ),
          ],
        );
      },
    );
  }
}

/// Standalone Sub-Page Widget without Bottom Navigation Bar
class ProfileSubDetailScreen extends StatelessWidget {
  final String title;
  final Widget? child;

  const ProfileSubDetailScreen({
    super.key,
    required this.title,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 17,
            ),
          ),
          centerTitle: true,
          backgroundColor: Colors.transparent,
          elevation: 0,
          leadingWidth: 112,
          leading: const Padding(
            padding: EdgeInsets.only(left: 12),
            child: Center(child: Ios26BackButton()),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: child ??
                LiquidGlassContainer(
                  borderRadius: 26.0,
                  blur: 22.0,
                  tintOpacity: 0.12,
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.construction,
                          size: 56,
                          color: AppColors.brandBlue.withOpacity(0.6)),
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
                        context.tr(
                            vi: "Trang này đang được kết nối dữ liệu Supabase",
                            en: "This page is being connected to Supabase"),
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark
                              ? const Color(0xFFA7B5C8)
                              : AppColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
          ),
        ),
      ),
    );
  }
}
