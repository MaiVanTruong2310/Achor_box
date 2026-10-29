import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/localization/language_controller.dart';
import 'core/preferences/onboarding_store.dart';
import 'core/session/session_actions.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/auth/onboarding_screen.dart';
import 'presentation/screens/home/main_layout.dart';
import 'presentation/screens/security/app_lock_gate.dart';
import 'services/supabase_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await SupabaseService.initialize()
        .timeout(const Duration(seconds: 3), onTimeout: () => false);
  } catch (error) {
    debugPrint('Supabase init error: $error');
  }
  final onboardingCompleted = await OnboardingStore.isCompleted();

  runApp(SmartBoxApp(
    isLoggedIn: SupabaseService.hasActiveSession,
    onboardingCompleted: onboardingCompleted,
  ));
}

class SmartBoxApp extends StatelessWidget {
  final bool isLoggedIn;
  final bool onboardingCompleted;

  const SmartBoxApp({
    super.key,
    required this.isLoggedIn,
    this.onboardingCompleted = false,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([
        globalThemeController,
        globalLanguageController,
      ]),
      builder: (context, child) {
        return MaterialApp(
          title: 'Anchor Box',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: globalThemeController.themeMode,
          locale: globalLanguageController.locale,
          supportedLocales: const [Locale('vi'), Locale('en')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          navigatorKey: appNavigatorKey,
          // Above the Navigator, so the PIN screen also hides pushed pages.
          builder: (context, child) => AppLockGate(child: child!),
          home: isLoggedIn
              ? const MainLayout()
              : onboardingCompleted
                  ? const LoginScreen()
                  : const OnboardingScreen(),
        );
      },
    );
  }
}
