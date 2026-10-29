import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/form_validators.dart';
import '../../../services/notification_service.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';

enum _PhotoAction { camera, gallery, remove }

/// Edits the name, phone and photo stored in `public.profiles` (and Auth
/// metadata as fallback). The sign-in email is read-only here.
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
  String _savedName = '';
  String _savedPhone = '';
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingAvatar = false;
  String? _avatarUrl;

  bool get _isDirty =>
      _nameController.text.trim() != _savedName ||
      _phoneController.text.trim() != _savedPhone;

  @override
  void initState() {
    super.initState();
    // Show what is already known at once; the database copy follows.
    _emailController.text = SupabaseService.currentUser?.email ?? '';
    _nameController.text = SupabaseService.cachedUserName;
    _avatarUrl = SupabaseService.cachedAvatarUrl;
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final profile = await SupabaseService.getCurrentProfile();
    if (!mounted) return;
    setState(() {
      _savedName =
          (profile?['full_name'] as String?)?.trim() ?? _nameController.text;
      _savedPhone = (profile?['phone'] as String?)?.trim() ?? '';
      _nameController.text = _savedName;
      _phoneController.text = _savedPhone;
      _avatarUrl = SupabaseService.cachedAvatarUrl;
      _isLoading = false;
    });
  }

  Future<void> _choosePhoto() async {
    final hasPhoto = _avatarUrl?.isNotEmpty == true;
    final action = await showChoiceSheet<_PhotoAction>(
      context,
      title: context.tr(vi: 'Ảnh đại diện', en: 'Profile photo'),
      options: [
        ChoiceOption(
          value: _PhotoAction.camera,
          label: context.tr(vi: 'Chụp ảnh mới', en: 'Take a photo'),
          icon: AppIcons.camera,
        ),
        ChoiceOption(
          value: _PhotoAction.gallery,
          label: context.tr(vi: 'Chọn từ thư viện', en: 'Choose from library'),
          icon: AppIcons.photo,
          iconColor: context.colors.indigo,
        ),
        if (hasPhoto)
          ChoiceOption(
            value: _PhotoAction.remove,
            label: context.tr(vi: 'Xóa ảnh', en: 'Remove photo'),
            icon: AppIcons.trash,
            destructive: true,
          ),
      ],
    );
    if (!mounted || action == null) return;
    switch (action) {
      case _PhotoAction.camera:
        await _changeAvatar(ImageSource.camera);
      case _PhotoAction.gallery:
        await _changeAvatar(ImageSource.gallery);
      case _PhotoAction.remove:
        await _removeAvatar();
    }
  }

  Future<void> _changeAvatar(ImageSource source) async {
    final picked = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 92,
    );
    if (picked == null || !mounted) return;

    final colors = context.colors;
    final cropped = await ImageCropper().cropImage(
      sourcePath: picked.path,
      compressFormat: ImageCompressFormat.jpg,
      compressQuality: 88,
      aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle:
              context.tr(vi: 'Cắt ảnh đại diện', en: 'Crop profile photo'),
          toolbarColor: colors.brand,
          toolbarWidgetColor: Colors.white,
          activeControlsWidgetColor: colors.accent,
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
    // Only report success when both the upload and the profile row worked.
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
                  vi: 'Không cập nhật được ảnh. Hãy thử lại.',
                  en: 'Could not update the photo. Please try again.')),
      type: updated ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _removeAvatar() async {
    setState(() => _isUploadingAvatar = true);
    final removed = await SupabaseService.removeAvatar();
    if (!mounted) return;
    setState(() {
      if (removed) _avatarUrl = null;
      _isUploadingAvatar = false;
    });
    AppToast.show(
      context,
      message: removed
          ? context.tr(vi: 'Đã xóa ảnh đại diện.', en: 'Profile photo removed.')
          : context.tr(
              vi: 'Không xóa được ảnh. Hãy thử lại.',
              en: 'Could not remove the photo. Please try again.'),
      type: removed ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() => _isSaving = true);
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final success = await SupabaseService.updateCurrentProfile(
      fullName: name,
      phone: phone,
    );
    if (!mounted) return;
    setState(() {
      _isSaving = false;
      if (success) {
        _savedName = name;
        _savedPhone = phone;
      }
    });
    AppToast.show(
      context,
      message: success
          ? context.tr(vi: 'Đã lưu hồ sơ.', en: 'Profile saved.')
          : context.tr(
              vi: 'Không lưu được hồ sơ. Hãy kiểm tra kết nối mạng.',
              en: 'Could not save the profile. Check your connection.'),
      type: success ? ToastType.success : ToastType.error,
    );
    if (!success) return;
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

  @override
  Widget build(BuildContext context) {
    final busy = _isSaving || _isUploadingAvatar;
    return AppPage(
      showBackButton: true,
      title: context.tr(vi: 'Hồ sơ', en: 'Profile'),
      subtitle: context.tr(
        vi: 'Người được chia sẻ hộp sẽ thấy tên và ảnh này',
        en: 'People you share a box with see this name and photo',
      ),
      children: [
        const SizedBox(height: AppSpacing.xl),
        _AvatarEditor(
          name: _nameController.text,
          imageUrl: _avatarUrl,
          uploading: _isUploadingAvatar,
          onTap: busy ? null : _choosePhoto,
        ),
        const SizedBox(height: AppSpacing.xl),
        // Glass inputs with white text, as on the sign-in screens.
        Theme(
          data: AppBackdrop.theme,
          child: Form(
            key: _formKey,
            onChanged: () => setState(() {}),
            child: _ProfileFields(
              nameController: _nameController,
              phoneController: _phoneController,
              emailController: _emailController,
              enabled: !_isLoading && !_isSaving,
              onSubmit: _save,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        AppButton(
          label: context.tr(vi: 'Lưu thay đổi', en: 'Save changes'),
          icon: AppIcons.check,
          isLoading: _isSaving,
          onPressed: _isLoading || busy || !_isDirty ? null : _save,
        ),
      ],
    );
  }
}

class _AvatarEditor extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final bool uploading;
  final VoidCallback? onTap;

  const _AvatarEditor({
    required this.name,
    required this.imageUrl,
    required this.uploading,
    required this.onTap,
  });

  static const double _size = 116;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Semantics(
          button: true,
          label: context.tr(vi: 'Đổi ảnh đại diện', en: 'Change photo'),
          child: GestureDetector(
            onTap: onTap,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.7),
                      width: 2,
                    ),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      UserAvatar(name: name, imageUrl: imageUrl, size: _size),
                      if (uploading)
                        Container(
                          width: _size,
                          height: _size,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.black.withValues(alpha: 0.45),
                          ),
                          child: const Center(
                            child: CircularProgressIndicator.adaptive(),
                          ),
                        ),
                    ],
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 2,
                  child: GlassSurface(
                    capsule: true,
                    style: GlassStyle.light,
                    child: SizedBox.square(
                      dimension: 38,
                      child: Icon(
                        AppIcons.camera,
                        size: 20,
                        color: context.colors.accent,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(foregroundColor: Colors.white),
          child: Text(context.tr(vi: 'Đổi ảnh', en: 'Change photo')),
        ),
      ],
    );
  }
}

class _ProfileFields extends StatelessWidget {
  final TextEditingController nameController;
  final TextEditingController phoneController;
  final TextEditingController emailController;
  final bool enabled;
  final VoidCallback onSubmit;

  const _ProfileFields({
    required this.nameController,
    required this.phoneController,
    required this.emailController,
    required this.enabled,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          controller: nameController,
          label: context.tr(vi: 'Họ và tên', en: 'Full name'),
          prefixIcon: AppIcons.person,
          enabled: enabled,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.name],
          validator: (value) => value == null || value.trim().length < 2
              ? context.tr(
                  vi: 'Hãy nhập họ tên (ít nhất 2 ký tự).',
                  en: 'Enter your name (at least 2 characters).')
              : null,
        ),
        const SizedBox(height: AppSpacing.md),
        AppTextField(
          controller: phoneController,
          label: context.tr(vi: 'Số điện thoại', en: 'Phone number'),
          hint: '0912 345 678',
          prefixIcon: Icons.phone_rounded,
          enabled: enabled,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.telephoneNumber],
          validator: FormValidators.optionalPhone(context),
          onSubmitted: (_) => onSubmit(),
        ),
        const SizedBox(height: AppSpacing.md),
        AppTextField(
          controller: emailController,
          label: context.tr(vi: 'Email đăng nhập', en: 'Sign-in email'),
          prefixIcon: AppIcons.email,
          readOnly: true,
          suffix:
              Icon(AppIcons.lock, size: 18, color: context.colors.textTertiary),
        ),
        const SizedBox(height: AppSpacing.xs),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxs),
          child: Text(
            context.tr(
              vi: 'Email dùng để đăng nhập nên không đổi được ở đây.',
              en: 'Your sign-in email cannot be changed here.',
            ),
            style: context.text.bodySmall,
          ),
        ),
      ],
    );
  }
}
