import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_delivery_box/core/utils/form_validators.dart';
import 'package:smart_delivery_box/services/auth_errors.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  group('AuthErrors.classify', () {
    AuthErrorKind kind(String message, {String? code}) =>
        AuthErrors.classify(AuthException(message, code: code));

    test('uses Supabase error codes', () {
      expect(kind('x', code: 'invalid_credentials'),
          AuthErrorKind.invalidCredentials);
      expect(kind('x', code: 'email_not_confirmed'),
          AuthErrorKind.emailNotConfirmed);
      expect(kind('x', code: 'user_already_exists'), AuthErrorKind.emailTaken);
      expect(kind('x', code: 'weak_password'), AuthErrorKind.weakPassword);
      expect(kind('x', code: 'otp_expired'), AuthErrorKind.invalidCode);
      expect(kind('x', code: 'otp_disabled'), AuthErrorKind.accountNotFound);
      expect(kind('x', code: 'over_email_send_rate_limit'),
          AuthErrorKind.rateLimited);
    });

    test('falls back to the message when there is no code', () {
      expect(kind('User already registered'), AuthErrorKind.emailTaken);
      expect(
          kind('Invalid login credentials'), AuthErrorKind.invalidCredentials);
      expect(
          kind('Signups not allowed for otp'), AuthErrorKind.accountNotFound);
      expect(
          kind('Token has expired or is invalid'), AuthErrorKind.invalidCode);
    });

    test('detects network failures', () {
      expect(AuthErrors.classify(const SocketException('offline')),
          AuthErrorKind.network);
      expect(AuthErrors.classify(AuthRetryableFetchException()),
          AuthErrorKind.network);
    });

    test('reads the wait time of rate-limit errors', () {
      expect(
        AuthErrors.retryAfterSeconds(const AuthException(
          'For security purposes, you can only request this after 42 seconds.',
          code: 'over_email_send_rate_limit',
        )),
        42,
      );
      expect(AuthErrors.retryAfterSeconds(const AuthException('nope')), isNull);
      expect(AuthErrors.retryAfterSeconds(StateError('x')), isNull);
    });

    test('anything else is unknown', () {
      expect(AuthErrors.classify(StateError('boom')), AuthErrorKind.unknown);
      expect(kind('Database error saving new user'), AuthErrorKind.unknown);
    });
  });

  group('FormValidators', () {
    test('isEmail', () {
      expect(FormValidators.isEmail('mai@example.com'), isTrue);
      expect(FormValidators.isEmail('  mai@example.com '), isTrue);
      expect(FormValidators.isEmail('mai@example'), isFalse);
      expect(FormValidators.isEmail('mai example.com'), isFalse);
    });

    test('isStrongEnough requires length, letters and digits', () {
      expect(FormValidators.isStrongEnough('anchor2026'), isTrue);
      expect(FormValidators.isStrongEnough('short1'), isFalse);
      expect(FormValidators.isStrongEnough('onlyletters'), isFalse);
      expect(FormValidators.isStrongEnough('12345678'), isFalse);
    });
  });
}
