import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import 'login_screen.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;

  const ResetPasswordScreen({
    super.key,
    required this.email,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleResetPassword() async {
    setState(() {
      _errorMessage = null;
    });

    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    final newPassword = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (newPassword != confirmPassword) {
      setState(() {
        _errorMessage = "* Mật khẩu xác nhận không khớp.";
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      if (!SupabaseService.isInitialized) {
        await SupabaseService.initialize();
      }

      // Update password via Supabase Auth / RPC
      final success = await SupabaseService.updateUserPassword(
        email: widget.email,
        newPassword: newPassword,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        if (success) {
          AppToast.show(
            context,
            message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
            type: ToastType.success,
          );

          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const LoginScreen()),
            (route) => false,
          );
        } else {
          setState(() {
            _errorMessage = "* Không thể cập nhật mật khẩu mới. Vui lòng thử lại!";
          });
        }
      }
    } catch (e) {
      debugPrint("Error updating password: $e");
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = "* Không thể cập nhật mật khẩu mới. Vui lòng thử lại!";
        });
      }
    }
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
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
              const SizedBox(height: 24),

              // Title Section: Đặt Lại Mật Khẩu
              const Align(
                alignment: Alignment.center,
                child: Text(
                  "Đặt Lại Mật Khẩu",
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
              Text(
                "Tạo mật khẩu mới cho tài khoản (${widget.email})",
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 36),

              // Form Section
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Mật khẩu mới
                    const Text(
                      "Mật Khẩu Mới",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: !_isPasswordVisible,
                      onChanged: (_) {
                        if (_errorMessage != null) {
                          setState(() => _errorMessage = null);
                        }
                      },
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return "Vui lòng nhập Mật khẩu mới";
                        }
                        if (value.trim().length < 6) {
                          return "Mật khẩu phải có ít nhất 6 ký tự";
                        }
                        return null;
                      },
                      decoration: InputDecoration(
                        hintText: "••••••••••••",
                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                        prefixIcon: const Icon(Icons.lock_outline, size: 20, color: AppColors.textSecondary),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _isPasswordVisible ? Icons.visibility : Icons.visibility_off,
                            size: 20,
                            color: AppColors.textSecondary,
                          ),
                          onPressed: () {
                            setState(() {
                              _isPasswordVisible = !_isPasswordVisible;
                            });
                          },
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.cardBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.cardBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.brandBlue, width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Xác nhận mật khẩu mới
                    const Text(
                      "Xác Nhận Mật Khẩu Mới",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: !_isConfirmPasswordVisible,
                      onChanged: (_) {
                        if (_errorMessage != null) {
                          setState(() => _errorMessage = null);
                        }
                      },
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return "Vui lòng nhập lại Mật khẩu xác nhận";
                        }
                        if (value.trim() != _passwordController.text.trim()) {
                          return "Mật khẩu xác nhận không khớp";
                        }
                        return null;
                      },
                      decoration: InputDecoration(
                        hintText: "••••••••••••",
                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                        prefixIcon: const Icon(Icons.lock_reset_outlined, size: 20, color: AppColors.textSecondary),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _isConfirmPasswordVisible ? Icons.visibility : Icons.visibility_off,
                            size: 20,
                            color: AppColors.textSecondary,
                          ),
                          onPressed: () {
                            setState(() {
                              _isConfirmPasswordVisible = !_isConfirmPasswordVisible;
                            });
                          },
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.cardBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.cardBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.brandBlue, width: 1.5),
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
                        const Icon(Icons.error_outline, size: 16, color: Colors.red),
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

              // Button: Cập Nhật Mật Khẩu
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleResetPassword,
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
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          "Cập Nhật Mật Khẩu",
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
