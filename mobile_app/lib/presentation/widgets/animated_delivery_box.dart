import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// A code-drawn acrylic box with a door hinged on its vertical left edge.
class AnimatedDeliveryBox extends StatelessWidget {
  const AnimatedDeliveryBox({
    super.key,
    required this.openFraction,
    required this.holdProgress,
    required this.isOpen,
    required this.isBusy,
    required this.instruction,
  });

  final double openFraction;
  final double holdProgress;
  final bool isOpen;
  final bool isBusy;
  final String instruction;

  @override
  Widget build(BuildContext context) {
    // Same lock colors as Home: orange when open, green when locked. The
    // illustration sits directly on the caller's glass card.
    final accent = isOpen ? context.colors.unlocked : context.colors.locked;
    return SizedBox(
      width: double.infinity,
      height: 218,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          children: [
            Positioned.fill(
              child: TweenAnimationBuilder<double>(
                tween: Tween<double>(begin: 0, end: openFraction.clamp(0, 1)),
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                builder: (context, door, _) => CustomPaint(
                  painter: _DeliveryBoxPainter(door: door, accent: accent),
                ),
              ),
            ),
            Positioned(
              left: 18,
              right: 18,
              bottom: 13,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        isOpen ? Icons.lock_open_rounded : Icons.lock_rounded,
                        size: 15,
                        color: accent,
                      ),
                      const SizedBox(width: 7),
                      Flexible(
                        child: Text(
                          instruction,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                      if (isBusy) ...[
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 13,
                          height: 13,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: accent,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: holdProgress.clamp(0, 1),
                      minHeight: 3,
                      color: accent,
                      backgroundColor: Colors.white.withValues(alpha: 0.12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DeliveryBoxPainter extends CustomPainter {
  const _DeliveryBoxPainter({required this.door, required this.accent});

  final double door;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    Offset p(double x, double y) => Offset(size.width * x, size.height * y);
    Path quad(Offset a, Offset b, Offset c, Offset d) => Path()
      ..moveTo(a.dx, a.dy)
      ..lineTo(b.dx, b.dy)
      ..lineTo(c.dx, c.dy)
      ..lineTo(d.dx, d.dy)
      ..close();
    void fill(Path path, Color color) =>
        canvas.drawPath(path, Paint()..color = color);
    void stroke(Path path, Color color, double width) => canvas.drawPath(
          path,
          Paint()
            ..color = color
            ..style = PaintingStyle.stroke
            ..strokeWidth = width,
        );

    // Front: 300 x 220 proportions. The 220-deep body recedes up/right.
    final frontTopLeft = p(.28, .22);
    final frontTopRight = p(.79, .22);
    final frontBottomRight = p(.79, .74);
    final frontBottomLeft = p(.28, .74);
    final backTopLeft = p(.38, .11);
    final backTopRight = p(.89, .11);
    final backBottomRight = p(.89, .63);

    canvas.drawOval(
      Rect.fromCenter(center: p(.55, .79), width: size.width * .63, height: 13),
      Paint()
        ..color = Colors.black.withValues(alpha: .32)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );

    // Transparent acrylic top/right panels, with a dark interior for depth.
    fill(
      quad(backTopLeft, backTopRight, frontTopRight, frontTopLeft),
      const Color(0xFF82C7EB).withValues(alpha: .16),
    );
    fill(
      quad(frontTopRight, backTopRight, backBottomRight, frontBottomRight),
      const Color(0xFF75B7D8).withValues(alpha: .12),
    );
    final front = quad(
      frontTopLeft,
      frontTopRight,
      frontBottomRight,
      frontBottomLeft,
    );
    fill(front, const Color(0xFF061522));
    stroke(
      quad(backTopLeft, backTopRight, backBottomRight, frontBottomRight),
      const Color(0xFF8CD8FF).withValues(alpha: .5),
      1.5,
    );
    stroke(front, const Color(0xFF7EC7ED).withValues(alpha: .78), 2);

    // LCD and 4x4 keypad visible through the acrylic face, like the prototype.
    final lcd = RRect.fromRectAndRadius(
      Rect.fromLTWH(size.width * .35, size.height * .51, size.width * .18,
          size.height * .11),
      const Radius.circular(3),
    );
    canvas.drawRRect(lcd, Paint()..color = const Color(0xFF8DECCF));
    canvas.drawRRect(
      lcd,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = const Color(0xFF315574),
    );
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 4; col++) {
        final key = RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: p(.60 + col * .035, .51 + row * .046),
            width: size.width * .028,
            height: size.height * .034,
          ),
          const Radius.circular(2),
        );
        canvas.drawRRect(
          key,
          Paint()
            ..color =
                col == 3 ? const Color(0xFFB85F52) : const Color(0xFF2B709D),
        );
      }
    }

    // The left vertical edge is the hinge. The far edge swings left/outward.
    final swungTop = Offset.lerp(frontTopRight, p(.05, .15), door)!;
    final swungBottom = Offset.lerp(frontBottomRight, p(.05, .67), door)!;
    final acrylicDoor = quad(
      frontTopLeft,
      swungTop,
      swungBottom,
      frontBottomLeft,
    );
    fill(acrylicDoor, const Color(0xFFB7E4F6).withValues(alpha: .10));
    stroke(acrylicDoor, const Color(0xFFBDEBFF), 2);
    final shine = Path()
      ..moveTo(frontTopLeft.dx + 8, frontTopLeft.dy + 5)
      ..lineTo(swungBottom.dx - 8, swungBottom.dy - 8);
    stroke(shine, Colors.white.withValues(alpha: .16), 2);
    final handle = Offset.lerp(p(.75, .48), p(.09, .42), door)!;
    canvas.drawCircle(
      handle,
      7,
      Paint()
        ..color = accent.withValues(alpha: .95)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.3,
    );
    canvas.drawCircle(handle, 5, Paint()..color = const Color(0xFFDFEEF5));
    for (final y in [.33, .64]) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: p(.28, y), width: 5, height: 13),
          const Radius.circular(2),
        ),
        Paint()..color = const Color(0xFFD6EAF2),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DeliveryBoxPainter oldDelegate) =>
      (oldDelegate.door - door).abs() > 0.001 || oldDelegate.accent != accent;
}
