import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'core/localization/language_controller.dart';
import 'presentation/screens/auth/onboarding_screen.dart';
import 'presentation/screens/home/main_layout.dart';
import 'presentation/screens/security/app_lock_gate.dart';
import 'services/supabase_service.dart';

void main() async {
  debugPrint("1. APP STARTING...");

  WidgetsFlutterBinding.ensureInitialized();
  debugPrint("2. FLUTTER BINDING INITIALIZED");

  // Initialize Supabase with 3-second timeout protection
  bool isLoggedIn = false;
  try {
    await SupabaseService.initialize().timeout(
      const Duration(seconds: 3),
      onTimeout: () {
        debugPrint("3. SUPABASE INIT TIMED OUT - PROCEEDING WITH APP LAUNCH.");
        return false;
      },
    );
    isLoggedIn = SupabaseService.hasActiveSession;
    debugPrint("3. SUPABASE INITIALIZATION COMPLETE - LOGGED IN: $isLoggedIn");
  } catch (e) {
    debugPrint("3. SUPABASE INIT ERROR: $e");
  }

  debugPrint("4. RUNNING APP UI (isLoggedIn: $isLoggedIn)...");
  runApp(SmartBoxApp(isLoggedIn: isLoggedIn));
}

class SmartBoxApp extends StatelessWidget {
  final bool isLoggedIn;

  const SmartBoxApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([
        globalThemeController,
        globalLanguageController,
      ]),
      builder: (context, child) {
        return MaterialApp(
          title: 'Smart Delivery Box',
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
          home: isLoggedIn
              ? const AppLockGate(child: MainLayout())
              : const OnboardingScreen(),
        );
      },
    );
  }
}
