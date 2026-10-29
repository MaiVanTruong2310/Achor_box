import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../services/auth_errors.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import '../home/main_layout.dart';
import 'reset_password_screen.dart';
import 'widgets/auth_scaffold.dart';

class OtpScreen extends StatefulWidget {
  final String email;
  final String? fullName;
  final bool isPasswordReset;

  const OtpScreen({
    super.key,
    required this.email,
    this.fullName,
    this.isPasswordReset = false,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  static const _resendDelay = 60;

  final _codeController = TextEditingController();
  Timer? _timer;
  int _secondsLeft = _resendDelay;
  bool _isVerifying = false;
  bool _isResending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _codeController.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _secondsLeft = _resendDelay);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _secondsLeft <= 1) timer.cancel();
      if (mounted) setState(() => _secondsLeft--);
    });
  }

  Future<void> _verify(String code) async {
    if (_isVerifying || code.length < 6) return;
    setState(() {
      _isVerifying = true;
      _error = null;
    });

    try {
      await SupabaseService.verifyEmailOtp(
        email: widget.email,
        token: code,
        isPasswordReset: widget.isPasswordReset,
      );
      if (!mounted) return;
      final next = widget.isPasswordReset
          ? ResetPasswordScreen(email: widget.email)
          : const MainLayout();
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => next),
        (route) => widget.isPasswordReset && route.isFirst,
      );
    } catch (error) {
      if (!mounted) return;
      _codeController.clear();
      setState(() => _error = AuthErrors.message(context, error));
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  Future<void> _resend() async {
    if (_secondsLeft > 0 || _isResending) return;
    setState(() {
      _isResending = true;
      _error = null;
    });
    try {
      await SupabaseService.sendEmailOtp(
        email: widget.email,
        isPasswordReset: widget.isPasswordReset,
      );
      if (!mounted) return;
      _startCountdown();
      AppToast.show(
        context,
        message: context.tr(
          vi: 'Đã gửi mã mới tới ${widget.email}.',
          en: 'A new code was sent to ${widget.email}.',
        ),
        type: ToastType.success,
      );
    } catch (error) {
      if (mounted) setState(() => _error = AuthErrors.message(context, error));
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      showBackButton: true,
      title: context.tr(vi: 'Nhập mã xác nhận', en: 'Enter the code'),
      subtitle: context.tr(
        vi: 'Mã gồm 6 chữ số đã được gửi tới ${widget.email}.',
        en: 'We sent a 6-digit code to ${widget.email}.',
      ),
      children: [
        OtpCodeField(
          controller: _codeController,
          enabled: !_isVerifying,
          hasError: _error != null,
          onCompleted: _verify,
        ),
        const SizedBox(height: AppSpacing.lg),
        if (_error != null) ...[
          InlineMessage(_error!),
          const SizedBox(height: AppSpacing.md),
        ],
        AppButton(
          label: context.tr(vi: 'Xác nhận', en: 'Verify'),
          isLoading: _isVerifying,
          onPressed: () => _verify(_codeController.text),
        ),
        const SizedBox(height: AppSpacing.sm),
        Center(
          child: _secondsLeft > 0
              ? Builder(
                  builder: (context) => Text(
                    context.tr(
                      vi: 'Gửi lại mã sau $_secondsLeft giây',
                      en: 'Resend code in ${_secondsLeft}s',
                    ),
                    style: context.text.bodyMedium
                        ?.copyWith(color: context.colors.textSecondary),
                  ),
                )
              : TextButton(
                  onPressed: _isResending ? null : _resend,
                  child: Text(context.tr(vi: 'Gửi lại mã', en: 'Resend code')),
                ),
        ),
      ],
    );
  }
}
