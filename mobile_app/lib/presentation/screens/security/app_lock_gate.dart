import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../core/session/session_actions.dart';
import '../../../core/theme/app_theme.dart';
import '../../../services/app_lock_service.dart';
import '../../components/components.dart';
import '../auth/login_screen.dart';

/// Covers the whole app with the PIN screen while locked. Installed in
/// `MaterialApp.builder`, above the Navigator, so pushed pages and dialogs
/// are hidden too. The app underneath stays mounted (offstage), so tabs and
/// open pages keep their state after unlocking.
class AppLockGate extends StatefulWidget {
  final Widget child;
  const AppLockGate({super.key, required this.child});

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  final _lock = globalAppLockController;

  /// The system biometric sheet pauses the app; that must not re-lock it.
  bool _authenticating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lock.initialize().then((_) => _promptBiometrics());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_authenticating) return;
    if (state == AppLifecycleState.paused) _lock.lock();
    if (state == AppLifecycleState.resumed) _promptBiometrics();
  }

  Future<void> _promptBiometrics() async {
    if (!mounted ||
        _authenticating ||
        !_lock.isLocked ||
        !_lock.isBiometricEnabled ||
        _lock.cooldown != null) {
      return;
    }
    _authenticating = true;
    final success = await AppLockService.authenticateBiometric(
      context.tr(
          vi: 'Xác thực để mở Anchor Box',
          en: 'Authenticate to unlock Anchor Box'),
    );
    // Let the lifecycle events caused by the sheet pass first.
    await Future<void>.delayed(const Duration(milliseconds: 300));
    _authenticating = false;
    if (success) _lock.unlock();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _lock,
      builder: (context, _) {
        final covered = _lock.isLoading || _lock.isLocked;
        return Stack(
          fit: StackFit.expand,
          children: [
            Offstage(
              offstage: covered,
              child: TickerMode(enabled: !covered, child: widget.child),
            ),
            if (_lock.isLoading)
              const AppBackdrop(child: SizedBox.expand())
            else if (_lock.isLocked)
              _LockScreen(
                controller: _lock,
                onBiometric: _promptBiometrics,
              ),
          ],
        );
      },
    );
  }
}

class _LockScreen extends StatefulWidget {
  final AppLockController controller;
  final VoidCallback onBiometric;

  const _LockScreen({required this.controller, required this.onBiometric});

  @override
  State<_LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<_LockScreen>
    with SingleTickerProviderStateMixin {
  static const _length = 6;

  late final AnimationController _shake = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );
  Timer? _cooldownTicker;
  String _pin = '';
  bool _verifying = false;
  bool _wrong = false;
  bool _confirmForgot = false;
  bool _signingOut = false;

  AppLockController get _lock => widget.controller;

  @override
  void initState() {
    super.initState();
    _startCooldownTicker();
  }

  @override
  void dispose() {
    _shake.dispose();
    _cooldownTicker?.cancel();
    super.dispose();
  }

  /// Repaints the countdown each second while entry is paused.
  void _startCooldownTicker() {
    _cooldownTicker?.cancel();
    if (_lock.cooldown == null) return;
    _cooldownTicker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_lock.cooldown == null) timer.cancel();
      setState(() {});
    });
  }

  Future<void> _press(String digit) async {
    if (_verifying || _pin.length >= _length || _lock.cooldown != null) return;
    HapticFeedback.selectionClick();
    setState(() {
      _wrong = false;
      _pin += digit;
    });
    if (_pin.length < _length) return;

    setState(() => _verifying = true);
    final unlocked = await _lock.tryPin(_pin);
    if (!mounted || unlocked) return;
    HapticFeedback.heavyImpact();
    _shake.forward(from: 0);
    setState(() {
      _verifying = false;
      _wrong = true;
      _pin = '';
    });
    _startCooldownTicker();
  }

  void _delete() {
    if (_pin.isEmpty || _verifying) return;
    HapticFeedback.selectionClick();
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  /// A forgotten PIN is reset by proving identity again with the password:
  /// the PIN is removed for this account and the user signs in again.
  Future<void> _forgotPin() async {
    setState(() => _signingOut = true);
    await AppLockService.disablePin();
    await signOutAndClearSession();
    appNavigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  String _message() {
    final wait = _lock.cooldown;
    if (wait != null) {
      final seconds = wait.inSeconds + 1;
      return context.tr(
        vi: 'Nhập sai quá nhiều lần. Thử lại sau $seconds giây.',
        en: 'Too many attempts. Try again in ${seconds}s.',
      );
    }
    if (_wrong) {
      final left = _lock.attemptsLeft;
      return context.tr(
        vi: 'Sai mã PIN. Còn $left lần thử.',
        en: 'Wrong PIN. $left attempts left.',
      );
    }
    return context.tr(
        vi: 'Nhập mã PIN 6 số để tiếp tục',
        en: 'Enter your 6-digit PIN to continue');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: AppBackdrop(
        child: Builder(builder: (context) {
          final colors = context.colors;
          final blocked = _lock.cooldown != null;
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xl,
                  vertical: AppSpacing.lg,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 360),
                  child: Column(
                    children: [
                      const BrandLogo(height: 56),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        context.tr(vi: 'Nhập mã PIN', en: 'Enter PIN'),
                        style: context.text.headlineSmall,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          _message(),
                          textAlign: TextAlign.center,
                          style: context.text.bodyMedium?.copyWith(
                            color: _wrong || blocked
                                ? colors.alert
                                : colors.textSecondary,
                            fontWeight:
                                _wrong || blocked ? FontWeight.w600 : null,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      AnimatedBuilder(
                        animation: _shake,
                        builder: (context, child) {
                          final t = _shake.value;
                          final dx = math.sin(t * math.pi * 6) * 12 * (1 - t);
                          return Transform.translate(
                            offset: Offset(dx, 0),
                            child: child,
                          );
                        },
                        child: _PinDots(
                          filled: _pin.length,
                          length: _length,
                          error: _wrong,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      _Keypad(
                        enabled: !blocked && !_verifying && !_signingOut,
                        onDigit: _press,
                        onDelete: _pin.isEmpty ? null : _delete,
                        onBiometric: _lock.isBiometricEnabled && !blocked
                            ? widget.onBiometric
                            : null,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      if (_confirmForgot)
                        _ForgotPinConfirm(
                          busy: _signingOut,
                          onConfirm: _forgotPin,
                          onCancel: () =>
                              setState(() => _confirmForgot = false),
                        )
                      else
                        TextButton(
                          onPressed: () =>
                              setState(() => _confirmForgot = true),
                          child: Text(context.tr(
                              vi: 'Quên mã PIN?', en: 'Forgot PIN?')),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _PinDots extends StatelessWidget {
  final int filled;
  final int length;
  final bool error;

  const _PinDots({
    required this.filled,
    required this.length,
    required this.error,
  });

  @override
  Widget build(BuildContext context) {
    final color = error ? context.colors.alert : Colors.white;
    return Semantics(
      label: '$filled / $length',
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < length; i++)
            AnimatedContainer(
              duration: AppDurations.fast,
              width: 14,
              height: 14,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: i < filled ? color : Colors.transparent,
                border: Border.all(color: color, width: 1.5),
              ),
            ),
        ],
      ),
    );
  }
}

/// iOS passcode style keypad of round glass keys.
class _Keypad extends StatelessWidget {
  final bool enabled;
  final ValueChanged<String> onDigit;
  final VoidCallback? onDelete;
  final VoidCallback? onBiometric;

  const _Keypad({
    required this.enabled,
    required this.onDigit,
    required this.onDelete,
    required this.onBiometric,
  });

  static const _letters = {
    '2': 'ABC',
    '3': 'DEF',
    '4': 'GHI',
    '5': 'JKL',
    '6': 'MNO',
    '7': 'PQRS',
    '8': 'TUV',
    '9': 'WXYZ',
  };

  Widget _digit(String digit) => _KeyButton(
        onTap: enabled ? () => onDigit(digit) : null,
        semanticLabel: digit,
        glass: true,
        child: Builder(builder: (context) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                digit,
                style: context.text.headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w400, height: 1.1),
              ),
              if (_letters[digit] case final letters?)
                Text(
                  letters,
                  style: context.text.labelSmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.8),
                    letterSpacing: 1.5,
                  ),
                ),
            ],
          );
        }),
      );

  @override
  Widget build(BuildContext context) {
    final rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ];
    return Column(
      children: [
        for (final row in rows) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [for (final digit in row) _digit(digit)],
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _KeyButton(
              onTap: onBiometric,
              semanticLabel: context.tr(
                  vi: 'Mở khóa bằng vân tay', en: 'Unlock with fingerprint'),
              child: onBiometric == null
                  ? const SizedBox.shrink()
                  : const Icon(Icons.fingerprint_rounded,
                      size: 34, color: Colors.white),
            ),
            _digit('0'),
            _KeyButton(
              onTap: onDelete,
              semanticLabel: context.tr(vi: 'Xóa', en: 'Delete'),
              child: onDelete == null
                  ? const SizedBox.shrink()
                  : const Icon(Icons.backspace_outlined,
                      size: 26, color: Colors.white),
            ),
          ],
        ),
      ],
    );
  }
}

class _KeyButton extends StatelessWidget {
  static const double size = 78;

  final VoidCallback? onTap;
  final String semanticLabel;
  final bool glass;
  final Widget child;

  const _KeyButton({
    required this.onTap,
    required this.semanticLabel,
    required this.child,
    this.glass = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = SizedBox.square(
      dimension: size,
      child: Center(child: child),
    );
    return Semantics(
      button: onTap != null,
      label: semanticLabel,
      excludeSemantics: true,
      child: glass
          ? GlassSurface(capsule: true, onTap: onTap, child: content)
          : InkResponse(
              onTap: onTap,
              radius: size / 2,
              child: content,
            ),
    );
  }
}

class _ForgotPinConfirm extends StatelessWidget {
  final bool busy;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  const _ForgotPinConfirm({
    required this.busy,
    required this.onConfirm,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Builder(builder: (context) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.tr(
                vi: 'Bạn sẽ được đăng xuất. Đăng nhập lại bằng mật khẩu rồi tạo mã PIN mới trong Bảo mật.',
                en: 'You will be signed out. Sign in with your password, then create a new PIN in Security.',
              ),
              style: context.text.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            AppButton.destructive(
              label: context.tr(vi: 'Đăng xuất', en: 'Sign out'),
              isLoading: busy,
              onPressed: onConfirm,
            ),
            const SizedBox(height: AppSpacing.xs),
            AppButton(
              variant: AppButtonVariant.plain,
              label: context.tr(vi: 'Hủy', en: 'Cancel'),
              onPressed: busy ? null : onCancel,
            ),
          ],
        );
      }),
    );
  }
}
