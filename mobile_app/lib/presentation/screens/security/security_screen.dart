import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/form_validators.dart';
import '../../../services/app_lock_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';

/// Returns an error to show inside the dialog, or null when it may close.
typedef _DialogSubmit<T> = Future<String?> Function(T value);

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  @override
  void initState() {
    super.initState();
    globalAppLockController.refresh();
  }

  String _wrongPin() =>
      context.tr(vi: 'Mã PIN không đúng.', en: 'Incorrect PIN.');

  String _storageError() => context.tr(
        vi: 'Không lưu được mã PIN trên thiết bị. Hãy thử lại.',
        en: 'Could not save the PIN on this device. Please try again.',
      );

  void _toast(String vi, String en) => AppToast.show(
        context,
        message: context.tr(vi: vi, en: en),
        type: ToastType.success,
      );

  Future<bool> _showPinDialog(
      _PinDialogMode mode, _DialogSubmit<_PinValues> submit) async {
    final done = await showGlassDialog<bool>(
      context,
      _PinDialog(mode: mode, onSubmit: submit),
    );
    return done ?? false;
  }

  Future<String?> _savePin(String pin) async {
    try {
      await AppLockService.setPin(pin);
      return null;
    } catch (error) {
      debugPrint('Save app PIN error: $error');
      return _storageError();
    }
  }

  Future<void> _togglePin(bool enable) async {
    final done = enable
        ? await _showPinDialog(
            _PinDialogMode.create, (values) => _savePin(values.newPin!))
        : await _showPinDialog(_PinDialogMode.disable, (values) async {
            if (!await AppLockService.verifyPin(values.currentPin!)) {
              return _wrongPin();
            }
            // Turning the PIN off also turns biometrics off.
            await AppLockService.disablePin();
            return null;
          });
    await globalAppLockController.refresh();
    if (!done || !mounted) return;
    enable
        ? _toast('Đã bật khóa ứng dụng bằng PIN.', 'App lock with PIN is on.')
        : _toast('Đã tắt khóa ứng dụng.', 'App lock is off.');
  }

  Future<void> _changePin() async {
    final done = await _showPinDialog(_PinDialogMode.change, (values) async {
      if (!await AppLockService.verifyPin(values.currentPin!)) {
        return _wrongPin();
      }
      return _savePin(values.newPin!);
    });
    if (done && mounted) _toast('Đã đổi mã PIN.', 'PIN changed.');
  }

  Future<void> _toggleBiometric(bool enable) async {
    if (enable) {
      if (!globalAppLockController.canUseBiometrics) {
        AppToast.show(
          context,
          message: context.tr(
            vi: 'Điện thoại chưa đăng ký vân tay. Hãy thêm vân tay trong Cài đặt.',
            en: 'No fingerprint is enrolled. Add one in your phone settings.',
          ),
          type: ToastType.error,
        );
        return;
      }
      final accepted = await AppLockService.authenticateBiometric(context.tr(
          vi: 'Xác thực để bật mở khóa bằng vân tay',
          en: 'Authenticate to turn on fingerprint unlock'));
      if (!accepted) return;
    }
    await AppLockService.setBiometricEnabled(enable);
    await globalAppLockController.refresh();
  }

  Future<String?> _submitPassword(_PasswordValues values) async {
    final result = await SupabaseService.changeAuthenticatedPassword(
      currentPassword: values.current,
      newPassword: values.next,
    );
    if (!mounted) return null;
    return switch (result) {
      PasswordChangeResult.success => null,
      PasswordChangeResult.wrongCurrentPassword => context.tr(
          vi: 'Mật khẩu hiện tại không đúng.',
          en: 'The current password is incorrect.'),
      PasswordChangeResult.newPasswordRejected => context.tr(
          vi: 'Mật khẩu mới quá yếu hoặc trùng mật khẩu cũ.',
          en: 'The new password is too weak or matches the old one.'),
      PasswordChangeResult.failed => context.tr(
          vi: 'Không đổi được mật khẩu. Hãy kiểm tra kết nối mạng.',
          en: 'Could not change the password. Check your connection.'),
    };
  }

  Future<void> _changePassword() async {
    final done = await showGlassDialog<bool>(
      context,
      _PasswordDialog(onSubmit: _submitPassword),
    );
    if (done != true || !mounted) return;
    _toast('Đã đổi mật khẩu.', 'Password changed.');
    await NotificationService.create(
      type: 'password_changed',
      title: 'Password changed',
      body: context.tr(
          vi: 'Mật khẩu tài khoản vừa được thay đổi.',
          en: 'Your account password was changed.'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: globalAppLockController,
      builder: (context, _) {
        final pinOn = globalAppLockController.isPinEnabled;
        // Face ID stays disabled until there is a tested iOS target.
        final biometricSupported = !Platform.isIOS;

        return AppPage(
          showBackButton: true,
          title: context.tr(vi: 'Bảo mật', en: 'Security'),
          children: [
            _Section(
              header: context.tr(vi: 'Tài khoản', en: 'Account'),
              footer: context.tr(
                vi: 'Bạn cần nhập mật khẩu hiện tại để đổi sang mật khẩu mới.',
                en: 'You need your current password to set a new one.',
              ),
              tiles: (context) => [
                GroupedTile(
                  leading: IconBadge(
                      icon: AppIcons.password,
                      color: context.colors.accent,
                      size: 30),
                  title: context.tr(vi: 'Đổi mật khẩu', en: 'Change password'),
                  onTap: _changePassword,
                ),
              ],
            ),
            _Section(
              header: context.tr(vi: 'Khóa ứng dụng', en: 'App lock'),
              footer: context.tr(
                vi: 'Mã PIN chỉ lưu dạng mã băm trong vùng bảo mật của điện thoại, không gửi lên máy chủ. Ứng dụng không đọc dữ liệu vân tay.',
                en: 'The PIN is kept only as a hash in secure phone storage and never leaves the device. The app never reads fingerprint data.',
              ),
              tiles: (context) => [
                GroupedTile(
                  leading: IconBadge(
                      icon: AppIcons.lock,
                      color: context.colors.locked,
                      size: 30),
                  title:
                      context.tr(vi: 'Khóa bằng mã PIN', en: 'Lock with PIN'),
                  subtitle: context.tr(
                      vi: 'Hỏi PIN 6 số khi mở ứng dụng',
                      en: 'Ask for a 6-digit PIN on open'),
                  trailing:
                      Switch.adaptive(value: pinOn, onChanged: _togglePin),
                  onTap: () => _togglePin(!pinOn),
                ),
                if (pinOn)
                  GroupedTile(
                    leading: IconBadge(
                        icon: AppIcons.key,
                        color: context.colors.indigo,
                        size: 30),
                    title: context.tr(vi: 'Đổi mã PIN', en: 'Change PIN'),
                    onTap: _changePin,
                  ),
                GroupedTile(
                  leading: IconBadge(
                      icon: Platform.isIOS
                          ? Icons.face_rounded
                          : Icons.fingerprint_rounded,
                      color: context.colors.alert,
                      size: 30),
                  title: Platform.isIOS
                      ? 'Face ID'
                      : context.tr(
                          vi: 'Mở khóa bằng vân tay', en: 'Fingerprint unlock'),
                  subtitle: !biometricSupported
                      ? context.tr(
                          vi: 'Sẽ hỗ trợ trong phiên bản iOS sau',
                          en: 'Coming in a future iOS version')
                      : pinOn
                          ? context.tr(
                              vi: 'Mở nhanh, vẫn dùng được PIN dự phòng',
                              en: 'Quick unlock, PIN still works as backup')
                          : context.tr(
                              vi: 'Bật khóa bằng mã PIN trước',
                              en: 'Turn on the PIN lock first'),
                  trailing: Switch.adaptive(
                    value: biometricSupported &&
                        globalAppLockController.isBiometricEnabled,
                    onChanged:
                        biometricSupported && pinOn ? _toggleBiometric : null,
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

/// [GroupedSection] whose tiles are built under the page's theme, so their
/// colors come from the dark wallpaper theme rather than the caller.
class _Section extends StatelessWidget {
  final String header;
  final String footer;
  final List<Widget> Function(BuildContext context) tiles;

  const _Section({
    required this.header,
    required this.footer,
    required this.tiles,
  });

  @override
  Widget build(BuildContext context) {
    return GroupedSection(
      header: header,
      footer: footer,
      children: tiles(context),
    );
  }
}

enum _PinDialogMode { create, disable, change }

class _PinValues {
  final String? currentPin;
  final String? newPin;
  const _PinValues({this.currentPin, this.newPin});
}

class _PinDialog extends StatefulWidget {
  final _PinDialogMode mode;
  final _DialogSubmit<_PinValues> onSubmit;

  const _PinDialog({required this.mode, required this.onSubmit});

  @override
  State<_PinDialog> createState() => _PinDialogState();
}

class _PinDialogState extends State<_PinDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;

  bool get _asksCurrent => widget.mode != _PinDialogMode.create;
  bool get _asksNew => widget.mode != _PinDialogMode.disable;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    String? error;
    if ((_asksCurrent && _current.text.length != 6) ||
        (_asksNew && (_next.text.length != 6 || _confirm.text.length != 6))) {
      error = context.tr(
          vi: 'Mã PIN phải có đúng 6 chữ số.',
          en: 'The PIN must have exactly 6 digits.');
    } else if (_asksNew && _next.text != _confirm.text) {
      error = context.tr(
          vi: 'Hai mã PIN mới không khớp.', en: 'The new PINs do not match.');
    }
    if (error != null) {
      setState(() => _error = error);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    final result = await widget.onSubmit(_PinValues(
      currentPin: _asksCurrent ? _current.text : null,
      newPin: _asksNew ? _next.text : null,
    ));
    if (!mounted) return;
    if (result == null) {
      Navigator.pop(context, true);
      return;
    }
    setState(() {
      _busy = false;
      _error = result;
      if (_asksCurrent) _current.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final title = switch (widget.mode) {
      _PinDialogMode.create => context.tr(vi: 'Tạo mã PIN', en: 'Create a PIN'),
      _PinDialogMode.disable =>
        context.tr(vi: 'Tắt khóa ứng dụng', en: 'Turn off app lock'),
      _PinDialogMode.change => context.tr(vi: 'Đổi mã PIN', en: 'Change PIN'),
    };
    final fields = <Widget>[
      if (_asksCurrent)
        _PinField(
          controller: _current,
          label: context.tr(vi: 'Mã PIN hiện tại', en: 'Current PIN'),
          autofocus: true,
        ),
      if (_asksNew) ...[
        _PinField(
          controller: _next,
          label: context.tr(vi: 'Mã PIN mới (6 số)', en: 'New PIN (6 digits)'),
          autofocus: !_asksCurrent,
        ),
        _PinField(
          controller: _confirm,
          label: context.tr(vi: 'Nhập lại mã PIN mới', en: 'Confirm new PIN'),
        ),
      ],
    ];

    return GlassDialog(
      icon: widget.mode == _PinDialogMode.disable
          ? AppIcons.unlock
          : AppIcons.keyFill,
      iconColor: context.colors.locked,
      title: title,
      message: widget.mode == _PinDialogMode.disable
          ? context.tr(
              vi: 'Nhập mã PIN để tắt khóa. Mở khóa bằng vân tay cũng sẽ tắt.',
              en: 'Enter your PIN to turn the lock off. Fingerprint unlock turns off too.')
          : null,
      fields: fields,
      error: _error,
      busy: _busy,
      confirmLabel: widget.mode == _PinDialogMode.disable
          ? context.tr(vi: 'Tắt khóa', en: 'Turn off')
          : context.tr(vi: 'Lưu', en: 'Save'),
      destructive: widget.mode == _PinDialogMode.disable,
      onConfirm: _submit,
    );
  }
}

class _PinField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool autofocus;

  const _PinField({
    required this.controller,
    required this.label,
    this.autofocus = false,
  });

  @override
  Widget build(BuildContext context) {
    return AppTextField(
      controller: controller,
      label: label,
      prefixIcon: AppIcons.lock,
      autofocus: autofocus,
      obscureText: true,
      keyboardType: TextInputType.number,
      textInputAction: TextInputAction.next,
      maxLength: 6,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
    );
  }
}

class _PasswordValues {
  final String current;
  final String next;
  const _PasswordValues(this.current, this.next);
}

class _PasswordDialog extends StatefulWidget {
  final _DialogSubmit<_PasswordValues> onSubmit;

  const _PasswordDialog({required this.onSubmit});

  @override
  State<_PasswordDialog> createState() => _PasswordDialogState();
}

class _PasswordDialogState extends State<_PasswordDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    String? error;
    if (_current.text.isEmpty) {
      error = context.tr(
          vi: 'Hãy nhập mật khẩu hiện tại.',
          en: 'Enter your current password.');
    } else if (FormValidators.newPassword(context)(_next.text)
        case final message?) {
      // Same rule as registration.
      error = message;
    } else if (_next.text == _current.text) {
      error = context.tr(
          vi: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
          en: 'The new password must differ from the current one.');
    } else if (_next.text != _confirm.text) {
      error = context.tr(
          vi: 'Mật khẩu nhập lại không khớp.',
          en: 'The confirmation does not match.');
    }
    if (error != null) {
      setState(() => _error = error);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    final result =
        await widget.onSubmit(_PasswordValues(_current.text, _next.text));
    if (!mounted) return;
    if (result == null) {
      Navigator.pop(context, true);
      return;
    }
    setState(() {
      _busy = false;
      _error = result;
    });
  }

  @override
  Widget build(BuildContext context) {
    return GlassDialog(
      icon: AppIcons.password,
      title: context.tr(vi: 'Đổi mật khẩu', en: 'Change password'),
      message: context.tr(
        vi: 'Ít nhất ${FormValidators.minPasswordLength} ký tự, gồm cả chữ và số.',
        en: 'At least ${FormValidators.minPasswordLength} characters with letters and numbers.',
      ),
      fields: [
        PasswordField(
          controller: _current,
          label: context.tr(vi: 'Mật khẩu hiện tại', en: 'Current password'),
          textInputAction: TextInputAction.next,
        ),
        PasswordField(
          controller: _next,
          label: context.tr(vi: 'Mật khẩu mới', en: 'New password'),
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.newPassword],
        ),
        PasswordField(
          controller: _confirm,
          label: context.tr(
              vi: 'Nhập lại mật khẩu mới', en: 'Confirm new password'),
          autofillHints: const [AutofillHints.newPassword],
          onSubmitted: (_) => _submit(),
        ),
      ],
      error: _error,
      busy: _busy,
      confirmLabel: context.tr(vi: 'Đổi mật khẩu', en: 'Change password'),
      onConfirm: _submit,
    );
  }
}
