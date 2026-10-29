import 'package:shared_preferences/shared_preferences.dart';

abstract final class OnboardingStore {
  static const _key = 'onboarding_completed';

  static Future<bool> isCompleted() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      return preferences.getBool(_key) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> markCompleted() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setBool(_key, true);
    } catch (_) {}
  }
}
