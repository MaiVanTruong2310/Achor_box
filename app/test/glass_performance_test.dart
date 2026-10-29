import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_delivery_box/presentation/widgets/liquid_glass_container.dart';
import 'package:smart_delivery_box/presentation/widgets/neon_bubble_background.dart';

/// A page shaped like the legacy tabs: bubble background and glass cards.
/// Used to check that an idle screen stops rendering.
Widget _glassPage() {
  return MaterialApp(
    home: NeonBubbleBackground(
      child: ListView(
        children: [
          for (var i = 0; i < 6; i++)
            LiquidGlassContainer(
              padding: const EdgeInsets.all(16),
              child: Text('Card $i'),
            ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('idle glass screen stops scheduling frames', (tester) async {
    await tester.pumpWidget(_glassPage());
    // Throws if an endless animation keeps requesting frames.
    await tester.pumpAndSettle(const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate, const Duration(seconds: 5));
    expect(tester.binding.hasScheduledFrame, isFalse);
  });

  testWidgets('glass cards use no backdrop blur by default', (tester) async {
    await tester.pumpWidget(_glassPage());
    await tester.pump();
    expect(find.byType(BackdropFilter), findsNothing);
  });

  testWidgets('realBlur cards blur through a shared BackdropGroup',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: NeonBubbleBackground(
          child: Column(
            children: [
              for (var i = 0; i < 3; i++)
                LiquidGlassContainer(realBlur: true, child: Text('Blur $i')),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(BackdropFilter), findsNWidgets(3));
    expect(find.byType(BackdropGroup), findsOneWidget);
  });

  testWidgets('animated bubbles never rebuild the page content',
      (tester) async {
    var builds = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: NeonBubbleBackground(
          animate: true,
          child: Builder(builder: (context) {
            builds++;
            return const Text('content');
          }),
        ),
      ),
    );
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(tester.binding.hasScheduledFrame, isTrue);
    expect(builds, 1);
  });
}
