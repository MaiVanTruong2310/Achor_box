import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
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
    await setBiometricEnabled(false);
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
