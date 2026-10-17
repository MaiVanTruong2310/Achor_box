import 'package:flutter/foundation.dart';

import '../../services/app_lock_service.dart';

class AppLockController extends ChangeNotifier {
  bool isPinEnabled = false;
  bool isBiometricEnabled = false;
  bool canUseBiometrics = false;
  bool isLocked = false;
  bool isLoading = true;

  Future<void> initialize() async {
    isPinEnabled = await AppLockService.isPinEnabled;
    isBiometricEnabled = await AppLockService.isBiometricEnabled;
    canUseBiometrics = await AppLockService.canUseBiometrics();
    if (!isPinEnabled) isBiometricEnabled = false;
    isLocked = isPinEnabled;
    isLoading = false;
    notifyListeners();
  }

  Future<void> refresh() async {
    isPinEnabled = await AppLockService.isPinEnabled;
    isBiometricEnabled = await AppLockService.isBiometricEnabled;
    canUseBiometrics = await AppLockService.canUseBiometrics();
    notifyListeners();
  }

  void lock() {
    if (!isPinEnabled || isLocked) return;
    isLocked = true;
    notifyListeners();
  }

  void unlock() {
    isLocked = false;
    notifyListeners();
  }
}

final globalAppLockController = AppLockController();
