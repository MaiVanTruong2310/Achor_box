import 'dart:async';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/localization/language_controller.dart';

enum AuthErrorKind {
  invalidCredentials,
  emailNotConfirmed,
  emailTaken,
  weakPassword,
  invalidCode,
  accountNotFound,
  rateLimited,
  network,
  unknown,
}

abstract final class AuthErrors {
  static AuthErrorKind classify(Object error) {
    if (error is SocketException ||
        error is TimeoutException ||
        error is AuthRetryableFetchException) {
      return AuthErrorKind.network;
    }
    if (error is! AuthException) return AuthErrorKind.unknown;

    final code = error.code ?? '';
    final message = error.message.toLowerCase();
    return switch (code) {
      'invalid_credentials' => AuthErrorKind.invalidCredentials,
      'email_not_confirmed' => AuthErrorKind.emailNotConfirmed,
      'user_already_exists' || 'email_exists' => AuthErrorKind.emailTaken,
      'weak_password' => AuthErrorKind.weakPassword,
      'otp_expired' => AuthErrorKind.invalidCode,
      'otp_disabled' || 'user_not_found' => AuthErrorKind.accountNotFound,
      'over_email_send_rate_limit' ||
      'over_request_rate_limit' =>
        AuthErrorKind.rateLimited,
      _ when message.contains('already registered') => AuthErrorKind.emailTaken,
      _ when message.contains('invalid login') =>
        AuthErrorKind.invalidCredentials,
      _ when message.contains('signups not allowed') =>
        AuthErrorKind.accountNotFound,
      _ when message.contains('expired') || message.contains('invalid') =>
        AuthErrorKind.invalidCode,
      _ => AuthErrorKind.unknown,
    };
  }

  /// Seconds to wait from a rate-limit message such as
  /// "you can only request this after 42 seconds".
  static int? retryAfterSeconds(Object error) {
    if (error is! AuthException) return null;
    final match = RegExp(r'after (\d+) seconds?').firstMatch(error.message);
    return match == null ? null : int.tryParse(match.group(1)!);
  }

  static String message(BuildContext context, Object error) {
    final wait = retryAfterSeconds(error);
    if (wait != null) {
      return context.tr(
        vi: 'Vui lòng đợi $wait giây rồi thử lại.',
        en: 'Please wait $wait seconds and try again.',
      );
    }
    return switch (classify(error)) {
      AuthErrorKind.invalidCredentials => context.tr(
          vi: 'Email hoặc mật khẩu không đúng.',
          en: 'Incorrect email or password.'),
      AuthErrorKind.emailNotConfirmed => context.tr(
          vi: 'Email chưa được xác nhận. Hãy nhập mã đã gửi tới hộp thư.',
          en: 'Your email is not confirmed yet. Enter the code we sent.'),
      AuthErrorKind.emailTaken => context.tr(
          vi: 'Email này đã có tài khoản. Hãy đăng nhập.',
          en: 'This email already has an account. Sign in instead.'),
      AuthErrorKind.weakPassword => context.tr(
          vi: 'Mật khẩu quá yếu. Hãy dùng mật khẩu dài hơn, có chữ và số.',
          en: 'Password is too weak. Use a longer one with letters and numbers.'),
      AuthErrorKind.invalidCode => context.tr(
          vi: 'Mã không đúng hoặc đã hết hạn.',
          en: 'The code is incorrect or has expired.'),
      AuthErrorKind.accountNotFound => context.tr(
          vi: 'Không tìm thấy tài khoản với email này.',
          en: 'No account was found for this email.'),
      AuthErrorKind.rateLimited => context.tr(
          vi: 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.',
          en: 'Too many attempts. Please wait a moment and try again.'),
      AuthErrorKind.network => context.tr(
          vi: 'Không có kết nối mạng. Hãy kiểm tra và thử lại.',
          en: 'No connection. Check your network and try again.'),
      AuthErrorKind.unknown => context.tr(
          vi: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
          en: 'Something went wrong. Please try again.'),
    };
  }
}
