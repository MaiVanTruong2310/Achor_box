import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_delivery_box/core/localization/language_controller.dart';

class _CachedTab extends StatelessWidget {
  const _CachedTab();

  @override
  Widget build(BuildContext context) =>
      Text(context.tr(vi: 'Thiết bị', en: 'Devices'));
}

void main() {
  testWidgets('cached const tabs switch language without delay',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await globalLanguageController.setLanguage('vi');

    // Mirrors MainLayout: tab widgets created once and kept in a stack.
    const tabs = [_CachedTab()];
    await tester.pumpWidget(ListenableBuilder(
      listenable: globalLanguageController,
      builder: (context, _) => MaterialApp(
        locale: globalLanguageController.locale,
        supportedLocales: const [Locale('vi'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const IndexedStack(children: tabs),
      ),
    ));
    expect(find.text('Thiết bị'), findsOneWidget);

    await globalLanguageController.setLanguage('en');
    await tester.pumpAndSettle();
    expect(find.text('Devices'), findsOneWidget);

    await globalLanguageController.setLanguage('vi');
    await tester.pumpAndSettle();
    expect(find.text('Thiết bị'), findsOneWidget);
  });
}
