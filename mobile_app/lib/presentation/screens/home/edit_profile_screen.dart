import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../services/supabase_service.dart';
import '../../../services/notification_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/ios26_back_button.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingAvatar = false;
  String? _avatarUrl;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final user = SupabaseService.currentUser;
    final profile = await SupabaseService.getCurrentProfile();
    if (!mounted) return;
    _nameController.text =
        (profile?['full_name'] as String?) ?? SupabaseService.cachedUserName;
    _phoneController.text = (profile?['phone'] as String?) ?? '';
    _emailController.text = user?.email ?? '';
    setState(() {
      _avatarUrl = SupabaseService.cachedAvatarUrl;
      _isLoading = false;
    });
  }

  Future<void> _changeAvatar(ImageSource source) async {
    final picked = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 92,
    );
    if (picked == null || !mounted) return;

    final cropped = await ImageCropper().cropImage(
      sourcePath: picked.path,
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
        ),
        IOSUiSettings(
          title: context.tr(vi: 'Cắt ảnh đại diện', en: 'Crop profile photo'),
          aspectRatioLockEnabled: true,
          resetAspectRatioEnabled: false,
          aspectRatioPickerButtonHidden: true,
        ),
      ],
    );
    if (cropped == null || !mounted) return;

    setState(() => _isUploadingAvatar = true);
    final url = await SupabaseService.uploadAvatar(
      await cropped.readAsBytes(),
      'jpg',
    );
    final updated =
        url != null && await SupabaseService.updateProfileAvatarUrl(url);
    if (!mounted) return;
    setState(() {
      if (updated) _avatarUrl = url;
      _isUploadingAvatar = false;
    });
    AppToast.show(
      context,
      message: updated
          ? context.tr(
              vi: 'Đã cập nhật ảnh đại diện.', en: 'Profile photo updated.')
          : (SupabaseService.lastAvatarError ??
              context.tr(
                  vi: 'Không thể cập nhật ảnh.',
                  en: 'Unable to update the photo.')),
      type: updated ? ToastType.success : ToastType.error,
    );
  }

  void _showAvatarSource() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: LiquidGlassContainer(
          borderRadius: 26,
          blur: 26,
          tintOpacity: 0.24,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined,
                    color: AppColors.brandBlue),
                title: Text(
                    context.tr(vi: 'Chụp ảnh mới', en: 'Take a new photo')),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _changeAvatar(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined,
                    color: AppColors.brandBlue),
                title: Text(context.tr(
                    vi: 'Chọn từ thư viện', en: 'Choose from library')),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _changeAvatar(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() => _isSaving = true);
    final success = await SupabaseService.updateCurrentProfile(
      fullName: _nameController.text,
      phone: _phoneController.text,
    );
    if (!mounted) return;
    setState(() => _isSaving = false);
    AppToast.show(
      context,
      message: success
          ? context.tr(vi: 'Đã lưu hồ sơ.', en: 'Profile saved.')
          : context.tr(
              vi: 'Không thể lưu hồ sơ.', en: 'Unable to save profile.'),
      type: success ? ToastType.success : ToastType.error,
    );
    if (success) {
      await NotificationService.create(
        type: 'profile_updated',
        title: 'Profile updated',
        body: context.tr(
          vi: 'Thông tin hồ sơ của bạn đã được cập nhật.',
          en: 'Your profile information was updated.',
        ),
      );
      if (mounted) Navigator.pop(context, true);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final secondary =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Ios26BackButton(),
                            Expanded(
                              child: Text(
                                context.tr(
                                    vi: 'Chỉnh sửa hồ sơ', en: 'Edit profile'),
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: primary),
                              ),
                            ),
                            const SizedBox(width: 88),
                          ],
                        ),
                        const SizedBox(height: 26),
                        Center(
                          child: GestureDetector(
                            onTap:
                                _isUploadingAvatar ? null : _showAvatarSource,
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 108,
                                  height: 108,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.brandBlue
                                        .withValues(alpha: 0.15),
                                    border: Border.all(
                                        color:
                                            Colors.white.withValues(alpha: 0.8),
                                        width: 2),
                                    image: _avatarUrl?.isNotEmpty == true
                                        ? DecorationImage(
                                            image: NetworkImage(_avatarUrl!),
                                            fit: BoxFit.cover)
                                        : null,
                                  ),
                                  child: _isUploadingAvatar
                                      ? const Center(
                                          child: CircularProgressIndicator(
                                              color: Colors.white))
                                      : (_avatarUrl?.isNotEmpty == true
                                          ? null
                                          : Icon(Icons.person_rounded,
                                              size: 48, color: secondary)),
                                ),
                                Positioned(
                                  right: -2,
                                  bottom: 3,
                                  child: Container(
                                    width: 34,
                                    height: 34,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AppColors.brandBlue,
                                      border: Border.all(
                                          color: Colors.white, width: 2),
                                    ),
                                    child: const Icon(Icons.camera_alt_rounded,
                                        color: Colors.white, size: 17),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Center(
                          child: TextButton(
                            onPressed:
                                _isUploadingAvatar ? null : _showAvatarSource,
                            child: Text(context.tr(
                                vi: 'Thay đổi ảnh', en: 'Change photo')),
                          ),
                        ),
                        const SizedBox(height: 16),
                        LiquidGlassContainer(
                          borderRadius: 26,
                          blur: 22,
                          tintOpacity: 0.13,
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _FieldLabel(
                                  text: context.tr(
                                      vi: 'Họ và tên', en: 'Full name'),
                                  color: primary),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _nameController,
                                textInputAction: TextInputAction.next,
                                validator: (value) =>
                                    value == null || value.trim().length < 2
                                        ? context.tr(
                                            vi: 'Vui lòng nhập họ tên hợp lệ',
                                            en: 'Enter a valid name')
                                        : null,
                                decoration: _decoration(
                                    Icons.person_outline_rounded, isDark),
                              ),
                              const SizedBox(height: 18),
                              _FieldLabel(
                                  text: context.tr(vi: 'Email', en: 'Email'),
                                  color: primary),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _emailController,
                                readOnly: true,
                                decoration: _decoration(
                                        Icons.mail_outline_rounded, isDark)
                                    .copyWith(
                                  suffixIcon: Icon(Icons.lock_outline_rounded,
                                      size: 18, color: secondary),
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                context.tr(
                                  vi: 'Email đăng nhập không thể thay đổi tại đây.',
                                  en: 'The sign-in email cannot be changed here.',
                                ),
                                style:
                                    TextStyle(fontSize: 11, color: secondary),
                              ),
                              const SizedBox(height: 18),
                              _FieldLabel(
                                  text: context.tr(
                                      vi: 'Số điện thoại', en: 'Phone number'),
                                  color: primary),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _phoneController,
                                keyboardType: TextInputType.phone,
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) => _save(),
                                decoration:
                                    _decoration(Icons.phone_outlined, isDark)
                                        .copyWith(
                                  hintText: context.tr(
                                      vi: 'Nhập số điện thoại',
                                      en: 'Enter phone number'),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton.icon(
                            onPressed:
                                _isSaving || _isUploadingAvatar ? null : _save,
                            icon: _isSaving
                                ? const SizedBox(
                                    width: 19,
                                    height: 19,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.check_rounded,
                                    color: Colors.white),
                            label: Text(
                              context.tr(
                                  vi: 'LƯU THAY ĐỔI', en: 'SAVE CHANGES'),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.brandBlue,
                              disabledBackgroundColor:
                                  AppColors.brandBlue.withValues(alpha: 0.55),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(18)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  InputDecoration _decoration(IconData icon, bool isDark) {
    return InputDecoration(
      prefixIcon: Icon(icon, color: AppColors.brandBlue, size: 21),
      filled: true,
      fillColor: isDark
          ? const Color(0xFF0F1C2D).withValues(alpha: 0.68)
          : Colors.white.withValues(alpha: 0.54),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(
            color: Colors.white.withValues(alpha: isDark ? 0.12 : 0.65)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.brandBlue, width: 1.3),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  final Color color;

  const _FieldLabel({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style:
            TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color));
  }
}
