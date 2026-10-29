import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageController extends ChangeNotifier {
  static const _preferenceKey = 'user_language_code';

  Locale _locale = const Locale('vi');

  Locale get locale => _locale;
  bool get isEnglish => _locale.languageCode == 'en';

  LanguageController() {
    _load();
  }

  Future<void> _load() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final code = preferences.getString(_preferenceKey);
      if (code == 'en' || code == 'vi') {
        _locale = Locale(code!);
        notifyListeners();
      }
    } catch (error) {
      debugPrint('Error loading language: $error');
    }
  }

  Future<void> setLanguage(String languageCode) async {
    if (languageCode != 'en' && languageCode != 'vi') return;
    if (_locale.languageCode == languageCode) return;

    _locale = Locale(languageCode);
    notifyListeners();

    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(_preferenceKey, languageCode);
    } catch (error) {
      debugPrint('Error saving language: $error');
    }
  }
}

final LanguageController globalLanguageController = LanguageController();

extension AppTranslation on BuildContext {
  /// Also subscribes the calling widget to the app's [Localizations], so it
  /// rebuilds as soon as the language changes, even when it is a cached or
  /// `const` widget (e.g. a tab kept alive by the main layout). Do not call
  /// it from `initState` or `dispose`.
  String tr({required String vi, required String en}) {
    Localizations.maybeLocaleOf(this);
    return globalLanguageController.isEnglish ? en : vi;
  }
}
