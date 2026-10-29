import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/device_serial.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import 'wifi_provisioning_screen.dart';

/// Full-screen QR scanner that claims a box by its serial, then hands over
/// to Wi-Fi provisioning. Pops with `{id, name, serial}` once a box is added.
class AddDeviceQrScreen extends StatefulWidget {
  const AddDeviceQrScreen({super.key});

  @override
  State<AddDeviceQrScreen> createState() => _AddDeviceQrScreenState();
}

class _AddDeviceQrScreenState extends State<AddDeviceQrScreen>
    with SingleTickerProviderStateMixin {
  late final MobileScannerController _scannerController;
  late final AnimationController _scanLine;
  bool _isTorchOn = false;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _scannerController = MobileScannerController(
      formats: const [BarcodeFormat.qrCode],
      detectionSpeed: DetectionSpeed.noDuplicates,
      autoZoom: true,
    );
    _scanLine = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _scanLine.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _toggleTorch() async {
    await _scannerController.toggleTorch();
    if (mounted) setState(() => _isTorchOn = !_isTorchOn);
  }

  Future<void> _handleCapture(BarcodeCapture capture) async {
    if (_isProcessing) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();
      if (value == null || value.isEmpty) continue;
      final serial = normalizeDeviceSerial(value);
      if (!isValidDeviceSerial(serial)) {
        if (!mounted) return;
        AppToast.show(
          context,
          message: context.tr(
            vi: 'Mã QR này không phải của hộp Anchor Box. Hãy quét mã DBX-... trên hộp.',
            en: 'This QR code is not an Anchor Box code. Scan the DBX-... code on the box.',
          ),
          type: ToastType.error,
        );
        return;
      }
      await _addBox(serial);
      return;
    }
  }

  Future<void> _showManualEntry() async {
    final serial = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _ManualSerialSheet(),
    );
    if (serial != null && mounted) await _addBox(serial);
  }

  /// Ownership is assigned server-side from auth.uid(); success is only
  /// reported when the RPC returns a row owned by the current user.
  Future<void> _addBox(String serial) async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);
    await HapticFeedback.mediumImpact();
    final device = await SupabaseService.claimDeviceBySerial(serial);
    if (!mounted) return;

    if (device == null) {
      setState(() => _isProcessing = false);
      AppToast.show(
        context,
        message: SupabaseService.lastDevicePairingError ??
            context.tr(
                vi: 'Không thể thêm hộp. Hãy thử lại.',
                en: 'Could not add the box. Please try again.'),
        type: ToastType.error,
      );
      return;
    }

    final boxSerial = device['serial_number']?.toString() ?? serial;
    AppToast.show(
      context,
      message: context.tr(
          vi: 'Đã thêm hộp $boxSerial vào tài khoản.',
          en: 'Box $boxSerial was added to your account.'),
      type: ToastType.success,
    );

    // The camera is not needed past this point.
    await _scannerController.stop();
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => WifiProvisioningScreen(deviceSerial: boxSerial),
      ),
    );
    if (!mounted) return;
    Navigator.of(context).pop({
      'id': device['id'],
      'name': device['name'] ?? boxSerial,
      'serial': boxSerial,
    });
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.paddingOf(context);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      // White content over the camera in both Light and Dark Mode.
      child: Theme(
        data: AppTheme.darkTheme,
        child: Scaffold(
          backgroundColor: Colors.black,
          body: BackdropGroup(
            child: LayoutBuilder(builder: (context, constraints) {
              final frameSize = math.min(constraints.maxWidth * 0.72, 300.0);
              final scanWindow = Rect.fromCenter(
                center: Offset(
                  constraints.maxWidth / 2,
                  constraints.maxHeight * 0.45,
                ),
                width: frameSize,
                height: frameSize,
              );

              return Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(
                    controller: _scannerController,
                    fit: BoxFit.cover,
                    tapToFocus: true,
                    onDetect: _handleCapture,
                    placeholderBuilder: (context) => const ColoredBox(
                      color: Colors.black,
                      child: Center(
                        child: CircularProgressIndicator.adaptive(),
                      ),
                    ),
                    errorBuilder: (context, error) => _CameraErrorView(
                      error: error,
                      onRetry: _scannerController.start,
                      onManualEntry: _showManualEntry,
                    ),
                  ),
                  IgnorePointer(
                    child: CustomPaint(
                      painter: _ScannerMaskPainter(
                        scanWindow: scanWindow,
                        radius: AppRadius.xl,
                      ),
                    ),
                  ),
                  Positioned.fromRect(
                    rect: scanWindow,
                    child: IgnorePointer(
                      child: _ScanFrame(
                        animation: _scanLine,
                        size: frameSize,
                        lineColor: context.colors.accent,
                      ),
                    ),
                  ),
                  Positioned(
                    top: padding.top + AppSpacing.xs,
                    left: AppSpacing.md,
                    right: AppSpacing.md,
                    child: Row(
                      children: [
                        const GlassSurface(
                          capsule: true,
                          padding: EdgeInsets.only(left: AppSpacing.xxs),
                          child: AppBackButton(),
                        ),
                        const Spacer(),
                        _CircleGlassButton(
                          icon: _isTorchOn
                              ? Icons.flashlight_on_rounded
                              : Icons.flashlight_off_rounded,
                          color: _isTorchOn
                              ? context.colors.unlocked
                              : Colors.white,
                          tooltip: _isTorchOn
                              ? context.tr(vi: 'Tắt đèn', en: 'Torch off')
                              : context.tr(vi: 'Bật đèn', en: 'Torch on'),
                          onTap: _toggleTorch,
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    top: scanWindow.bottom + AppSpacing.xl,
                    left: AppSpacing.xl,
                    right: AppSpacing.xl,
                    child: _ScanHint(
                      title: context.tr(
                          vi: 'Quét mã QR trên hộp',
                          en: 'Scan the QR code on the box'),
                      message: context.tr(
                        vi: 'Mã nằm ở mặt sau hoặc đáy hộp và bắt đầu bằng DBX-.',
                        en: 'It is on the back or bottom of the box and starts with DBX-.',
                      ),
                    ),
                  ),
                  Positioned(
                    left: AppSpacing.xl,
                    right: AppSpacing.xl,
                    bottom: padding.bottom + AppSpacing.lg,
                    child: Center(
                      child: GlassSurface(
                        capsule: true,
                        onTap: _isProcessing ? null : _showManualEntry,
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.sm,
                        ),
                        child: Builder(builder: (context) {
                          return Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.keyboard_rounded, size: 20),
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                context.tr(
                                    vi: 'Nhập mã thủ công',
                                    en: 'Enter code manually'),
                                style: context.text.titleSmall,
                              ),
                            ],
                          );
                        }),
                      ),
                    ),
                  ),
                  if (_isProcessing) const _ProcessingOverlay(),
                ],
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _ScanHint extends StatelessWidget {
  final String title;
  final String message;

  const _ScanHint({required this.title, required this.message});

  static const _shadow = [Shadow(color: Color(0x99000000), blurRadius: 10)];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          title,
          textAlign: TextAlign.center,
          style: context.text.titleLarge?.copyWith(shadows: _shadow),
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          message,
          textAlign: TextAlign.center,
          style: context.text.bodyMedium?.copyWith(
            color: Colors.white.withValues(alpha: 0.85),
            shadows: _shadow,
          ),
        ),
      ],
    );
  }
}

class _ScanFrame extends StatelessWidget {
  final Animation<double> animation;
  final double size;
  final Color lineColor;

  const _ScanFrame({
    required this.animation,
    required this.size,
    required this.lineColor,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(
          child: CustomPaint(painter: _QrCornerPainter(color: Colors.white)),
        ),
        AnimatedBuilder(
          animation: animation,
          builder: (context, _) => Positioned(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            top: AppSpacing.md + animation.value * (size - AppSpacing.md * 2),
            child: Container(
              height: 2,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [
                  lineColor.withValues(alpha: 0),
                  lineColor,
                  lineColor.withValues(alpha: 0),
                ]),
                boxShadow: [
                  BoxShadow(
                    color: lineColor.withValues(alpha: 0.5),
                    blurRadius: 8,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CircleGlassButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String tooltip;
  final VoidCallback onTap;

  const _CircleGlassButton({
    required this.icon,
    required this.color,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: tooltip,
      child: GlassSurface(
        capsule: true,
        onTap: onTap,
        child: SizedBox.square(
          dimension: AppSizes.minTapTarget,
          child: Icon(icon, color: color, size: 22),
        ),
      ),
    );
  }
}

class _ProcessingOverlay extends StatelessWidget {
  const _ProcessingOverlay();

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black.withValues(alpha: 0.45),
      child: Center(
        child: GlassSurface(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.lg,
          ),
          child: Builder(builder: (context) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator.adaptive(),
                const SizedBox(height: AppSpacing.md),
                Text(
                  context.tr(vi: 'Đang thêm hộp...', en: 'Adding the box...'),
                  style: context.text.titleSmall,
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

/// Bottom sheet that validates a typed serial before returning it, so the
/// error shows inside the sheet instead of a toast behind it.
class _ManualSerialSheet extends StatefulWidget {
  const _ManualSerialSheet();

  @override
  State<_ManualSerialSheet> createState() => _ManualSerialSheetState();
}

class _ManualSerialSheetState extends State<_ManualSerialSheet> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final input = _controller.text.trim();
    final serial = normalizeDeviceSerial(input);
    if (input.isEmpty || !isValidDeviceSerial(serial)) {
      setState(() {
        _error = input.isEmpty
            ? context.tr(
                vi: 'Hãy nhập mã serial của hộp.',
                en: 'Enter the box serial number.')
            : context.tr(
                vi: 'Mã không hợp lệ. Mã có dạng DBX- và 12 ký tự 0-9, A-F.',
                en: 'Invalid code. It looks like DBX- followed by 12 characters 0-9, A-F.');
      });
      return;
    }
    Navigator.pop(context, serial);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            context.tr(vi: 'Nhập mã hộp', en: 'Enter box code'),
            textAlign: TextAlign.center,
            style: context.text.titleLarge,
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            context.tr(
              vi: 'Mã serial được in cạnh mã QR ở mặt sau hoặc đáy hộp.',
              en: 'The serial is printed next to the QR code on the back or bottom of the box.',
            ),
            textAlign: TextAlign.center,
            style: context.text.bodySmall,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppTextField(
            controller: _controller,
            label: context.tr(vi: 'Mã serial', en: 'Serial number'),
            hint: 'DBX-98C377AD9D60',
            prefixIcon: AppIcons.key,
            autofocus: true,
            textInputAction: TextInputAction.done,
            errorText: _error,
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
            onSubmitted: (_) => _submit(),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppButton(
            label: context.tr(vi: 'Thêm hộp', en: 'Add box'),
            icon: AppIcons.add,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}

class _CameraErrorView extends StatelessWidget {
  final MobileScannerException error;
  final VoidCallback onRetry;
  final VoidCallback onManualEntry;

  const _CameraErrorView({
    required this.error,
    required this.onRetry,
    required this.onManualEntry,
  });

  @override
  Widget build(BuildContext context) {
    final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;
    return ColoredBox(
      color: Colors.black,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            child: EmptyState(
              icon: AppIcons.camera,
              title: denied
                  ? context.tr(
                      vi: 'Chưa có quyền dùng camera',
                      en: 'Camera access is off')
                  : context.tr(
                      vi: 'Không mở được camera',
                      en: 'Could not open the camera'),
              message: denied
                  ? context.tr(
                      vi: 'Hãy cho phép Anchor Box dùng camera trong Cài đặt, hoặc nhập mã hộp thủ công.',
                      en: 'Allow Anchor Box to use the camera in Settings, or enter the box code manually.',
                    )
                  : context.tr(
                      vi: 'Hãy thử lại hoặc nhập mã hộp thủ công.',
                      en: 'Try again or enter the box code manually.',
                    ),
              action: Column(
                children: [
                  AppButton(
                    label: context.tr(vi: 'Thử lại', en: 'Try again'),
                    onPressed: onRetry,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  AppButton(
                    variant: AppButtonVariant.plain,
                    label: context.tr(
                        vi: 'Nhập mã thủ công', en: 'Enter code manually'),
                    onPressed: onManualEntry,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScannerMaskPainter extends CustomPainter {
  final Rect scanWindow;
  final double radius;

  const _ScannerMaskPainter({
    required this.scanWindow,
    required this.radius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(Offset.zero & size)
      ..addRRect(
        RRect.fromRectAndRadius(scanWindow, Radius.circular(radius)),
      );
    canvas.drawPath(path, Paint()..color = const Color(0x73000000));
  }

  @override
  bool shouldRepaint(covariant _ScannerMaskPainter oldDelegate) {
    return oldDelegate.scanWindow != scanWindow || oldDelegate.radius != radius;
  }
}

class _QrCornerPainter extends CustomPainter {
  final Color color;

  const _QrCornerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withValues(alpha: 0.9)
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const length = 36.0;
    const inset = 2.0;
    const cornerRadius = 22.0;

    final corners = <Path>[
      Path()
        ..moveTo(inset, length)
        ..lineTo(inset, cornerRadius)
        ..quadraticBezierTo(inset, inset, cornerRadius, inset)
        ..lineTo(length, inset),
      Path()
        ..moveTo(size.width - length, inset)
        ..lineTo(size.width - cornerRadius, inset)
        ..quadraticBezierTo(
          size.width - inset,
          inset,
          size.width - inset,
          cornerRadius,
        )
        ..lineTo(size.width - inset, length),
      Path()
        ..moveTo(inset, size.height - length)
        ..lineTo(inset, size.height - cornerRadius)
        ..quadraticBezierTo(
          inset,
          size.height - inset,
          cornerRadius,
          size.height - inset,
        )
        ..lineTo(length, size.height - inset),
      Path()
        ..moveTo(size.width - length, size.height - inset)
        ..lineTo(size.width - cornerRadius, size.height - inset)
        ..quadraticBezierTo(
          size.width - inset,
          size.height - inset,
          size.width - inset,
          size.height - cornerRadius,
        )
        ..lineTo(size.width - inset, size.height - length),
    ];

    for (final path in corners) {
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _QrCornerPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
