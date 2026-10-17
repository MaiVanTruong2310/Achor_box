import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../services/app_lock_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/ios26_back_button.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    await globalAppLockController.refresh();
    if (mounted) setState(() {});
  }

  String _biometricName(BuildContext context) {
    if (Platform.isIOS) return 'Face ID';
    return context.tr(vi: 'Vân tay', en: 'Fingerprint');
  }

  Future<String?> _pinDialog({required bool confirm}) async {
    return showDialog<String>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.48),
      builder: (_) => _PinSecurityDialog(confirm: confirm),
    );
  }

  Future<void> _togglePin(bool enabled) async {
    if (enabled) {
      final pin = await _pinDialog(confirm: true);
      if (pin == null) return;
      await AppLockService.setPin(pin);
    } else {
      final pin = await _pinDialog(confirm: false);
      if (pin == null || !await AppLockService.verifyPin(pin)) {
        if (mounted)
          AppToast.show(context,
              message:
                  context.tr(vi: 'Mã PIN không đúng.', en: 'Incorrect PIN.'),
              type: ToastType.error);
        return;
      }
      await AppLockService.disablePin();
    }
    await _refresh();
  }

  Future<void> _toggleBiometric(bool enabled) async {
    if (!globalAppLockController.isPinEnabled) {
      AppToast.show(context,
          message: context.tr(
              vi: 'Hãy thiết lập PIN 6 số trước.',
              en: 'Set a 6-digit PIN first.'),
          type: ToastType.info);
      return;
    }
    if (enabled) {
      if (!globalAppLockController.canUseBiometrics) {
        AppToast.show(context,
            message: context.tr(
                vi: 'Thiết bị chưa cài đặt sinh trắc học.',
                en: 'Biometrics are not set up on this device.'),
            type: ToastType.error);
        return;
      }
      final accepted = await AppLockService.authenticateBiometric(context.tr(
          vi: 'Xác thực để bật mở khóa sinh trắc học',
          en: 'Authenticate to enable biometric unlock'));
      if (!accepted) return;
    }
    await AppLockService.setBiometricEnabled(enabled);
    await _refresh();
  }

  Future<void> _changePassword() async {
    final values = await showDialog<_PasswordChangeValues>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.48),
      builder: (_) => const _PasswordSecurityDialog(),
    );
    if (values == null) return;
    final success = await SupabaseService.changeAuthenticatedPassword(
        currentPassword: values.currentPassword,
        newPassword: values.newPassword);
    if (!mounted) return;
    AppToast.show(context,
        message: success
            ? context.tr(
                vi: 'Đổi mật khẩu thành công.', en: 'Password changed.')
            : context.tr(
                vi: 'Mật khẩu hiện tại không đúng.',
                en: 'The current password is incorrect.'),
        type: success ? ToastType.success : ToastType.error);
    if (success)
      NotificationService.create(
          type: 'password_changed',
          title: 'Password changed',
          body: context.tr(
              vi: 'Mật khẩu tài khoản vừa được thay đổi.',
              en: 'Your account password was changed.'));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: AnimatedBuilder(
            animation: globalAppLockController,
            builder: (context, child) => ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
              children: [
                Row(children: [
                  const Ios26BackButton(),
                  Expanded(
                      child: Text(
                          context.tr(vi: 'Bảo mật & 2FA', en: 'Security & 2FA'),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: primary))),
                  const SizedBox(width: 88)
                ]),
                const SizedBox(height: 24),
                LiquidGlassContainer(
                  borderRadius: 24,
                  blur: 20,
                  tintOpacity: 0.12,
                  child: Column(children: [
                    ListTile(
                        leading: const Icon(Icons.password_rounded,
                            color: AppColors.brandBlue),
                        title: Text(
                            context.tr(
                                vi: 'Đổi mật khẩu', en: 'Change password'),
                            style: TextStyle(
                                color: primary, fontWeight: FontWeight.w600)),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: _changePassword),
                    Divider(
                        height: 1,
                        indent: 58,
                        color: primary.withValues(alpha: 0.08)),
                    SwitchListTile.adaptive(
                        secondary: const Icon(Icons.pin_rounded,
                            color: AppColors.brandBlue),
                        title: Text(
                            context.tr(
                                vi: 'Khóa ứng dụng bằng PIN',
                                en: 'App lock with PIN'),
                            style: TextStyle(
                                color: primary, fontWeight: FontWeight.w600)),
                        subtitle: Text(context.tr(
                            vi: 'Mã PIN gồm 6 chữ số như MoMo',
                            en: 'A 6-digit PIN similar to MoMo')),
                        value: globalAppLockController.isPinEnabled,
                        onChanged: _togglePin),
                    Divider(
                        height: 1,
                        indent: 58,
                        color: primary.withValues(alpha: 0.08)),
                    SwitchListTile.adaptive(
                        secondary: Icon(
                            Platform.isIOS
                                ? Icons.face_rounded
                                : Icons.fingerprint_rounded,
                            color: AppColors.brandBlue),
                        title: Text(_biometricName(context),
                            style: TextStyle(
                                color: primary, fontWeight: FontWeight.w600)),
                        subtitle: Text(Platform.isIOS
                            ? context.tr(
                                vi: 'Sẽ hỗ trợ trong phiên bản iOS sau',
                                en: 'Coming in a future iOS version')
                            : context.tr(
                                vi: 'Mở khóa nhanh bằng vân tay',
                                en: 'Quick unlock using fingerprint')),
                        value: Platform.isIOS
                            ? false
                            : globalAppLockController.isBiometricEnabled,
                        onChanged: Platform.isIOS ? null : _toggleBiometric),
                  ]),
                ),
                const SizedBox(height: 14),
                Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                        context.tr(
                            vi:
                                'PIN chỉ được lưu dưới dạng mã băm trong vùng lưu trữ bảo mật của thiết bị. Ứng dụng không truy cập dữ liệu vân tay hoặc khuôn mặt.',
                            en:
                                'The PIN is stored only as a hash in secure device storage. The app never accesses fingerprint or face data.'),
                        style: TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            color: primary.withValues(alpha: 0.56)))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PinSecurityDialog extends StatefulWidget {
  final bool confirm;
  const _PinSecurityDialog({required this.confirm});

  @override
  State<_PinSecurityDialog> createState() => _PinSecurityDialogState();
}

class _PinSecurityDialogState extends State<_PinSecurityDialog> {
  final _first = TextEditingController();
  final _second = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _first.dispose();
    _second.dispose();
    super.dispose();
  }

  void _submit() {
    if (_first.text.length != 6 ||
        (widget.confirm && _second.text.length != 6)) {
      setState(() => _error = context.tr(
          vi: 'PIN phải có đúng 6 chữ số.',
          en: 'PIN must contain exactly 6 digits.'));
      return;
    }
    if (widget.confirm && _first.text != _second.text) {
      setState(() => _error =
          context.tr(vi: 'Hai mã PIN không khớp.', en: 'PINs do not match.'));
      return;
    }
    Navigator.pop(context, _first.text);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    return Dialog(
      elevation: 0,
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 22),
      child: LiquidGlassContainer(
        borderRadius: 30,
        blur: 30,
        tintOpacity: isDark ? 0.26 : 0.38,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.brandBlue.withValues(alpha: 0.13),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child:
                      const Icon(Icons.pin_rounded, color: AppColors.brandBlue),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.confirm
                            ? context.tr(vi: 'Thiết lập PIN', en: 'Set app PIN')
                            : context.tr(vi: 'Xác nhận PIN', en: 'Confirm PIN'),
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: primary),
                      ),
                      Text(
                        context.tr(
                            vi: 'Sử dụng 6 chữ số dễ nhớ với bạn',
                            en: 'Use 6 digits you can remember'),
                        style: TextStyle(
                            fontSize: 12,
                            color: primary.withValues(alpha: 0.55)),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _LiquidPinField(
              controller: _first,
              label: context.tr(vi: 'Mã PIN 6 số', en: '6-digit PIN'),
              autofocus: true,
              onSubmitted: widget.confirm ? null : _submit,
            ),
            if (widget.confirm) ...[
              const SizedBox(height: 12),
              _LiquidPinField(
                controller: _second,
                label: context.tr(vi: 'Nhập lại mã PIN', en: 'Confirm PIN'),
                onSubmitted: _submit,
              ),
            ],
            AnimatedSize(
              duration: const Duration(milliseconds: 180),
              child: _error == null
                  ? const SizedBox(height: 8)
                  : Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              size: 16, color: Colors.redAccent),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(_error!,
                                style: const TextStyle(
                                    color: Colors.redAccent, fontSize: 12)),
                          ),
                        ],
                      ),
                    ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16))),
                    child: Text(context.tr(vi: 'Hủy', en: 'Cancel')),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: _submit,
                    style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        backgroundColor: AppColors.brandBlue,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16))),
                    child: Text(context.tr(vi: 'Xác nhận', en: 'Confirm')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LiquidPinField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool autofocus;
  final VoidCallback? onSubmitted;

  const _LiquidPinField({
    required this.controller,
    required this.label,
    this.autofocus = false,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      autofocus: autofocus,
      obscureText: true,
      obscuringCharacter: '●',
      keyboardType: TextInputType.number,
      textInputAction:
          onSubmitted == null ? TextInputAction.next : TextInputAction.done,
      maxLength: 6,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(6),
      ],
      onSubmitted: (_) => onSubmitted?.call(),
      decoration: InputDecoration(
        labelText: label,
        counterText: '',
        prefixIcon: const Icon(Icons.lock_outline_rounded),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

class _PasswordChangeValues {
  final String currentPassword;
  final String newPassword;
  const _PasswordChangeValues(this.currentPassword, this.newPassword);
}

class _PasswordSecurityDialog extends StatefulWidget {
  const _PasswordSecurityDialog();

  @override
  State<_PasswordSecurityDialog> createState() =>
      _PasswordSecurityDialogState();
}

class _PasswordSecurityDialogState extends State<_PasswordSecurityDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _submit() {
    if (_current.text.isEmpty || _next.text.length < 8) {
      setState(() => _error = context.tr(
          vi: 'Mật khẩu mới phải có ít nhất 8 ký tự.',
          en: 'The new password must contain at least 8 characters.'));
      return;
    }
    if (_next.text != _confirm.text) {
      setState(() => _error = context.tr(
          vi: 'Mật khẩu nhập lại không khớp.',
          en: 'The confirmation password does not match.'));
      return;
    }
    Navigator.pop(context, _PasswordChangeValues(_current.text, _next.text));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    return Dialog(
      elevation: 0,
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20),
      child: SingleChildScrollView(
        child: LiquidGlassContainer(
          borderRadius: 30,
          blur: 30,
          tintOpacity: isDark ? 0.26 : 0.38,
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                      color: AppColors.brandBlue.withValues(alpha: 0.13),
                      borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.password_rounded,
                      color: AppColors.brandBlue),
                ),
                const SizedBox(width: 12),
                Expanded(
                    child: Text(
                        context.tr(vi: 'Đổi mật khẩu', en: 'Change password'),
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: primary))),
                IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded)),
              ]),
              const SizedBox(height: 18),
              _passwordField(_current,
                  context.tr(vi: 'Mật khẩu hiện tại', en: 'Current password')),
              const SizedBox(height: 12),
              _passwordField(
                  _next, context.tr(vi: 'Mật khẩu mới', en: 'New password')),
              const SizedBox(height: 12),
              _passwordField(
                  _confirm,
                  context.tr(
                      vi: 'Nhập lại mật khẩu mới', en: 'Confirm new password'),
                  done: true),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Row(children: [
                    const Icon(Icons.error_outline_rounded,
                        size: 16, color: Colors.redAccent),
                    const SizedBox(width: 6),
                    Expanded(
                        child: Text(_error!,
                            style: const TextStyle(
                                color: Colors.redAccent, fontSize: 12))),
                  ]),
                ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.shield_outlined),
                  label: Text(context.tr(
                      vi: 'CẬP NHẬT MẬT KHẨU', en: 'UPDATE PASSWORD')),
                  style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      backgroundColor: AppColors.brandBlue,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16))),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _passwordField(TextEditingController controller, String label,
      {bool done = false}) {
    return TextField(
      controller: controller,
      obscureText: true,
      textInputAction: done ? TextInputAction.done : TextInputAction.next,
      onSubmitted: done ? (_) => _submit() : null,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.lock_outline_rounded),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
