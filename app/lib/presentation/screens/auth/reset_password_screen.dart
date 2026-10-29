import 'package:flutter/material.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/form_validators.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import 'login_screen.dart';
import 'widgets/auth_scaffold.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;

  const ResetPasswordScreen({super.key, required this.email});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_isLoading || !(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final saved = await SupabaseService.updateUserPassword(
      email: widget.email,
      newPassword: _passwordController.text,
    );
    if (!mounted) return;
    setState(() => _isLoading = false);
    if (!saved) {
      setState(() => _error = context.tr(
            vi: 'Không cập nhật được mật khẩu. Vui lòng thử lại.',
            en: 'Could not update the password. Please try again.',
          ));
      return;
    }

    await SupabaseService.signOut();
    if (!mounted) return;
    AppToast.show(
      context,
      message: context.tr(
        vi: 'Đã đổi mật khẩu. Hãy đăng nhập lại.',
        en: 'Password changed. Please sign in again.',
      ),
      type: ToastType.success,
    );
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: context.tr(vi: 'Tạo mật khẩu mới', en: 'Create a new password'),
      subtitle: widget.email,
      children: [
        Form(
          key: _formKey,
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                PasswordField(
                  controller: _passwordController,
                  label: context.tr(vi: 'Mật khẩu mới', en: 'New password'),
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
                  onSubmitted: (_) => _save(),
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
          label: context.tr(vi: 'Lưu mật khẩu', en: 'Save password'),
          isLoading: _isLoading,
          onPressed: _save,
        ),
      ],
    );
  }
}
