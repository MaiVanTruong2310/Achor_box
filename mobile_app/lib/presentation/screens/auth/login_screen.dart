import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/form_validators.dart';
import '../../../services/auth_errors.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../home/main_layout.dart';
import 'forgot_password_screen.dart';
import 'otp_screen.dart';
import 'register_screen.dart';
import 'widgets/auth_scaffold.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (_isLoading || !(_formKey.currentState?.validate() ?? false)) return;
    final email = _emailController.text.trim();
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (!SupabaseService.isInitialized) await SupabaseService.initialize();
      final response = await SupabaseService.signIn(
        email: email,
        password: _passwordController.text,
      );
      final user = response?.user;
      if (user == null) throw const _NoUserException();

      final profile = await SupabaseService.getUserProfile(user.id);
      if (profile?['is_locked'] == true) {
        await SupabaseService.signOut();
        if (!mounted) return;
        setState(() => _error = context.tr(
              vi: 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.',
              en: 'This account is locked. Please contact support.',
            ));
        return;
      }
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const MainLayout()),
        (_) => false,
      );
    } catch (error) {
      if (!mounted) return;
      if (AuthErrors.classify(error) == AuthErrorKind.emailNotConfirmed) {
        await _continueEmailConfirmation(email);
        return;
      }
      setState(() => _error = error is _NoUserException
          ? context.tr(
              vi: 'Email hoặc mật khẩu không đúng.',
              en: 'Incorrect email or password.')
          : AuthErrors.message(context, error));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _continueEmailConfirmation(String email) async {
    try {
      await SupabaseService.sendEmailOtp(email: email, isPasswordReset: false);
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => OtpScreen(email: email),
      ));
    } catch (error) {
      if (!mounted) return;
      if (AuthErrors.classify(error) == AuthErrorKind.rateLimited) {
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => OtpScreen(email: email),
        ));
        return;
      }
      setState(() => _error = AuthErrors.message(context, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: context.tr(vi: 'Đăng nhập', en: 'Sign in'),
      subtitle: context.tr(
        vi: 'Quản lý hộp nhận hàng của bạn mọi lúc, mọi nơi.',
        en: 'Manage your delivery box from anywhere.',
      ),
      footer: AuthFooterLink(
        prompt: context.tr(vi: 'Chưa có tài khoản?', en: 'New to Anchor Box?'),
        action: context.tr(vi: 'Đăng ký', en: 'Create account'),
        onPressed: () => Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const RegisterScreen()),
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
                  validator: FormValidators.currentPassword(context),
                  onSubmitted: (_) => _signIn(),
                ),
              ],
            ),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
            ),
            child:
                Text(context.tr(vi: 'Quên mật khẩu?', en: 'Forgot password?')),
          ),
        ),
        if (_error != null) ...[
          InlineMessage(_error!),
          const SizedBox(height: AppSpacing.md),
        ],
        AppButton(
          label: context.tr(vi: 'Đăng nhập', en: 'Sign in'),
          isLoading: _isLoading,
          onPressed: _signIn,
        ),
      ],
    );
  }
}

class _NoUserException implements Exception {
  const _NoUserException();
}
