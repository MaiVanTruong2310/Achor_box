import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../data/models/device_pin.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/device_pin_dialogs.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';
import '../../widgets/owned_device_picker.dart';

/// PIN tab: the permanent box PIN and one-time PINs of an owned device.
class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key});

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  static const _expiryOptions = <int>[30, 120, 1440];

  OwnedDevice? _device;
  DevicePinOverview? _overview;
  List<OneTimePinInfo> _oneTimePins = const [];
  bool _loading = false;
  bool _loadFailed = false;
  bool _busy = false;

  void _selectDevice(OwnedDevice? device) {
    if (device?.id == _device?.id && _overview != null) return;
    setState(() {
      _device = device;
      _overview = null;
      _oneTimePins = const [];
      _loadFailed = false;
    });
    _reload();
  }

  Future<void> _reload() async {
    final device = _device;
    if (device == null) return;
    setState(() => _loading = true);
    final results = await Future.wait([
      SupabaseService.getDevicePinOverview(device.id),
      SupabaseService.listOneTimeDevicePins(device.id),
    ]);
    if (!mounted || _device?.id != device.id) return;
    final overview = results[0] as DevicePinOverview?;
    final pins = results[1] as List<OneTimePinInfo>?;
    setState(() {
      _loading = false;
      _loadFailed = overview == null || pins == null;
      _overview = overview;
      _oneTimePins = pins ?? const [];
    });
  }

  Future<void> _changePermanentPin() async {
    final device = _device;
    if (device == null || _busy) return;
    final newPin = await showChangeDevicePinDialog(context);
    if (newPin == null || !mounted) return;

    setState(() => _busy = true);
    final saved = await SupabaseService.setDeviceAccessPin(
      deviceId: device.id,
      pin: newPin,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    AppToast.show(
      context,
      message: saved
          ? context.tr(
              vi: 'Đã cập nhật mã PIN của ${device.name}.',
              en: 'The PIN of ${device.name} has been updated.')
          : context.tr(
              vi: 'Không thể cập nhật PIN. Hãy thử lại.',
              en: 'Could not update the PIN. Please try again.'),
      type: saved ? ToastType.success : ToastType.error,
    );
    if (saved) _reload();
  }

  Future<void> _createOneTimePin() async {
    final device = _device;
    if (device == null || _busy) return;
    final minutes = await _pickExpiry();
    if (minutes == null || !mounted) return;

    setState(() => _busy = true);
    final created = await SupabaseService.createOneTimeDevicePin(
      deviceId: device.id,
      expiresMinutes: minutes,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (created == null) {
      AppToast.show(
        context,
        message: context.tr(
            vi: 'Không thể tạo PIN một lần. Hãy thử lại.',
            en: 'Could not create a one-time PIN. Please try again.'),
        type: ToastType.error,
      );
      return;
    }
    await showOneTimePinCreatedDialog(context, created);
    if (mounted) _reload();
  }

  Future<int?> _pickExpiry() {
    return showModalBottomSheet<int>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
        child: LiquidGlassContainer(
          borderRadius: 24,
          blur: 28,
          tintOpacity: 0.25,
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  sheetContext.tr(
                      vi: 'PIN một lần có hiệu lực trong',
                      en: 'One-time PIN valid for'),
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
              for (final minutes in _expiryOptions)
                ListTile(
                  leading: const Icon(Icons.timer_outlined),
                  title: Text(_expiryLabel(sheetContext, minutes)),
                  onTap: () => Navigator.pop(sheetContext, minutes),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _expiryLabel(BuildContext context, int minutes) {
    if (minutes < 60) {
      return context.tr(vi: '$minutes phút', en: '$minutes minutes');
    }
    final hours = minutes ~/ 60;
    return context.tr(vi: '$hours giờ', en: '$hours hours');
  }

  Future<void> _revokeOneTimePin(OneTimePinInfo pin) async {
    if (_busy) return;
    setState(() => _busy = true);
    final revoked = await SupabaseService.revokeOneTimeDevicePin(pin.id);
    if (!mounted) return;
    setState(() => _busy = false);
    AppToast.show(
      context,
      message: revoked
          ? context.tr(vi: 'Đã hủy PIN một lần.', en: 'One-time PIN revoked.')
          : context.tr(
              vi: 'PIN này đã được dùng hoặc đã hết hạn.',
              en: 'This PIN was already used or has expired.'),
      type: revoked ? ToastType.success : ToastType.info,
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText =
        isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final secondaryText =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;
    final accent = isDark ? const Color(0xFF38BDF8) : AppColors.brandBlue;

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 108),
              children: [
                Text(
                  context.tr(vi: 'Mã PIN', en: 'PIN Codes'),
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: primaryText,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 16),
                OwnedDevicePicker(
                  selectedDeviceId: _device?.id,
                  onChanged: _selectDevice,
                ),
                if (_device != null) ...[
                  const SizedBox(height: 20),
                  if (_loading && _overview == null)
                    const Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_loadFailed)
                    _buildLoadError(secondaryText)
                  else ...[
                    _buildPermanentPinCard(primaryText, secondaryText, accent),
                    const SizedBox(height: 24),
                    _buildOneTimeHeader(primaryText, accent),
                    const SizedBox(height: 12),
                    if (_oneTimePins.isEmpty)
                      Text(
                        context.tr(
                          vi: 'Chưa có PIN một lần nào trong 30 ngày qua.',
                          en: 'No one-time PINs in the last 30 days.',
                        ),
                        style: TextStyle(color: secondaryText, fontSize: 14),
                      )
                    else
                      ..._oneTimePins.map((pin) => _buildOneTimePinTile(
                          pin, primaryText, secondaryText)),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadError(Color secondaryText) {
    return Padding(
      padding: const EdgeInsets.only(top: 32),
      child: Column(
        children: [
          Icon(Icons.cloud_off_rounded, color: secondaryText, size: 36),
          const SizedBox(height: 10),
          Text(
            context.tr(
              vi: 'Không tải được thông tin PIN. Kéo xuống để thử lại.',
              en: 'Could not load PIN information. Pull down to retry.',
            ),
            textAlign: TextAlign.center,
            style: TextStyle(color: secondaryText),
          ),
        ],
      ),
    );
  }

  Widget _buildPermanentPinCard(
      Color primaryText, Color secondaryText, Color accent) {
    final overview = _overview;
    final isSet = overview?.permanentPinSet == true;
    final updatedAt = overview?.permanentPinUpdatedAt?.toLocal();
    return LiquidGlassContainer(
      borderRadius: 20,
      blur: 18,
      tintOpacity: 0.16,
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Icon(
            isSet ? Icons.verified_user_outlined : Icons.pin_outlined,
            color: isSet ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
            size: 28,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr(vi: 'PIN cố định', en: 'Permanent PIN'),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: primaryText,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isSet
                      ? (updatedAt == null
                          ? context.tr(vi: 'Đã đặt', en: 'Set')
                          : context.tr(
                              vi:
                                  'Cập nhật lúc ${formatShortDateTime(updatedAt)}',
                              en:
                                  'Updated at ${formatShortDateTime(updatedAt)}'))
                      : context.tr(
                          vi: 'Chưa đặt: bàn phím của hộp chưa mở được bằng PIN.',
                          en: 'Not set: the keypad cannot unlock the box yet.'),
                  style: TextStyle(fontSize: 12.5, color: secondaryText),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          TextButton(
            onPressed: _busy ? null : _changePermanentPin,
            child: Text(
              isSet
                  ? context.tr(vi: 'Đổi PIN', en: 'Change')
                  : context.tr(vi: 'Đặt PIN', en: 'Set PIN'),
              style: TextStyle(color: accent, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOneTimeHeader(Color primaryText, Color accent) {
    return Row(
      children: [
        Expanded(
          child: Text(
            context.tr(vi: 'PIN một lần', en: 'One-time PINs'),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: primaryText,
            ),
          ),
        ),
        LiquidGlassContainer(
          borderRadius: 16,
          blur: 16,
          tintOpacity: 0.14,
          padding: EdgeInsets.zero,
          child: SizedBox(
            width: 44,
            height: 44,
            child: IconButton(
              tooltip:
                  context.tr(vi: 'Tạo PIN một lần', en: 'Create one-time PIN'),
              icon: Icon(Icons.add_rounded, size: 24, color: accent),
              onPressed: _busy ? null : _createOneTimePin,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOneTimePinTile(
      OneTimePinInfo pin, Color primaryText, Color secondaryText) {
    final status = pin.statusAt(DateTime.now());
    final (label, color) = switch (status) {
      OneTimePinStatus.active => (
          context.tr(vi: 'Còn hiệu lực', en: 'Active'),
          const Color(0xFF10B981)
        ),
      OneTimePinStatus.used => (
          context.tr(vi: 'Đã dùng', en: 'Used'),
          AppColors.brandBlue
        ),
      OneTimePinStatus.expired => (
          context.tr(vi: 'Hết hạn', en: 'Expired'),
          secondaryText
        ),
    };
    final detail = switch (status) {
      OneTimePinStatus.used => context.tr(
          vi: 'Dùng lúc ${formatShortDateTime(pin.usedAt!.toLocal())}',
          en: 'Used at ${formatShortDateTime(pin.usedAt!.toLocal())}'),
      _ => context.tr(
          vi: 'Hết hạn lúc ${formatShortDateTime(pin.expiresAt.toLocal())}',
          en: 'Expires at ${formatShortDateTime(pin.expiresAt.toLocal())}'),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LiquidGlassContainer(
        borderRadius: 18,
        blur: 16,
        tintOpacity: 0.14,
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
        child: Row(
          children: [
            Icon(Icons.password_rounded, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        context.tr(
                            vi: 'Tạo lúc ${formatShortDateTime(pin.createdAt.toLocal())}',
                            en: 'Created ${formatShortDateTime(pin.createdAt.toLocal())}'),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: primaryText,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: color.withValues(alpha: 0.35), width: 0.8),
                        ),
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(detail,
                      style: TextStyle(fontSize: 12.5, color: secondaryText)),
                ],
              ),
            ),
            if (status == OneTimePinStatus.active)
              IconButton(
                tooltip: context.tr(vi: 'Hủy PIN', en: 'Revoke PIN'),
                icon: const Icon(Icons.block_rounded, color: Colors.redAccent),
                onPressed: _busy ? null : () => _revokeOneTimePin(pin),
              ),
          ],
        ),
      ),
    );
  }
}
