import 'package:flutter/widgets.dart';

import '../localization/language_controller.dart';

abstract final class FormValidators {
  static const int minPasswordLength = 8;
  static final RegExp _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  static bool isEmail(String value) => _email.hasMatch(value.trim());

  static bool isStrongEnough(String password) =>
      password.length >= minPasswordLength &&
      RegExp(r'[A-Za-z]').hasMatch(password) &&
      RegExp(r'[0-9]').hasMatch(password);

  static FormFieldValidator<String> email(BuildContext context) => (value) {
        if (value == null || value.trim().isEmpty) {
          return context.tr(
              vi: 'Vui lòng nhập email.', en: 'Enter your email.');
        }
        if (!isEmail(value)) {
          return context.tr(
              vi: 'Email không hợp lệ.', en: 'Enter a valid email address.');
        }
        return null;
      };

  static FormFieldValidator<String> requiredText(
    BuildContext context, {
    required String vi,
    required String en,
  }) =>
      (value) => value == null || value.trim().isEmpty
          ? context.tr(vi: vi, en: en)
          : null;

  static FormFieldValidator<String> currentPassword(BuildContext context) =>
      (value) => value == null || value.isEmpty
          ? context.tr(
              vi: 'Vui lòng nhập mật khẩu.', en: 'Enter your password.')
          : null;

  static FormFieldValidator<String> newPassword(BuildContext context) =>
      (value) {
        if (value == null || !isStrongEnough(value)) {
          return context.tr(
            vi: 'Tối thiểu $minPasswordLength ký tự, gồm cả chữ và số.',
            en: 'At least $minPasswordLength characters with letters and numbers.',
          );
        }
        return null;
      };

  /// Optional phone: empty, or 9-15 digits with an optional leading `+`
  /// and spaces, dots or dashes between groups.
  static FormFieldValidator<String> optionalPhone(BuildContext context) =>
      (value) {
        final text = value?.trim() ?? '';
        if (text.isEmpty) return null;
        final digits = text.replaceAll(RegExp(r'[\s.-]'), '');
        return RegExp(r'^\+?\d{9,15}$').hasMatch(digits)
            ? null
            : context.tr(
                vi: 'Số điện thoại không hợp lệ.',
                en: 'Enter a valid phone number.');
      };

  static FormFieldValidator<String> matches(
    BuildContext context,
    TextEditingController other,
  ) =>
      (value) => value != other.text
          ? context.tr(
              vi: 'Mật khẩu xác nhận không khớp.',
              en: 'Passwords do not match.')
          : null;
}
