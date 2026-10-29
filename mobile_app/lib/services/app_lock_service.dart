import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import 'supabase_service.dart';

class AppLockService {
  static const _storage = FlutterSecureStorage();
  static final _auth = LocalAuthentication();

  static String get _prefix =>
      'app_lock_${SupabaseService.currentUser?.id ?? 'guest'}';
  static String get _pinHashKey => '${_prefix}_pin_hash';
  static String get _pinSaltKey => '${_prefix}_pin_salt';
  static String get _biometricKey => '${_prefix}_biometric';
  static String get _attemptsKey => '${_prefix}_failed_attempts';

  static Future<bool> get isPinEnabled async =>
      (await _storage.read(key: _pinHashKey)) != null;
  static Future<bool> get isBiometricEnabled async =>
      (await _storage.read(key: _biometricKey)) == 'true';

  static Future<bool> canUseBiometrics() async {
    try {
      return await _auth.isDeviceSupported() && await _auth.canCheckBiometrics;
    } catch (_) {
      return false;
    }
  }

  static Future<List<BiometricType>> availableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return const [];
    }
  }

  static Future<void> setPin(String pin) async {
    if (!RegExp(r'^\d{6}$').hasMatch(pin))
      throw ArgumentError('PIN must contain 6 digits');
    final random = Random.secure();
    final salt =
        base64UrlEncode(List<int>.generate(24, (_) => random.nextInt(256)));
    await _storage.write(key: _pinSaltKey, value: salt);
    await _storage.write(key: _pinHashKey, value: _hash(pin, salt));
  }

  static Future<bool> verifyPin(String pin) async {
    final salt = await _storage.read(key: _pinSaltKey);
    final expected = await _storage.read(key: _pinHashKey);
    if (salt == null || expected == null) return false;
    return _constantTimeEquals(_hash(pin, salt), expected);
  }

  static Future<void> disablePin() async {
    await _storage.delete(key: _pinHashKey);
    await _storage.delete(key: _pinSaltKey);
    await clearFailedAttempts();
    await setBiometricEnabled(false);
  }

  /// Wrong-PIN count and pause, kept in secure storage so closing the app
  /// does not reset them.
  static Future<FailedPinState> readFailedAttempts() async {
    try {
      final raw = await _storage.read(key: _attemptsKey);
      if (raw == null) return const FailedPinState(0, null);
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return FailedPinState(
        json['count'] as int? ?? 0,
        DateTime.tryParse(json['blocked_until']?.toString() ?? ''),
      );
    } catch (error) {
      debugPrint('Read failed PIN attempts error: $error');
      return const FailedPinState(0, null);
    }
  }

  static Future<void> saveFailedAttempts(FailedPinState state) async {
    try {
      await _storage.write(
        key: _attemptsKey,
        value: jsonEncode({
          'count': state.count,
          'blocked_until': state.blockedUntil?.toUtc().toIso8601String(),
        }),
      );
    } catch (error) {
      debugPrint('Save failed PIN attempts error: $error');
    }
  }

  static Future<void> clearFailedAttempts() =>
      _storage.delete(key: _attemptsKey);

  static const _secureWindow = MethodChannel('anchor_box/secure_window');

  /// Hides the app from the recent-apps preview and blocks screenshots
  /// (Android FLAG_SECURE). No-op on other platforms.
  static Future<void> setSecureWindow(bool secure) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _secureWindow.invokeMethod<void>('setSecure', secure);
    } catch (error) {
      debugPrint('Set secure window error: $error');
    }
  }

  static Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(key: _biometricKey, value: enabled.toString());
  }

  static Future<bool> authenticateBiometric(String reason) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } catch (error) {
      debugPrint('Biometric authentication error: $error');
      return false;
    }
  }

  static String _hash(String pin, String salt) =>
      sha256.convert(utf8.encode('$salt:$pin')).toString();

  static bool _constantTimeEquals(String left, String right) {
    if (left.length != right.length) return false;
    var difference = 0;
    for (var i = 0; i < left.length; i++) {
      difference |= left.codeUnitAt(i) ^ right.codeUnitAt(i);
    }
    return difference == 0;
  }
}

class FailedPinState {
  final int count;
  final DateTime? blockedUntil;
  const FailedPinState(this.count, this.blockedUntil);
}
