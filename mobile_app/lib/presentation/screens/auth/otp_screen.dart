import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_assets.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/ios26_back_button.dart';
import '../home/main_layout.dart';
import 'reset_password_screen.dart';

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
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  bool _isVerifying = false;
  bool _isResending = false;
  int _resendCountdown = 60;
  Timer? _timer;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var focusNode in _focusNodes) {
      focusNode.dispose();
    }
    super.dispose();
  }

  void _startResendTimer() {
    setState(() {
      _resendCountdown = 60;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCountdown > 0) {
        if (mounted) {
          setState(() {
            _resendCountdown--;
          });
        }
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _handleResendOtp() async {
    if (_resendCountdown > 0 || _isResending) return;

    setState(() {
      _isResending = true;
      _errorMessage = null;
    });

    var success = false;
    try {
      await SupabaseService.sendEmailOtp(
        email: widget.email,
        isPasswordReset: widget.isPasswordReset,
      );
      success = true;
    } catch (_) {
      success = false;
    }

    if (mounted) {
      setState(() {
        _isResending = false;
      });

      if (success) {
        _startResendTimer();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Đã gửi lại mã OTP mới đến ${widget.email}"),
            backgroundColor: AppColors.brandBlue,
          ),
        );
      } else {
        setState(() {
          _errorMessage =
              "* Không thể gửi email OTP. Vui lòng kiểm tra lại địa chỉ Email.";
        });
      }
    }
  }

  Future<void> _verifyOtpCode() async {
    setState(() {
      _errorMessage = null;
    });

    final enteredCode = _controllers.map((c) => c.text.trim()).join();

    if (enteredCode.length < 6) {
      setState(() {
        _errorMessage = "* Vui lòng nhập đủ 6 chữ số mã OTP.";
      });
      return;
    }

    setState(() {
      _isVerifying = true;
    });

    try {
      await SupabaseService.verifyEmailOtp(
        email: widget.email,
        token: enteredCode,
        isPasswordReset: widget.isPasswordReset,
      );
      if (!mounted) return;
      setState(() {
        _isVerifying = false;
      });
      AppToast.show(
        context,
        message: widget.isPasswordReset
            ? "Xác thực OTP thành công! Vui lòng nhập mật khẩu mới."
            : "Xác thực OTP thành công! Đang đăng nhập...",
        type: ToastType.success,
      );

      if (widget.isPasswordReset) {
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) =>
                ResetPasswordScreen(email: widget.email),
            transitionsBuilder:
                (context, animation, secondaryAnimation, child) =>
                    FadeTransition(opacity: animation, child: child),
            transitionDuration: const Duration(milliseconds: 600),
          ),
        );
      } else {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const MainLayout()),
          (route) => false,
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isVerifying = false;
        _errorMessage = "* Mã OTP không chính xác hoặc đã hết hạn.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Back Button (Figma ← Back)
              const Ios26BackButton(),
              const SizedBox(height: 24),

              // Title OTP (Centered & Bold)
              const Align(
                alignment: Alignment.center,
                child: Text(
                  "OTP",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 44,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    letterSpacing: -1.0,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Description (Figma spec text)
              Text(
                "Chúng tôi đã gửi mã OTP bao gồm 6 chữ số về số điện thoại hoặc email do bạn đăng ký ! (${widget.email})",
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 36),

              // 6 PIN Input Boxes Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 46,
                    height: 54,
                    child: TextField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 1,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                      decoration: InputDecoration(
                        counterText: "",
                        contentPadding: EdgeInsets.zero,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: AppColors.cardBorder, width: 1.5),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: AppColors.brandBlue, width: 2.0),
                        ),
                        filled: true,
                        fillColor: Colors.white,
                      ),
                      onChanged: (value) {
                        if (_errorMessage != null) {
                          setState(() => _errorMessage = null);
                        }

                        if (value.isNotEmpty && index < 5) {
                          _focusNodes[index + 1].requestFocus();
                        } else if (value.isEmpty && index > 0) {
                          _focusNodes[index - 1].requestFocus();
                        }

                        // Auto verify if all 6 digits entered
                        if (_controllers.every((c) => c.text.isNotEmpty)) {
                          _verifyOtpCode();
                        }
                      },
                    ),
                  );
                }),
              ),
              const SizedBox(height: 28),

              // Resend OTP Link Section
              Center(
                child: Column(
                  children: [
                    const Text(
                      "Bạn chưa nhập được mã otp?",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextButton(
                      onPressed:
                          _resendCountdown == 0 ? _handleResendOtp : null,
                      child: Text(
                        _resendCountdown > 0
                            ? "Gửi lại mã ($_resendCountdown s)"
                            : "Gửi lại mã ngay",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _resendCountdown > 0
                              ? AppColors.textMuted
                              : AppColors.brandBlue,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

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

              // Submit Action Button ("Đăng Ký" / "Xác Nhận OTP")
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isVerifying ? null : _verifyOtpCode,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandBlue,
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isVerifying
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2.5),
                        )
                      : Text(
                          widget.isPasswordReset
                              ? "Xác Nhận OTP"
                              : "Xác Nhận Đăng Ký",
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 32),

              // Figma Centered Anchor Logo (Logo_anchor_box 1.png / AppAssets.appLogo)
              Center(
                child: Hero(
                  tag: 'app_logo_hero',
                  child: Image.asset(
                    AppAssets.appLogo,
                    width: 110,
                    height: 80,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Image.asset(
                      'assets/Logo_anchor_box 1.png',
                      width: 110,
                      height: 80,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
