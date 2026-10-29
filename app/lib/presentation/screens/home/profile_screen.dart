import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/session/session_actions.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import '../auth/login_screen.dart';
import '../security/security_screen.dart';
import 'edit_profile_screen.dart';
import 'notification_settings_screen.dart';

enum _AvatarAction { camera, gallery, remove }

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  static const _appVersion = '1.0.0';

  String _name = '';
  String _email = '';
  String? _avatarUrl;
  bool _uploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _avatarUrl = SupabaseService.cachedAvatarUrl;
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final user = SupabaseService.currentUser;
    if (user == null) return;
    setState(() {
      _email = user.email ?? '';
      _name = user.userMetadata?['full_name']?.toString() ?? '';
    });

    final profile = await SupabaseService.getCurrentProfile();
    if (!mounted || profile == null) return;
    final fullName = profile['full_name']?.toString() ?? '';
    setState(() {
      if (fullName.isNotEmpty) _name = fullName;
      _avatarUrl = SupabaseService.cachedAvatarUrl;
    });
  }

  String get _displayName {
    if (_name.trim().isNotEmpty) return _name.trim();
    final local = _email.split('@').first;
    return local.isEmpty ? 'Anchor Box' : local;
  }

  Future<void> _openEditProfile() async {
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const EditProfileScreen()),
    );
    if (updated == true && mounted) _loadProfile();
  }

  Future<void> _changeAvatar() async {
    if (_uploadingAvatar) return;
    final action = await showChoiceSheet<_AvatarAction>(
      context,
      title: context.tr(vi: 'Ảnh đại diện', en: 'Profile photo'),
      options: [
        ChoiceOption(
          value: _AvatarAction.camera,
          label: context.tr(vi: 'Chụp ảnh', en: 'Take photo'),
          icon: AppIcons.camera,
        ),
        ChoiceOption(
          value: _AvatarAction.gallery,
          label: context.tr(vi: 'Chọn từ thư viện', en: 'Choose from library'),
          icon: AppIcons.photo,
          iconColor: context.colors.locked,
        ),
        if (_avatarUrl != null)
          ChoiceOption(
            value: _AvatarAction.remove,
            label: context.tr(vi: 'Xóa ảnh', en: 'Remove photo'),
            icon: AppIcons.trash,
            destructive: true,
          ),
      ],
    );
    if (action == null || !mounted) return;
    switch (action) {
      case _AvatarAction.camera:
        await _pickAvatar(ImageSource.camera);
      case _AvatarAction.gallery:
        await _pickAvatar(ImageSource.gallery);
      case _AvatarAction.remove:
        await _removeAvatar();
    }
  }

  Future<void> _removeAvatar() async {
    final removed = await SupabaseService.removeAvatar();
    if (!mounted) return;
    if (removed) setState(() => _avatarUrl = null);
    AppToast.show(
      context,
      message: removed
          ? context.tr(vi: 'Đã xóa ảnh đại diện.', en: 'Profile photo removed.')
          : context.tr(
              vi: 'Không thể xóa ảnh. Hãy thử lại.',
              en: 'Could not remove the photo. Please try again.'),
      type: removed ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _pickAvatar(ImageSource source) async {
    final cropTitle =
        context.tr(vi: 'Cắt ảnh đại diện', en: 'Crop profile photo');
    final accent = context.colors.accent;
    try {
      final picked = await ImagePicker().pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );
      if (picked == null || !mounted) return;

      final cropped = await ImageCropper().cropImage(
        sourcePath: picked.path,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: 88,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: cropTitle,
            toolbarColor: Colors.black,
            toolbarWidgetColor: Colors.white,
            activeControlsWidgetColor: accent,
            initAspectRatio: CropAspectRatioPreset.square,
            lockAspectRatio: true,
          ),
          IOSUiSettings(
            title: cropTitle,
            aspectRatioLockEnabled: true,
            resetAspectRatioEnabled: false,
            aspectRatioPickerButtonHidden: true,
          ),
        ],
      );
      if (cropped == null || !mounted) return;

      setState(() => _uploadingAvatar = true);
      final bytes = await cropped.readAsBytes();
      final publicUrl = await SupabaseService.uploadAvatar(bytes, 'jpg');
      final saved = publicUrl != null &&
          await SupabaseService.updateProfileAvatarUrl(publicUrl);
      if (!mounted) return;

      setState(() {
        _uploadingAvatar = false;
        if (saved) _avatarUrl = publicUrl;
      });
      AppToast.show(
        context,
        message: saved
            ? context.tr(
                vi: 'Đã cập nhật ảnh đại diện.', en: 'Profile photo updated.')
            : publicUrl != null
                ? context.tr(
                    vi: 'Ảnh đã tải lên nhưng chưa cập nhật được hồ sơ.',
                    en:
                        'The photo was uploaded but the profile was not updated.')
                : SupabaseService.lastAvatarError ??
                    context.tr(
                        vi: 'Không thể tải ảnh lên. Hãy thử lại.',
                        en: 'Could not upload the photo. Please try again.'),
        type: saved ? ToastType.success : ToastType.error,
      );
    } catch (error) {
      debugPrint('Avatar update failed: $error');
      if (!mounted) return;
      setState(() => _uploadingAvatar = false);
      AppToast.show(
        context,
        message: context.tr(
          vi: 'Không thể đổi ảnh đại diện. Hãy thử lại.',
          en: 'Could not change the profile photo. Please try again.',
        ),
        type: ToastType.error,
      );
    }
  }

  Future<void> _chooseLanguage() async {
    final code = await showChoiceSheet<String>(
      context,
      title: context.tr(vi: 'Ngôn ngữ', en: 'Language'),
      selected: globalLanguageController.locale.languageCode,
      options: const [
        ChoiceOption(value: 'vi', label: 'Tiếng Việt'),
        ChoiceOption(value: 'en', label: 'English'),
      ],
    );
    if (code != null) await globalLanguageController.setLanguage(code);
  }

  Future<void> _chooseTheme() async {
    final mode = await showChoiceSheet<ThemeMode>(
      context,
      title: context.tr(vi: 'Giao diện', en: 'Appearance'),
      selected: globalThemeController.themeMode,
      options: [
        for (final mode in ThemeMode.values)
          ChoiceOption(value: mode, label: _themeLabel(mode)),
      ],
    );
    if (mode != null) await globalThemeController.setThemeMode(mode);
  }

  String _themeLabel(ThemeMode mode) => switch (mode) {
        ThemeMode.system => context.tr(vi: 'Theo hệ thống', en: 'Automatic'),
        ThemeMode.light => context.tr(vi: 'Sáng', en: 'Light'),
        ThemeMode.dark => context.tr(vi: 'Tối', en: 'Dark'),
      };

  Future<void> _signOut() async {
    final confirmed = await showConfirmDialog(
      context,
      title: context.tr(vi: 'Đăng xuất?', en: 'Sign out?'),
      message: context.tr(
        vi: 'Bạn sẽ cần đăng nhập lại để điều khiển hộp.',
        en: 'You will need to sign in again to control your box.',
      ),
      confirmLabel: context.tr(vi: 'Đăng xuất', en: 'Sign out'),
      destructive: true,
    );
    if (!confirmed || !mounted) return;

    await signOutAndClearSession();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  void _push(Widget screen) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([
        globalThemeController,
        globalLanguageController,
      ]),
      builder: (context, _) {
        final colors = context.colors;
        return AppPage(
          title: context.tr(vi: 'Cá nhân', en: 'Profile'),
          onRefresh: _loadProfile,
          children: [
            const SizedBox(height: AppSpacing.md),
            _ProfileHeader(
              name: _displayName,
              email: _email,
              avatarUrl: _avatarUrl,
              uploading: _uploadingAvatar,
              onAvatarTap: _changeAvatar,
              onTap: _openEditProfile,
            ),
            GroupedSection(
              header: context.tr(vi: 'Cài đặt', en: 'Settings'),
              children: [
                GroupedTile(
                  leading: IconBadge(
                    icon: AppIcons.language,
                    color: colors.accent,
                    size: 30,
                  ),
                  title: context.tr(vi: 'Ngôn ngữ', en: 'Language'),
                  value: globalLanguageController.isEnglish
                      ? 'English'
                      : 'Tiếng Việt',
                  onTap: _chooseLanguage,
                ),
                GroupedTile(
                  leading: IconBadge(
                    icon: AppIcons.appearance,
                    color: colors.indigo,
                    size: 30,
                  ),
                  title: context.tr(vi: 'Giao diện', en: 'Appearance'),
                  value: _themeLabel(globalThemeController.themeMode),
                  onTap: _chooseTheme,
                ),
                GroupedTile(
                  leading: IconBadge(
                    icon: AppIcons.notificationsRinging,
                    color: colors.alert,
                    size: 30,
                  ),
                  title: context.tr(vi: 'Thông báo', en: 'Notifications'),
                  onTap: () => _push(const NotificationSettingsScreen()),
                ),
                GroupedTile(
                  leading: IconBadge(
                    icon: AppIcons.securityCheck,
                    color: colors.locked,
                    size: 30,
                  ),
                  title: context.tr(vi: 'Bảo mật', en: 'Security'),
                  onTap: () => _push(const SecurityScreen()),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            GroupedSection(
              children: [
                GroupedTile(
                  leading: IconBadge(
                    icon: AppIcons.signOut,
                    color: colors.alert,
                    filled: false,
                    size: 30,
                  ),
                  title: context.tr(vi: 'Đăng xuất', en: 'Sign out'),
                  destructive: true,
                  showChevron: false,
                  onTap: _signOut,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            Center(
              child: Text(
                'Anchor Box · ${context.tr(vi: 'phiên bản', en: 'version')} '
                '$_appVersion',
                style: context.text.bodySmall?.copyWith(
                  color: colors.textPrimary.withValues(alpha: 0.6),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String email;
  final String? avatarUrl;
  final bool uploading;
  final VoidCallback onAvatarTap;
  final VoidCallback onTap;

  const _ProfileHeader({
    required this.name,
    required this.email,
    required this.avatarUrl,
    required this.uploading,
    required this.onAvatarTap,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Builder(builder: (context) {
        final colors = context.colors;
        return Row(
          children: [
            Semantics(
              button: true,
              label: context.tr(
                vi: 'Đổi ảnh đại diện',
                en: 'Change profile photo',
              ),
              child: GestureDetector(
                onTap: onAvatarTap,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    UserAvatar(name: name, imageUrl: avatarUrl, size: 64),
                    if (uploading)
                      const Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.black38,
                          ),
                          child: Center(
                            child: SizedBox.square(
                              dimension: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: colors.accent,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(
                          AppIcons.camera,
                          size: 12,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.titleLarge,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.bodySmall,
                  ),
                  const SizedBox(height: AppSpacing.xxs),
                  Text(
                    context.tr(vi: 'Sửa hồ sơ', en: 'Edit profile'),
                    style:
                        context.text.labelLarge?.copyWith(color: colors.accent),
                  ),
                ],
              ),
            ),
            Icon(AppIcons.chevronRight, size: 16, color: colors.textTertiary),
          ],
        );
      }),
    );
  }
}
