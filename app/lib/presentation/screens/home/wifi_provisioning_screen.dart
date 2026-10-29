import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/device_serial.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';

enum _Step { searching, connecting, sending, waitingOnline }

/// Sends Wi-Fi credentials to a box over BLE, then waits until the box
/// reports online to Supabase. Pops with `true` when it came online.
class WifiProvisioningScreen extends StatefulWidget {
  final String deviceSerial;
  const WifiProvisioningScreen({super.key, required this.deviceSerial});

  @override
  State<WifiProvisioningScreen> createState() => _WifiProvisioningScreenState();
}

class _WifiProvisioningScreenState extends State<WifiProvisioningScreen> {
  final _ssidController = TextEditingController();
  final _passController = TextEditingController();
  _Step? _step;
  String? _error;

  // Must match the GATT server in device/firmware/src/main.cpp.
  static const String serviceUuid = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  static const String characteristicUuid =
      "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  bool get _isSending => _step != null;

  @override
  void dispose() {
    _ssidController.dispose();
    _passController.dispose();
    super.dispose();
  }

  Future<bool> _ensureBluetoothOn() async {
    if (await FlutterBluePlus.isSupported == false) {
      if (mounted) {
        setState(() => _error = context.tr(
              vi: 'Điện thoại này không hỗ trợ Bluetooth BLE.',
              en: 'This phone does not support Bluetooth BLE.',
            ));
      }
      return false;
    }

    final adapterState = await FlutterBluePlus.adapterState.first;
    if (adapterState == BluetoothAdapterState.on) return true;
    if (!mounted) return false;
    final turnOn = await showConfirmDialog(
      context,
      title: context.tr(vi: 'Bluetooth đang tắt', en: 'Bluetooth is off'),
      message: context.tr(
        vi: 'Cần bật Bluetooth để gửi Wi-Fi sang hộp.',
        en: 'Bluetooth is needed to send Wi-Fi to the box.',
      ),
      confirmLabel: context.tr(vi: 'Bật Bluetooth', en: 'Turn on'),
    );
    if (!turnOn) return false;
    try {
      await FlutterBluePlus.turnOn();
      await FlutterBluePlus.adapterState
          .firstWhere((state) => state == BluetoothAdapterState.on)
          .timeout(const Duration(seconds: 5));
      return true;
    } catch (error) {
      debugPrint('Turn on Bluetooth error: $error');
      if (mounted) {
        setState(() => _error = context.tr(
              vi: 'Hãy bật Bluetooth trong Cài đặt của điện thoại rồi thử lại.',
              en: 'Turn on Bluetooth in your phone settings, then try again.',
            ));
      }
      return false;
    }
  }

  Future<BluetoothDevice?> _findBox(String serial) async {
    final names = {'SMARTBOX-$serial', 'SMARTBOX-${serial.substring(4)}'};
    bool matches(ScanResult r) =>
        names.contains(r.device.platformName.toUpperCase()) ||
        names.contains(r.advertisementData.advName.toUpperCase());

    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 8));
    try {
      final results = await FlutterBluePlus.scanResults
          .firstWhere((results) => results.any(matches))
          .timeout(const Duration(seconds: 10));
      return results.firstWhere(matches).device;
    } on TimeoutException {
      return null;
    } finally {
      await FlutterBluePlus.stopScan();
    }
  }

  Future<void> _send() async {
    final ssid = _ssidController.text.trim();
    // Wi-Fi passwords may legitimately start or end with spaces.
    final pass = _passController.text;
    final serial = normalizeDeviceSerial(widget.deviceSerial);

    setState(() => _error = null);
    if (!isValidDeviceSerial(serial)) {
      setState(() => _error = context.tr(
            vi: 'Mã serial của hộp không hợp lệ.',
            en: 'The box serial is not valid.',
          ));
      return;
    }
    if (ssid.isEmpty) {
      setState(() => _error = context.tr(
            vi: 'Hãy nhập tên Wi-Fi.',
            en: 'Enter the Wi-Fi name.',
          ));
      return;
    }
    if (!await _ensureBluetoothOn() || !mounted) return;

    BluetoothDevice? box;
    try {
      setState(() => _step = _Step.searching);
      box = await _findBox(serial);
      if (!mounted) return;
      if (box == null) {
        _fail(context.tr(
          vi: 'Không tìm thấy hộp qua Bluetooth. Hãy bật hộp và để điện thoại ở gần.',
          en: 'Could not find the box over Bluetooth. Turn the box on and keep the phone close.',
        ));
        return;
      }

      setState(() => _step = _Step.connecting);
      await box.connect(timeout: const Duration(seconds: 6));
      final services = await box.discoverServices();
      BluetoothCharacteristic? characteristic;
      for (final service in services) {
        if (service.uuid.toString().toLowerCase() != serviceUuid) continue;
        for (final c in service.characteristics) {
          if (c.uuid.toString().toLowerCase() == characteristicUuid) {
            characteristic = c;
          }
        }
      }
      if (!mounted) return;
      if (characteristic == null) {
        await box.disconnect();
        if (!mounted) return;
        _fail(context.tr(
          vi: 'Hộp không có dịch vụ nhận Wi-Fi. Hãy cập nhật firmware.',
          en: 'The box has no Wi-Fi setup service. Update its firmware.',
        ));
        return;
      }

      setState(() => _step = _Step.sending);
      try {
        await characteristic
            .write(utf8.encode(jsonEncode({"ssid": ssid, "pass": pass})));
      } catch (error) {
        // The box restarts as soon as it stores the credentials, so a
        // dropped connection here is the expected success path.
        debugPrint('BLE write ended by box restart: $error');
      }
      await Future<void>.delayed(const Duration(milliseconds: 400));
      try {
        await box.disconnect();
      } catch (_) {}

      if (!mounted) return;
      setState(() => _step = _Step.waitingOnline);
      final online = await SupabaseService.waitForDeviceOnline(serial);
      if (!mounted) return;
      setState(() => _step = null);
      if (!online) {
        setState(() => _error = context.tr(
              vi: 'Đã gửi Wi-Fi nhưng hộp chưa trực tuyến. Hãy kiểm tra lại mật khẩu Wi-Fi rồi thử lại.',
              en: 'Wi-Fi was sent but the box is not online yet. Check the Wi-Fi password and try again.',
            ));
        return;
      }
      AppToast.show(
        context,
        message: context.tr(
          vi: 'Hộp đã kết nối Wi-Fi và đang trực tuyến.',
          en: 'The box is on Wi-Fi and online.',
        ),
        type: ToastType.success,
      );
      Navigator.pop(context, true);
    } catch (error) {
      debugPrint('Wi-Fi provisioning error: $error');
      try {
        await box?.disconnect();
      } catch (_) {}
      if (!mounted) return;
      _fail(context.tr(
        vi: 'Mất kết nối Bluetooth với hộp. Hãy thử lại.',
        en: 'Lost the Bluetooth connection to the box. Please try again.',
      ));
    }
  }

  void _fail(String message) => setState(() {
        _step = null;
        _error = message;
      });

  String _stepLabel(_Step step) => switch (step) {
        _Step.searching =>
          context.tr(vi: 'Tìm hộp qua Bluetooth', en: 'Find the box'),
        _Step.connecting =>
          context.tr(vi: 'Kết nối với hộp', en: 'Connect to the box'),
        _Step.sending =>
          context.tr(vi: 'Gửi thông tin Wi-Fi', en: 'Send Wi-Fi'),
        _Step.waitingOnline =>
          context.tr(vi: 'Chờ hộp lên mạng', en: 'Wait for the box online'),
      };

  @override
  Widget build(BuildContext context) {
    return AppPage(
      showBackButton: true,
      title: context.tr(vi: 'Kết nối Wi-Fi', en: 'Connect Wi-Fi'),
      subtitle: context.tr(
        vi: 'Hộp ${widget.deviceSerial}',
        en: 'Box ${widget.deviceSerial}',
      ),
      children: [
        const SizedBox(height: AppSpacing.md),
        AppCard(
          child: Builder(builder: (context) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconBadge(
                    icon: AppIcons.bluetooth, color: context.colors.accent),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    context.tr(
                      vi: 'Bật hộp, để điện thoại ở gần rồi nhập Wi-Fi 2.4 GHz mà hộp sẽ dùng. Thông tin được gửi qua Bluetooth.',
                      en: 'Turn the box on, keep your phone close and enter the 2.4 GHz Wi-Fi the box should use. It is sent over Bluetooth.',
                    ),
                    style: context.text.bodyMedium,
                  ),
                ),
              ],
            );
          }),
        ),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          child: Column(
            children: [
              AppTextField(
                controller: _ssidController,
                label: context.tr(vi: 'Tên Wi-Fi (SSID)', en: 'Wi-Fi name'),
                prefixIcon: AppIcons.wifi,
                enabled: !_isSending,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: AppSpacing.sm),
              PasswordField(
                controller: _passController,
                label: context.tr(vi: 'Mật khẩu Wi-Fi', en: 'Wi-Fi password'),
                autofillHints: const [],
                onSubmitted: (_) => _isSending ? null : _send(),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.md),
          InlineMessage(_error!),
        ],
        if (_step != null) ...[
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: Column(
              children: [
                for (final step in _Step.values)
                  _StepRow(
                    label: _stepLabel(step),
                    done: step.index < _step!.index,
                    active: step == _step,
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        AppButton(
          label: context.tr(vi: 'Gửi Wi-Fi sang hộp', en: 'Send Wi-Fi to box'),
          icon: AppIcons.bluetooth,
          isLoading: _isSending,
          onPressed: _send,
        ),
        const SizedBox(height: AppSpacing.xs),
        AppButton(
          variant: AppButtonVariant.plain,
          label: context.tr(vi: 'Để sau', en: 'Not now'),
          onPressed: _isSending ? null : () => Navigator.pop(context, false),
        ),
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  final String label;
  final bool done;
  final bool active;

  const _StepRow({
    required this.label,
    required this.done,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxs + 2),
      child: Row(
        children: [
          SizedBox.square(
            dimension: 22,
            child: active
                ? const Padding(
                    padding: EdgeInsets.all(2),
                    child: CircularProgressIndicator(strokeWidth: 2.4),
                  )
                : Icon(
                    done ? AppIcons.success : Icons.circle_outlined,
                    size: 20,
                    color: done ? colors.locked : colors.textTertiary,
                  ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              label,
              style: context.text.bodyMedium?.copyWith(
                color: done || active
                    ? colors.textPrimary
                    : colors.textPrimary.withValues(alpha: 0.5),
                fontWeight: active ? FontWeight.w600 : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
