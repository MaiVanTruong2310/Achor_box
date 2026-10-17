import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/ios26_back_button.dart';

class WifiProvisioningScreen extends StatefulWidget {
  final String deviceSerial;
  const WifiProvisioningScreen({super.key, required this.deviceSerial});

  @override
  State<WifiProvisioningScreen> createState() => _WifiProvisioningScreenState();
}

class _WifiProvisioningScreenState extends State<WifiProvisioningScreen> {
  final _ssidController = TextEditingController();
  final _passController = TextEditingController();
  bool _isObscure = true;
  bool _isSending = false;
  String _statusText = "";

  static const String serviceUuid = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  static const String characteristicUuid =
      "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  @override
  void dispose() {
    _ssidController.dispose();
    _passController.dispose();
    super.dispose();
  }

  Future<bool> _checkAndRequestBluetooth() async {
    if (await FlutterBluePlus.isSupported == false) {
      if (!mounted) return false;
      AppToast.show(
        context,
        message: context.tr(
          vi: "Thiết bị không hỗ trợ Bluetooth BLE",
          en: "Bluetooth BLE is not supported on this device",
        ),
        type: ToastType.error,
      );
      return false;
    }

    final adapterState = await FlutterBluePlus.adapterState.first;
    if (adapterState != BluetoothAdapterState.on) {
      if (!mounted) return false;
      final shouldTurnOn = await showDialog<bool>(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.bluetooth_disabled_rounded,
                  color: Colors.blueAccent),
              const SizedBox(width: 10),
              Text(dialogCtx.tr(
                  vi: "Bluetooth đang tắt", en: "Bluetooth is Off")),
            ],
          ),
          content: Text(dialogCtx.tr(
            vi: "Bạn cần bật Bluetooth để quét và nạp Wi-Fi cho Hộp thông minh. Bật Bluetooth ngay?",
            en: "Bluetooth must be enabled to configure Wi-Fi for your Smart Box. Turn on now?",
          )),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx, false),
              child: Text(dialogCtx.tr(vi: "Hủy", en: "Cancel")),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogCtx, true),
              child: Text(dialogCtx.tr(vi: "Bật Bluetooth", en: "Turn On")),
            ),
          ],
        ),
      );

      if (shouldTurnOn == true) {
        try {
          await FlutterBluePlus.turnOn();
          await Future.delayed(const Duration(seconds: 2));
        } catch (e) {
          if (!mounted) return false;
          AppToast.show(
            context,
            message: context.tr(
              vi: "Vui lòng mở Bluetooth trong Cài đặt hệ thống",
              en: "Please turn on Bluetooth in System Settings",
            ),
            type: ToastType.info,
          );
          return false;
        }
      } else {
        return false;
      }
    }
    return true;
  }

  Future<void> _sendWifiCredentials() async {
    final ssid = _ssidController.text.trim();
    final pass = _passController.text.trim();
    final serial = widget.deviceSerial.trim().toUpperCase();

    if (!RegExp(r'^DBX-[0-9A-F]{12}$').hasMatch(serial)) {
      AppToast.show(
        context,
        message: context.tr(
          vi: 'Mã QR hiện tại không chứa serial Hộp hợp lệ. Hãy nhập mã DBX-... in trên Hộp.',
          en: 'This QR code has no valid Box serial. Enter the DBX-... code printed on the Box.',
        ),
        type: ToastType.error,
      );
      return;
    }

    if (ssid.isEmpty) {
      AppToast.show(
        context,
        message: context.tr(
            vi: "Vui lòng nhập tên Wi-Fi", en: "Please enter Wi-Fi name"),
        type: ToastType.error,
      );
      return;
    }

    final isBtOk = await _checkAndRequestBluetooth();
    if (!isBtOk) return;

    setState(() {
      _isSending = true;
      _statusText = context.tr(
        vi: "Đang tìm Hộp qua Bluetooth...",
        en: "Searching for Box...",
      );
    });

    try {
      await FlutterBluePlus.startScan(
        timeout: const Duration(seconds: 8),
      );

      final expectedBleName = 'SMARTBOX-$serial';
      final legacyBleName = 'SMARTBOX-${serial.substring(4)}';
      BluetoothDevice? targetDevice;
      try {
        final results = await FlutterBluePlus.scanResults.firstWhere((results) {
          return results.any((r) {
            final platformName = r.device.platformName.toUpperCase();
            final advertisedName = r.advertisementData.advName.toUpperCase();
            return platformName == expectedBleName ||
                advertisedName == expectedBleName ||
                platformName == legacyBleName ||
                advertisedName == legacyBleName;
          });
        }).timeout(const Duration(seconds: 10));
        for (final r in results) {
          final platformName = r.device.platformName.toUpperCase();
          final advertisedName = r.advertisementData.advName.toUpperCase();
          if (platformName == expectedBleName ||
              advertisedName == expectedBleName ||
              platformName == legacyBleName ||
              advertisedName == legacyBleName) {
            targetDevice = r.device;
            break;
          }
        }
      } on TimeoutException {
        // The scan stream stays open after startScan's timeout.
      }

      await FlutterBluePlus.stopScan();

      if (targetDevice == null) {
        setState(() => _isSending = false);
        if (!mounted) return;
        AppToast.show(
          context,
          message: context.tr(
            vi: "Không tìm thấy Bluetooth của Hộp. Hãy đảm bảo Hộp đang bật.",
            en: "Box Bluetooth not found. Ensure the box is turned on.",
          ),
          type: ToastType.error,
        );
        return;
      }

      setState(() {
        _statusText = context.tr(
          vi: "Đã tìm thấy Hộp! Đang kết nối Bluetooth...",
          en: "Box found! Connecting via Bluetooth...",
        );
      });

      await targetDevice.connect(timeout: const Duration(seconds: 6));

      setState(() {
        _statusText = context.tr(
          vi: "Đang gửi cấu hình Wi-Fi xuống Hộp...",
          en: "Sending Wi-Fi credentials to Box...",
        );
      });

      final services = await targetDevice.discoverServices();
      BluetoothCharacteristic? targetChar;

      for (final s in services) {
        if (s.uuid.toString().toLowerCase() == serviceUuid.toLowerCase()) {
          for (final c in s.characteristics) {
            if (c.uuid.toString().toLowerCase() ==
                characteristicUuid.toLowerCase()) {
              targetChar = c;
              break;
            }
          }
        }
      }

      if (targetChar == null) {
        await targetDevice.disconnect();
        setState(() => _isSending = false);
        if (!mounted) return;
        AppToast.show(
          context,
          message: context.tr(
            vi: "Không thể giao tiếp với cổng BLE của Hộp.",
            en: "Could not communicate with Box BLE service.",
          ),
          type: ToastType.error,
        );
        return;
      }

      final payload = jsonEncode({"ssid": ssid, "pass": pass});
      try {
        await targetChar.write(utf8.encode(payload));
      } catch (writeErr) {
        // Hộp ESP32 nhận xong SSID/PASS lập tức ngắt Bluetooth để ESP.restart()
        // Nếu bắt lỗi Device is disconnected, đây chính là hành vi thành công của Hộp!
        debugPrint(
            "[BLE Write Note] Box disconnected after receiving Wi-Fi credentials: $writeErr");
      }

      await Future.delayed(const Duration(milliseconds: 400));
      try {
        await targetDevice.disconnect();
      } catch (_) {}

      if (!mounted) return;
      setState(() {
        _statusText = context.tr(
          vi: "Đang chờ Hộp kết nối Internet...",
          en: "Waiting for the Box to connect to the Internet...",
        );
      });

      final online = await SupabaseService.waitForDeviceOnline(
        widget.deviceSerial,
      );
      if (!mounted) return;
      setState(() => _isSending = false);
      AppToast.show(
        context,
        message: online
            ? context.tr(
                vi: "Hộp đã kết nối Wi-Fi và đang trực tuyến!",
                en: "The Box is connected to Wi-Fi and online!",
              )
            : context.tr(
                vi: "Đã gửi Wi-Fi nhưng chưa nhận được xác nhận online. Hãy kiểm tra mật khẩu Wi-Fi hoặc token Hộp.",
                en: "Wi-Fi was sent, but the Box did not confirm online. Check the Wi-Fi password or device token.",
              ),
        type: online ? ToastType.success : ToastType.info,
      );

      Navigator.pop(context, online);
    } catch (e) {
      try {
        await FlutterBluePlus.stopScan();
      } catch (_) {}
      if (!mounted) return;
      setState(() => _isSending = false);
      AppToast.show(
        context,
        message: context.tr(
          vi: "Lỗi kết nối Bluetooth: $e",
          en: "Bluetooth connection error: $e",
        ),
        type: ToastType.error,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Ios26BackButton(foregroundColor: Colors.white),
                  const SizedBox(width: 12),
                  Text(
                    context.tr(
                        vi: "Cấu hình Wi-Fi Hộp", en: "Configure Box Wi-Fi"),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              LiquidGlassContainer(
                borderRadius: 24,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.wifi_find_rounded,
                            color: Color(0xFF38BDF8), size: 28),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr(
                                    vi: "Đổi Wi-Fi qua Bluetooth",
                                    en: "Change Wi-Fi via BLE"),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "Mã Serial: ${widget.deviceSerial}",
                                style: const TextStyle(
                                    color: Color(0xFF94A3B8), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _ssidController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: context.tr(
                            vi: "Tên Wi-Fi (SSID)", en: "Wi-Fi Name (SSID)"),
                        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                        prefixIcon: const Icon(Icons.wifi_rounded,
                            color: Color(0xFF38BDF8)),
                        filled: true,
                        fillColor: Colors.black.withOpacity(0.25),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _passController,
                      obscureText: _isObscure,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: context.tr(
                            vi: "Mật khẩu Wi-Fi", en: "Wi-Fi Password"),
                        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                        prefixIcon: const Icon(Icons.lock_outline_rounded,
                            color: Color(0xFF38BDF8)),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _isObscure
                                ? Icons.visibility_off
                                : Icons.visibility,
                            color: const Color(0xFF94A3B8),
                          ),
                          onPressed: () =>
                              setState(() => _isObscure = !_isObscure),
                        ),
                        filled: true,
                        fillColor: Colors.black.withOpacity(0.25),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _isSending ? null : _sendWifiCredentials,
                        icon: _isSending
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(Icons.bluetooth_searching_rounded,
                                color: Colors.white),
                        label: Text(
                          _isSending
                              ? context.tr(
                                  vi: "ĐANG KẾT NỐI...", en: "CONNECTING...")
                              : context.tr(
                                  vi: "GỬI WI-FI SANG HỘP",
                                  en: "SEND WI-FI TO BOX"),
                          style: const TextStyle(
                              color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandBlue,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                    if (_isSending && _statusText.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Center(
                        child: Text(
                          _statusText,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: Color(0xFF38BDF8), fontSize: 13),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
