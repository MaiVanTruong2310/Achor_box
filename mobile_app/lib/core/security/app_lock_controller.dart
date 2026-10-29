import 'package:flutter/foundation.dart';

import '../../services/app_lock_service.dart';

class AppLockController extends ChangeNotifier {
  /// Wrong PINs allowed before entry pauses; each further batch doubles it.
  static const maxAttempts = 5;
  static const _baseCooldown = Duration(seconds: 30);

  bool isPinEnabled = false;
  bool isBiometricEnabled = false;
  bool canUseBiometrics = false;
  bool isLocked = false;
  bool isLoading = true;

  int _failedAttempts = 0;
  DateTime? _blockedUntil;

  int get attemptsLeft => maxAttempts - _failedAttempts % maxAttempts;

  /// Remaining wait before another PIN may be tried, or null.
  Duration? get cooldown {
    final until = _blockedUntil;
    if (until == null) return null;
    final left = until.difference(DateTime.now());
    return left.isNegative ? null : left;
  }

  Future<void> initialize() async {
    await _readSettings();
    isLocked = isPinEnabled;
    isLoading = false;
    notifyListeners();
  }

  /// Re-reads the settings without locking, e.g. right after sign-in, when
  /// the password was just entered.
  Future<void> refresh() async {
    await _readSettings();
    notifyListeners();
  }

  Future<void> _readSettings() async {
    isPinEnabled = await AppLockService.isPinEnabled;
    isBiometricEnabled = await AppLockService.isBiometricEnabled;
    canUseBiometrics = await AppLockService.canUseBiometrics();
    if (!isPinEnabled) isBiometricEnabled = false;
    final failed = await AppLockService.readFailedAttempts();
    _failedAttempts = failed.count;
    _blockedUntil = failed.blockedUntil?.toLocal();
    // Only users who turned the lock on get the hidden app preview and the
    // screenshot block that come with it.
    await AppLockService.setSecureWindow(isPinEnabled);
  }

  void lock() {
    if (!isPinEnabled || isLocked) return;
    isLocked = true;
    notifyListeners();
  }

  void unlock() {
    isLocked = false;
    if (_failedAttempts > 0 || _blockedUntil != null) {
      _failedAttempts = 0;
      _blockedUntil = null;
      AppLockService.clearFailedAttempts();
    }
    notifyListeners();
  }

  /// Checks [pin] unless entry is paused. Returns true when it unlocked.
  /// The wrong-PIN count survives closing the app, so restarting it does
  /// not grant new attempts.
  Future<bool> tryPin(String pin) async {
    if (cooldown != null) return false;
    if (await AppLockService.verifyPin(pin)) {
      unlock();
      return true;
    }
    _failedAttempts++;
    if (_failedAttempts % maxAttempts == 0) {
      final rounds = _failedAttempts ~/ maxAttempts;
      _blockedUntil =
          DateTime.now().add(_baseCooldown * (1 << (rounds - 1).clamp(0, 6)));
    }
    await AppLockService.saveFailedAttempts(
        FailedPinState(_failedAttempts, _blockedUntil));
    notifyListeners();
    return false;
  }

  /// Called on sign-out: the next user starts unlocked with fresh settings.
  /// The signed-out user's stored attempt count stays on the phone.
  void reset() {
    isPinEnabled = false;
    isBiometricEnabled = false;
    isLocked = false;
    _failedAttempts = 0;
    _blockedUntil = null;
    AppLockService.setSecureWindow(false);
    notifyListeners();
  }
}

final globalAppLockController = AppLockController();
