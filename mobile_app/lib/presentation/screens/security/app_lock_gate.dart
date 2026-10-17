import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../services/app_lock_service.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';

class AppLockGate extends StatefulWidget {
  final Widget child;
  const AppLockGate({super.key, required this.child});

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  String _pin = '';
  bool _invalid = false;
  bool _authenticating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    globalAppLockController.initialize().then((_) {
      if (mounted &&
          globalAppLockController.isLocked &&
          globalAppLockController.isBiometricEnabled) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _useBiometrics());
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused && !_authenticating)
      globalAppLockController.lock();
  }

  Future<void> _digit(String digit) async {
    if (_pin.length >= 6) return;
    setState(() {
      _invalid = false;
      _pin += digit;
    });
    if (_pin.length == 6) {
      if (await AppLockService.verifyPin(_pin)) {
        globalAppLockController.unlock();
        if (mounted) setState(() => _pin = '');
      } else if (mounted) {
        setState(() {
          _invalid = true;
          _pin = '';
        });
      }
    }
  }

  Future<void> _useBiometrics() async {
    if (_authenticating || !globalAppLockController.isBiometricEnabled) return;
    _authenticating = true;
    final success = await AppLockService.authenticateBiometric(
      context.tr(
          vi: 'Xác thực để mở Anchor Box',
          en: 'Authenticate to unlock Anchor Box'),
    );
    _authenticating = false;
    if (success) globalAppLockController.unlock();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: globalAppLockController,
      builder: (context, child) {
        if (globalAppLockController.isLoading) {
          return const Scaffold(
              body: Center(child: CircularProgressIndicator()));
        }
        if (!globalAppLockController.isLocked) return widget.child;
        return _lockScreen();
      },
    );
  }

  Widget _lockScreen() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.brandBlue.withValues(alpha: 0.14)),
                    child: const Icon(Icons.lock_rounded,
                        color: AppColors.brandBlue, size: 34),
                  ),
                  const SizedBox(height: 20),
                  Text(context.tr(vi: 'Nhập mã PIN', en: 'Enter PIN'),
                      style: TextStyle(
                          fontSize: 25,
                          fontWeight: FontWeight.w700,
                          color: primary)),
                  const SizedBox(height: 7),
                  Text(
                    _invalid
                        ? context.tr(
                            vi: 'Mã PIN không đúng. Hãy thử lại.',
                            en: 'Incorrect PIN. Try again.')
                        : context.tr(
                            vi: 'Nhập mã PIN gồm 6 chữ số',
                            en: 'Enter your 6-digit PIN'),
                    style: TextStyle(
                        color: _invalid
                            ? Colors.redAccent
                            : primary.withValues(alpha: 0.58),
                        fontSize: 13),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                        6,
                        (index) => AnimatedContainer(
                              duration: const Duration(milliseconds: 160),
                              width: 13,
                              height: 13,
                              margin: const EdgeInsets.symmetric(horizontal: 7),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: index < _pin.length
                                    ? AppColors.brandBlue
                                    : Colors.transparent,
                                border: Border.all(
                                    color: index < _pin.length
                                        ? AppColors.brandBlue
                                        : primary.withValues(alpha: 0.35),
                                    width: 1.4),
                              ),
                            )),
                  ),
                  const SizedBox(height: 28),
                  LiquidGlassContainer(
                    borderRadius: 30,
                    blur: 24,
                    tintOpacity: 0.12,
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        for (final row in const [
                          ['1', '2', '3'],
                          ['4', '5', '6'],
                          ['7', '8', '9']
                        ])
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceEvenly,
                                children: row.map(_numberButton).toList()),
                          ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _roundAction(
                              globalAppLockController.isBiometricEnabled
                                  ? Icons.fingerprint_rounded
                                  : null,
                              globalAppLockController.isBiometricEnabled
                                  ? _useBiometrics
                                  : null,
                            ),
                            _numberButton('0'),
                            _roundAction(
                                Icons.backspace_outlined,
                                _pin.isEmpty
                                    ? null
                                    : () => setState(() => _pin =
                                        _pin.substring(0, _pin.length - 1))),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _numberButton(String number) =>
      _roundAction(null, () => _digit(number), label: number);

  Widget _roundAction(IconData? icon, VoidCallback? onTap, {String? label}) {
    return SizedBox(
      width: 70,
      height: 58,
      child: InkWell(
        borderRadius: BorderRadius.circular(29),
        onTap: onTap,
        child: Center(
          child: label != null
              ? Text(label,
                  style: const TextStyle(
                      fontSize: 24, fontWeight: FontWeight.w600))
              : icon == null
                  ? const SizedBox.shrink()
                  : Icon(icon, size: 27),
        ),
      ),
    );
  }
}
