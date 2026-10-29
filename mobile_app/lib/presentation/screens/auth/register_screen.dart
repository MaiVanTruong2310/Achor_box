import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/form_validators.dart';
import '../../../services/auth_errors.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../home/main_layout.dart';
import 'login_screen.dart';
import 'otp_screen.dart';
import 'widgets/auth_scaffold.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_isLoading || !(_formKey.currentState?.validate() ?? false)) return;
    final email = _emailController.text.trim();
    final fullName = _nameController.text.trim();
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (!SupabaseService.isInitialized) await SupabaseService.initialize();
      final response = await SupabaseService.signUp(
        email: email,
        password: _passwordController.text,
        fullName: fullName,
      );
      if (!mounted) return;
      if (response?.session != null) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const MainLayout()),
          (_) => false,
        );
        return;
      }
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => OtpScreen(email: email, fullName: fullName),
      ));
    } catch (error) {
      if (!mounted) return;
      // Re-registering an unconfirmed email re-sends its code, which Supabase
      // throttles to once a minute. The code already sent is still valid.
      if (AuthErrors.classify(error) == AuthErrorKind.rateLimited) {
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => OtpScreen(email: email, fullName: fullName),
        ));
        return;
      }
      setState(() => _error = AuthErrors.message(context, error));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: context.tr(vi: 'Tạo tài khoản', en: 'Create account'),
      subtitle: context.tr(
        vi: 'Chúng tôi sẽ gửi mã xác nhận tới email của bạn.',
        en: 'We will send a confirmation code to your email.',
      ),
      footer: AuthFooterLink(
        prompt:
            context.tr(vi: 'Đã có tài khoản?', en: 'Already have an account?'),
        action: context.tr(vi: 'Đăng nhập', en: 'Sign in'),
        onPressed: () => Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        ),
      ),
      children: [
        Form(
          key: _formKey,
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppTextField(
                  controller: _nameController,
                  label: context.tr(vi: 'Họ và tên', en: 'Full name'),
                  prefixIcon: AppIcons.person,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.name],
                  validator: FormValidators.requiredText(
                    context,
                    vi: 'Vui lòng nhập họ và tên.',
                    en: 'Enter your full name.',
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                AppTextField(
                  controller: _emailController,
                  label: 'Email',
                  prefixIcon: AppIcons.email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  validator: FormValidators.email(context),
                ),
                const SizedBox(height: AppSpacing.sm),
                PasswordField(
                  controller: _passwordController,
                  label: context.tr(vi: 'Mật khẩu', en: 'Password'),
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.newPassword],
                  validator: FormValidators.newPassword(context),
                ),
                const SizedBox(height: AppSpacing.sm),
                PasswordField(
                  controller: _confirmController,
                  label: context.tr(
                      vi: 'Nhập lại mật khẩu', en: 'Confirm password'),
                  autofillHints: const [AutofillHints.newPassword],
                  validator:
                      FormValidators.matches(context, _passwordController),
                  onSubmitted: (_) => _register(),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        if (_error != null) ...[
          InlineMessage(_error!),
          const SizedBox(height: AppSpacing.md),
        ],
        AppButton(
          label: context.tr(vi: 'Tạo tài khoản', en: 'Create account'),
          isLoading: _isLoading,
          onPressed: _register,
        ),
      ],
    );
  }
}
