import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../home/main_layout.dart';
import 'login_screen.dart';
import 'otp_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _identityController = TextEditingController();
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;
  bool _isLoading = false;
  String? _errorMessage;

  void _navigateToLogin() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  void _showSocialAuthMaintenanceMessage(String providerName) {
    AppToast.show(
      context,
      message: "Chức năng đăng ký bằng $providerName hiện đang được bảo trì.",
      type: ToastType.info,
    );
  }

  Future<void> _handleRegister() async {
    setState(() {
      _errorMessage = null;
    });

    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    if (_passwordController.text.trim() !=
        _confirmPasswordController.text.trim()) {
      setState(() {
        _errorMessage = "* Mật khẩu xác nhận không khớp.";
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    final fullName = _fullNameController.text.trim();
    final email = _identityController.text.trim();
    final password = _passwordController.text.trim();

    try {
      if (!SupabaseService.isInitialized) {
        await SupabaseService.initialize();
      }

      final response = await SupabaseService.signUp(
        email: email,
        password: password,
        fullName: fullName,
      );

      if (response != null && response.user != null) {
        debugPrint("Supabase sign up successful for: ${response.user!.email}");
        if (response.session != null && mounted) {
          setState(() => _isLoading = false);
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const MainLayout()),
            (route) => false,
          );
          return;
        }
      }
    } catch (e) {
      debugPrint("Supabase sign up error: $e");
      final errStr = e.toString().toLowerCase();
      if (errStr.contains('already registered') ||
          errStr.contains('already exists')) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = "* Email này đã được đăng ký tài khoản trước đó.";
          });
        }
        return;
      }
    }

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      // Supabase Auth sends the confirmation OTP; no mail credentials or
      // expected OTP are stored in the mobile application.
      Navigator.of(context).push(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => OtpScreen(
            email: email,
            fullName: fullName,
          ),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    }
  }

  @override
  void dispose() {
    _identityController.dispose();
    _fullNameController.dispose();
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
              const SizedBox(height: 12),

              // Title Section: Đăng Ký (Centered & Bold)
              const Align(
                alignment: Alignment.center,
                child: Text(
                  "Đăng Ký",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              const Align(
                alignment: Alignment.center,
                child: Text(
                  "Đăng ký cùng chúng tôi nâng cao đời sống của bạn !",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Form Input Section (4 Fields)
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Field 1: Email hoặc Số Điện Thoại
                    const Text(
                      "Email hoặc Số Điện Thoại",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _identityController,
                      keyboardType: TextInputType.emailAddress,
                      onChanged: (_) {
                        if (_errorMessage != null) {
                          setState(() => _errorMessage = null);
                        }
                      },
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return "Vui lòng nhập Email hoặc Số điện thoại";
                        }
                        return null;
                      },
                      decoration: InputDecoration(
                        hintText: "Nhập email hoặc số điện thoại",
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
                    const SizedBox(height: 16),

                    // Field 2: Họ Và Tên
                    const Text(
                      "Họ Và Tên",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _fullNameController,
                      onChanged: (_) {
                        if (_errorMessage != null) {
                          setState(() => _errorMessage = null);
                        }
                      },
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return "Vui lòng nhập Họ và Tên đầy đủ";
                        }
                        return null;
                      },
                      decoration: InputDecoration(
                        hintText: "Nhập họ và tên đầy đủ",
                        hintStyle: const TextStyle(
                            color: AppColors.textMuted, fontSize: 14),
                        prefixIcon: const Icon(Icons.person_outline,
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
                    const SizedBox(height: 16),

                    // Field 3: Mật Khẩu
                    const Text(
                      "Mật Khẩu",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
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
                          return "Vui lòng nhập Mật khẩu";
                        }
                        if (value.trim().length < 6) {
                          return "Mật khẩu phải có ít nhất 6 ký tự";
                        }
                        return null;
                      },
                      decoration: InputDecoration(
                        hintText: "••••••••••••",
                        hintStyle: const TextStyle(
                            color: AppColors.textMuted, fontSize: 14),
                        prefixIcon: const Icon(Icons.lock_outline,
                            size: 20, color: AppColors.textSecondary),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _isPasswordVisible
                                ? Icons.visibility
                                : Icons.visibility_off,
                            size: 20,
                            color: AppColors.textSecondary,
                          ),
                          onPressed: () {
                            setState(() {
                              _isPasswordVisible = !_isPasswordVisible;
                            });
                          },
                        ),
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
                    const SizedBox(height: 16),

                    // Field 4: Xác Nhận Mật Khẩu
                    const Text(
                      "Xác Nhận Mật Khẩu",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
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
                        hintStyle: const TextStyle(
                            color: AppColors.textMuted, fontSize: 14),
                        prefixIcon: const Icon(Icons.lock_reset_outlined,
                            size: 20, color: AppColors.textSecondary),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _isConfirmPasswordVisible
                                ? Icons.visibility
                                : Icons.visibility_off,
                            size: 20,
                            color: AppColors.textSecondary,
                          ),
                          onPressed: () {
                            setState(() {
                              _isConfirmPasswordVisible =
                                  !_isConfirmPasswordVisible;
                            });
                          },
                        ),
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
              const SizedBox(height: 20),

              // Red Error Banner (Above Register Button)
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

              // Button: Đăng Ký
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleRegister,
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
                          "Đăng Ký",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            letterSpacing: 0.3,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 16),

              // Login Prompt: Bạn đã có tài khoản? Đăng Nhập
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    "Bạn đã có tài khoản? ",
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  GestureDetector(
                    onTap: _navigateToLogin,
                    child: const Text(
                      "Đăng Nhập",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.brandBlue,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // OR Divider Row
              Row(
                children: const [
                  Expanded(
                      child:
                          Divider(color: AppColors.cardBorder, thickness: 1)),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16.0),
                    child: Text(
                      "OR",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                  Expanded(
                      child:
                          Divider(color: AppColors.cardBorder, thickness: 1)),
                ],
              ),
              const SizedBox(height: 20),

              // Social Auth Buttons: Google & Apple
              Row(
                children: [
                  // Google Button
                  Expanded(
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.cardBorder),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () =>
                            _showSocialAuthMaintenanceMessage("Google"),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.g_mobiledata,
                                size: 28, color: Color(0xFFEA4335)),
                            SizedBox(width: 6),
                            Text(
                              "Google",
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Apple Button
                  Expanded(
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.cardBorder),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => _showSocialAuthMaintenanceMessage("Apple"),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.apple,
                                size: 22, color: AppColors.textPrimary),
                            SizedBox(width: 8),
                            Text(
                              "Apple",
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
