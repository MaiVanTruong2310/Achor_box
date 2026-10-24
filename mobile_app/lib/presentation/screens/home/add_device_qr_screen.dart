import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/utils/device_serial.dart';
import '../../../data/models/device_access.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/ios26_back_button.dart';
import 'wifi_provisioning_screen.dart';

class AddDeviceQrScreen extends StatefulWidget {
  const AddDeviceQrScreen({super.key});

  @override
  State<AddDeviceQrScreen> createState() => _AddDeviceQrScreenState();
}

class _AddDeviceQrScreenState extends State<AddDeviceQrScreen>
    with SingleTickerProviderStateMixin {
  late final MobileScannerController _scannerController;
  late final AnimationController _scanController;
  final TextEditingController _serialController = TextEditingController();
  bool _isFlashOn = false;
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
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _scanController.dispose();
    _serialController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _toggleTorch() async {
    await _scannerController.toggleTorch();
    if (mounted) setState(() => _isFlashOn = !_isFlashOn);
  }

  Future<void> _handleCapture(BarcodeCapture capture) async {
    if (_isProcessing) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();
      if (value != null && value.isNotEmpty) {
        await _pairDevice(value);
        return;
      }
    }
  }

  Future<void> _pairDevice(String serial) async {
    final normalizedSerial = normalizeDeviceSerial(serial);
    if (_isProcessing) return;
    if (!isValidDeviceSerial(normalizedSerial)) {
      AppToast.show(
        context,
        message: context.tr(
          vi: 'QR này không chứa mã serial Hộp. Hãy quét mã DBX-... hoặc nhập serial in trên Hộp.',
          en: 'This QR code has no Box serial. Scan the DBX-... code or enter the serial printed on the Box.',
        ),
        type: ToastType.error,
      );
      return;
    }

    setState(() => _isProcessing = true);
    await HapticFeedback.mediumImpact();
    if (!mounted) return;

    // Ownership is assigned server-side from auth.uid(). Never trust a client
    // supplied owner id or report success when no row was actually claimed.
    final device = await SupabaseService.claimDeviceBySerial(normalizedSerial);
    if (!mounted) return;
    if (device == null) {
      setState(() => _isProcessing = false);
      await _scannerController.start();
      if (!mounted) return;
      AppToast.show(
        context,
        message: SupabaseService.lastDevicePairingError ??
            context.tr(
              vi: "Không thể kết nối với Hộp.",
              en: "Could not pair the box.",
            ),
        type: ToastType.error,
      );
      return;
    }

    AppToast.show(
      context,
      message: context.tr(
          vi: "Kết nối thiết bị ($normalizedSerial) thành công!",
          en: "Device ($normalizedSerial) connected successfully!"),
      type: ToastType.success,
    );
    // Nạp Hộp thành công -> Chuyển thẳng sang Màn hình nạp Wi-Fi BLE!
    if (mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => WifiProvisioningScreen(
            deviceSerial:
                device['serial_number']?.toString() ?? normalizedSerial,
          ),
        ),
      );
    }

    if (!mounted) return;
    Navigator.pop(context, {
      "id": device['id'],
      "name": device['name'] ?? "DropSafe Box",
      "serial": device['serial_number'] ?? normalizedSerial,
      "mqttTopicId": device['serial_number'] ?? normalizedSerial,
      "accessLevel": DeviceAccessLevel.owner,
      "isOnline": device['status'] == 'online',
      "statusText": device['status'] == 'online' ? "Online" : "Offline",
      "locationText": device['location_label'] ?? "Chưa thiết lập vị trí",
      "batteryLevel": device['battery_level'] == null
          ? "--"
          : "${device['battery_level']}%",
      "timeAgo": "Vừa thêm",
      "hasAlert": false,
      "weight":
          device['weight_kg'] == null ? "--" : "${device['weight_kg']} kg",
      "lockStatus": device['lock_status'] == null
          ? "Không rõ"
          : (device['lock_status'].toString().toLowerCase() == 'unlocked'
              ? "Mở"
              : "Đóng"),
      "icon": Icons.inventory_2_outlined,
    });
  }

  Future<void> _showManualEntry() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withOpacity(0.34),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            bottom: MediaQuery.viewInsetsOf(sheetContext).bottom + 12,
          ),
          child: LiquidGlassContainer(
            borderRadius: 28,
            blur: 30,
            tintOpacity: 0.22,
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.38),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  context.tr(vi: "Nhập mã thiết bị", en: "Enter device code"),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  context.tr(
                      vi: "Mã serial được in ở mặt sau hoặc đáy hộp DropSafe.",
                      en: "The serial number is printed on the back or bottom of the DropSafe box."),
                  style: const TextStyle(
                    color: Color(0xFFB8C4D8),
                    fontSize: 13,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _serialController,
                  autofocus: true,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.8,
                  ),
                  decoration: InputDecoration(
                    hintText: "VD: DBX-98C377AD9D60",
                    hintStyle: const TextStyle(color: Color(0xFF7F91A8)),
                    filled: true,
                    fillColor: Colors.black.withOpacity(0.20),
                    prefixIcon: const Icon(
                      Icons.numbers_rounded,
                      color: Color(0xFF94A3B8),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(
                        color: Colors.white.withOpacity(0.18),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(
                        color: Colors.white.withOpacity(0.18),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(
                        color: Color(0xFF38BDF8),
                        width: 1.4,
                      ),
                    ),
                  ),
                  onSubmitted: (value) {
                    if (value.trim().isEmpty) {
                      AppToast.show(
                        sheetContext,
                        message: context.tr(
                            vi: "Vui lòng nhập mã serial thiết bị.",
                            en: "Please enter the device serial number."),
                        type: ToastType.error,
                      );
                      return;
                    }
                    Navigator.pop(sheetContext);
                    _pairDevice(value);
                  },
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final serial = _serialController.text;
                      if (serial.trim().isEmpty) {
                        AppToast.show(
                          sheetContext,
                          message: context.tr(
                              vi: "Vui lòng nhập mã serial thiết bị.",
                              en: "Please enter the device serial number."),
                          type: ToastType.error,
                        );
                        return;
                      }
                      Navigator.pop(sheetContext);
                      _pairDevice(serial);
                    },
                    icon: const Icon(Icons.link_rounded, color: Colors.white),
                    label: Text(
                      context.tr(vi: "KẾT NỐI THIẾT BỊ", en: "CONNECT DEVICE"),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brandBlue,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final topInset = media.padding.top;
    final bottomInset = media.padding.bottom;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.light,
        systemNavigationBarDividerColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: Colors.black,
        extendBody: true,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final frameSize = math.min(constraints.maxWidth * 0.74, 310.0);
            final scanWindow = Rect.fromCenter(
              center: Offset(
                constraints.maxWidth / 2,
                constraints.maxHeight * 0.47,
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
                      child: CircularProgressIndicator(
                        color: Color(0xFF38BDF8),
                      ),
                    ),
                  ),
                  errorBuilder: (context, error) => _CameraErrorView(
                    onRetry: () => _scannerController.start(),
                  ),
                ),
                Positioned.fill(
                  child: IgnorePointer(
                    child: CustomPaint(
                      painter: _ScannerMaskPainter(
                        scanWindow: scanWindow,
                        radius: 30,
                      ),
                    ),
                  ),
                ),
                Positioned.fromRect(
                  rect: scanWindow,
                  child: IgnorePointer(
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: const _QrCornerPainter(
                              color: Colors.white,
                            ),
                          ),
                        ),
                        AnimatedBuilder(
                          animation: _scanController,
                          builder: (context, child) {
                            return Positioned(
                              left: 22,
                              right: 22,
                              top: 18 +
                                  (_scanController.value * (frameSize - 38)),
                              child: Container(
                                height: 2,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Colors.transparent,
                                      Color(0xFF38BDF8),
                                      Colors.transparent,
                                    ],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF38BDF8)
                                          .withOpacity(0.55),
                                      blurRadius: 7,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: topInset + 10,
                  left: 14,
                  right: 14,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const SizedBox(
                        width: 92,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Ios26BackButton(
                            foregroundColor: Colors.white,
                            overlay: true,
                          ),
                        ),
                      ),
                      Flexible(
                        child: LiquidGlassContainer(
                          borderRadius: 22,
                          blur: 24,
                          tintOpacity: 0.18,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.qr_code_scanner_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                              const SizedBox(width: 7),
                              Flexible(
                                child: Text(
                                  context.tr(
                                      vi: "Quét mã thiết bị",
                                      en: "Scan device code"),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 92,
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: _GlassIconButton(
                            icon: _isFlashOn
                                ? Icons.flash_on_rounded
                                : Icons.flash_off_rounded,
                            iconColor: _isFlashOn
                                ? const Color(0xFFFBBF24)
                                : Colors.white,
                            onTap: _toggleTorch,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  top: scanWindow.bottom + 22,
                  left: 24,
                  right: 24,
                  child: Column(
                    children: [
                      Text(
                        context.tr(
                            vi: "Đưa mã QR vào khung",
                            en: "Place the QR code inside the frame"),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                          shadows: [Shadow(color: Colors.black, blurRadius: 8)],
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        context.tr(
                            vi: "Thiết bị sẽ được nhận diện tự động",
                            en: "The device will be detected automatically"),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFFD4DCE8),
                          fontSize: 13,
                          shadows: [Shadow(color: Colors.black, blurRadius: 8)],
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  left: 24,
                  right: 24,
                  bottom: bottomInset + 22,
                  child: Center(
                    child: GestureDetector(
                      onTap: _showManualEntry,
                      child: LiquidGlassContainer(
                        borderRadius: 24,
                        blur: 26,
                        tintOpacity: 0.18,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 13,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.keyboard_rounded,
                              color: Colors.white,
                              size: 19,
                            ),
                            const SizedBox(width: 9),
                            Text(
                              context.tr(
                                  vi: "Nhập mã thủ công",
                                  en: "Enter code manually"),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                if (_isProcessing)
                  const Positioned.fill(
                    child: ColoredBox(
                      color: Color(0x66000000),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF38BDF8),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _GlassIconButton extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;

  const _GlassIconButton({
    required this.icon,
    required this.onTap,
    this.iconColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: LiquidGlassContainer(
        borderRadius: 23,
        blur: 24,
        tintOpacity: 0.18,
        padding: EdgeInsets.zero,
        child: SizedBox(
          width: 46,
          height: 46,
          child: Icon(icon, color: iconColor, size: 26),
        ),
      ),
    );
  }
}

class _CameraErrorView extends StatelessWidget {
  final VoidCallback onRetry;

  const _CameraErrorView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFF080D16),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.no_photography_outlined,
                color: Colors.white,
                size: 48,
              ),
              const SizedBox(height: 16),
              const Text(
                "Không thể mở camera",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Hãy cấp quyền camera cho ứng dụng rồi thử lại.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFFA7B5C8), height: 1.4),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text("Thử lại"),
              ),
            ],
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
    canvas.drawPath(path, Paint()..color = const Color(0x52000000));
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
      ..color = color.withOpacity(0.88)
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const length = 36.0;
    const inset = 2.0;
    const cornerRadius = 20.0;

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
