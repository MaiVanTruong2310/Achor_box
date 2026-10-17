import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/ios26_back_button.dart';
import 'otp_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleSendResetOtp() async {
    setState(() {
      _errorMessage = null;
    });

    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    final email = _emailController.text.trim();

    setState(() {
      _isLoading = true;
    });

    try {
      if (!SupabaseService.isInitialized) {
        await SupabaseService.initialize();
      }

      await SupabaseService.sendEmailOtp(
        email: email,
        isPasswordReset: true,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        Navigator.of(context).push(
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => OtpScreen(
              email: email,
              isPasswordReset: true,
            ),
            transitionsBuilder:
                (context, animation, secondaryAnimation, child) {
              return FadeTransition(opacity: animation, child: child);
            },
            transitionDuration: const Duration(milliseconds: 400),
          ),
        );
      }
    } catch (e) {
      debugPrint("Error sending reset password OTP: $e");
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage =
              "* Không thể gửi mã khôi phục. Vui lòng kiểm tra lại Email.";
        });
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Top Back Button Row
              Align(
                alignment: Alignment.centerLeft,
                child: const Ios26BackButton(),
              ),
              const SizedBox(height: 24),

              // Title Section: Quên Mật Khẩu
              const Align(
                alignment: Alignment.center,
                child: Text(
                  "Quên Mật Khẩu",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Align(
                alignment: Alignment.center,
                child: Text(
                  "Nhập Email của bạn để nhận mã OTP khôi phục mật khẩu !",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 36),

              // Form Input
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Email Đăng Ký",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      onChanged: (_) {
                        if (_errorMessage != null) {
                          setState(() => _errorMessage = null);
                        }
                      },
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return "Vui lòng nhập địa chỉ Email";
                        }
                        if (!value.contains('@')) {
                          return "Địa chỉ Email không hợp lệ";
                        }
                        return null;
                      },
                      decoration: InputDecoration(
                        hintText: "Nhập email tài khoản của bạn",
                        hintStyle: const TextStyle(
                            color: AppColors.textMuted, fontSize: 14),
                        prefixIcon: const Icon(Icons.email_outlined,
                            size: 20, color: AppColors.textSecondary),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: AppColors.cardBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: AppColors.cardBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: AppColors.brandBlue, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Red Error Banner (Above Submit Button)
              if (_errorMessage != null) ...[
                Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 16, color: Colors.red),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: Colors.red,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              // Button: Gửi Mã OTP
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleSendResetOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandBlue,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          "Gửi Mã OTP",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            letterSpacing: 0.3,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
