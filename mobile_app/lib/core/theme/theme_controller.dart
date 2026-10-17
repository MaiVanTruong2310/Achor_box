import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Global Theme Controller managing Light, Dark, and System Theme Modes.
/// Persists theme preference across application restarts using SharedPreferences.
class ThemeController extends ChangeNotifier {
  static const String _themePrefKey = 'user_theme_mode';

  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  bool get isDarkMode => _themeMode == ThemeMode.dark;

  ThemeController() {
    _loadThemeMode();
  }

  Future<void> _loadThemeMode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedIndex = prefs.getInt(_themePrefKey);
      if (savedIndex != null && savedIndex >= 0 && savedIndex < ThemeMode.values.length) {
        _themeMode = ThemeMode.values[savedIndex];
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Error loading saved theme mode: $e");
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) return;
    _themeMode = mode;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_themePrefKey, mode.index);
    } catch (e) {
      debugPrint("Error saving theme mode: $e");
    }
  }

  Future<void> toggleDarkMode(bool isDark) async {
    await setThemeMode(isDark ? ThemeMode.dark : ThemeMode.light);
  }
}

/// Global ThemeController instance accessible across the app
final ThemeController globalThemeController = ThemeController();
