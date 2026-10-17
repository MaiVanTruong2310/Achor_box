import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_assets.dart';
import '../home/main_layout.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import '../../widgets/app_toast.dart';
import '../../../services/supabase_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _identityController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isPasswordVisible = false;
  bool _isLoading = false;
  String? _errorMessage;

  void _navigateToDashboard() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const MainLayout()),
    );
  }

  void _navigateToForgotPassword() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const ForgotPasswordScreen()),
    );
  }

  Future<void> _handleLogin() async {
    setState(() {
      _errorMessage = null;
    });

    if (_formKey.currentState?.validate() ?? false) {
      final email = _identityController.text.trim();
      final password = _passwordController.text.trim();

      setState(() {
        _isLoading = true;
      });

      try {
        if (!SupabaseService.isInitialized) {
          await SupabaseService.initialize();
        }

        final response = await SupabaseService.signIn(email: email, password: password);
        if (response != null && response.user != null) {
          final userId = response.user!.id;
          final profile = await SupabaseService.getUserProfile(userId);

          // Check if account is locked by admin (database.txt: is_locked boolean)
          if (profile != null && profile['is_locked'] == true) {
            if (mounted) {
              setState(() {
                _isLoading = false;
                _errorMessage = "* Tài khoản của bạn đã bị khóa bởi quản trị viên.";
              });
              AppToast.show(
                context,
                message: "Tài khoản của bạn đã bị khóa bởi quản trị viên.",
                type: ToastType.error,
              );
            }
            return;
          }

          debugPrint("Supabase login successful for user: ${response.user!.email}");
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
            AppToast.show(
              context,
              message: "Đăng nhập thành công! Chào mừng bạn quay trở lại.",
              type: ToastType.success,
            );
            _navigateToDashboard();
          }
          return;
        } else {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _errorMessage = "* Tên tài khoản hoặc mật khẩu không chính xác.";
            });
            AppToast.show(
              context,
              message: "Tên tài khoản hoặc mật khẩu không chính xác.",
              type: ToastType.error,
            );
          }
        }
      } catch (e) {
        debugPrint("Supabase auth error: $e");
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = "* Tên tài khoản hoặc mật khẩu không chính xác.";
          });
          AppToast.show(
            context,
            message: "Tên tài khoản hoặc mật khẩu không chính xác.",
            type: ToastType.error,
          );
        }
      }
    }
  }

  void _showSocialAuthMaintenanceMessage(String providerName) {
    AppToast.show(
      context,
      message: "Chức năng đăng nhập bằng $providerName hiện đang được bảo trì.",
      type: ToastType.info,
    );
  }

  @override
  void dispose() {
    _identityController.dispose();
    _passwordController.dispose();
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

              // Anchor Box App Logo Header with Hero tag
              Hero(
                tag: 'app_logo',
                child: Image.asset(
                  AppAssets.appLogo,
                  width: 140,
                  height: 110,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      width: 140,
                      height: 110,
                      decoration: BoxDecoration(
                        color: AppColors.brandBlue.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.brandBlue.withOpacity(0.3), width: 1.5),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.markunread_mailbox_outlined, size: 44, color: AppColors.brandBlue),
                          SizedBox(height: 4),
                          Text(
                            "Anchor Box",
                            style: TextStyle(
                              color: AppColors.brandBlue,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),

              // Title Section: Welcome back (Centered & Bold)
              const Align(
                alignment: Alignment.center,
                child: Text(
                  "WELCOME BACK",
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
                  "Đăng nhập để tăng tiện ích cho cuộc sống <3",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Input Form Section
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
                    const SizedBox(height: 8),
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
                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                        prefixIcon: const Icon(Icons.person_outline, size: 20, color: AppColors.textSecondary),
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

                    // Field 2: Mật Khẩu
                    const Text(
                      "Mật Khẩu",
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
                          return "Vui lòng nhập Mật khẩu";
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
                    const SizedBox(height: 10),

                    // Forgot Password Link
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: _navigateToForgotPassword,
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          "Quên mật khẩu?",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.brandBlue,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Red Error Banner (Above Login Button)
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

              // Button: Đăng Nhập
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
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
                          "Đăng Nhập",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            letterSpacing: 0.3,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 20),

              // Register Prompt: Bạn chưa có tài khoản? Đăng Ký
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    "Bạn chưa có tài khoản? ",
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (context) => const RegisterScreen()),
                      );
                    },
                    child: const Text(
                      "Đăng Ký",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.brandBlue,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // OR Divider Row
              Row(
                children: const [
                  Expanded(child: Divider(color: AppColors.cardBorder, thickness: 1)),
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
                  Expanded(child: Divider(color: AppColors.cardBorder, thickness: 1)),
                ],
              ),
              const SizedBox(height: 24),

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
                        onTap: () => _showSocialAuthMaintenanceMessage("Google"),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.g_mobiledata, size: 28, color: Color(0xFFEA4335)),
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
                            Icon(Icons.apple, size: 22, color: AppColors.textPrimary),
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
