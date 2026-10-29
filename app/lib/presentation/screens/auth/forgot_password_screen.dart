import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/form_validators.dart';
import '../../../services/auth_errors.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import 'otp_screen.dart';
import 'widgets/auth_scaffold.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (_isLoading || !(_formKey.currentState?.validate() ?? false)) return;
    final email = _emailController.text.trim();
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (!SupabaseService.isInitialized) await SupabaseService.initialize();
      await SupabaseService.sendEmailOtp(email: email, isPasswordReset: true);
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => OtpScreen(email: email, isPasswordReset: true),
      ));
    } catch (error) {
      if (mounted) setState(() => _error = AuthErrors.message(context, error));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      showBackButton: true,
      title: context.tr(vi: 'Quên mật khẩu', en: 'Forgot password'),
      subtitle: context.tr(
        vi: 'Nhập email đã đăng ký, chúng tôi sẽ gửi mã để đặt lại mật khẩu.',
        en: 'Enter your account email and we will send a reset code.',
      ),
      children: [
        Form(
          key: _formKey,
          child: AppTextField(
            controller: _emailController,
            label: 'Email',
            prefixIcon: AppIcons.email,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.send,
            autofillHints: const [AutofillHints.email],
            autofocus: true,
            validator: FormValidators.email(context),
            onSubmitted: (_) => _sendCode(),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        if (_error != null) ...[
          InlineMessage(_error!),
          const SizedBox(height: AppSpacing.md),
        ],
        AppButton(
          label: context.tr(vi: 'Gửi mã', en: 'Send code'),
          isLoading: _isLoading,
          onPressed: _sendCode,
        ),
      ],
    );
  }
}
