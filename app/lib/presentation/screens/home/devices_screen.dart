import 'package:flutter/material.dart';

import '../../../core/cache/session_cache.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/device_pin.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/device_pin_dialogs.dart';
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
    // Show the last known data for this box at once, then refresh it.
    setState(() {
      _device = device;
      _overview = device == null
          ? null
          : SessionCache.get<DevicePinOverview>(_overviewKey(device.id));
      _oneTimePins = device == null
          ? const []
          : SessionCache.get<List<OneTimePinInfo>>(_pinsKey(device.id)) ??
              const [];
      _loadFailed = false;
    });
    _reload();
  }

  static String _overviewKey(String deviceId) => 'pin_overview:$deviceId';
  static String _pinsKey(String deviceId) => 'one_time_pins:$deviceId';

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
    if (overview != null) SessionCache.set(_overviewKey(device.id), overview);
    if (pins != null) SessionCache.set(_pinsKey(device.id), pins);
    setState(() {
      _loading = false;
      // Keep showing cached data when only the refresh failed.
      _loadFailed = (overview ?? _overview) == null;
      _overview = overview ?? _overview;
      _oneTimePins = pins ?? _oneTimePins;
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
    return showChoiceSheet<int>(
      context,
      title: context.tr(vi: 'PIN một lần', en: 'One-time PIN'),
      message: context.tr(
        vi: 'Chọn thời gian mã còn hiệu lực.',
        en: 'Choose how long the code stays valid.',
      ),
      options: [
        for (final minutes in _expiryOptions)
          ChoiceOption(
            value: minutes,
            label: _expiryLabel(context, minutes),
            icon: AppIcons.expiry,
          ),
      ],
    );
  }

  String _expiryLabel(BuildContext context, int minutes) {
    if (minutes < 60) {
      return context.tr(vi: '$minutes phút', en: '$minutes minutes');
    }
    final hours = minutes ~/ 60;
    return context.tr(vi: '$hours giờ', en: '$hours hours');
  }

  Future<void> _confirmRevoke(OneTimePinInfo pin) async {
    if (_busy) return;
    final confirmed = await showConfirmDialog(
      context,
      title: context.tr(vi: 'Hủy PIN một lần?', en: 'Revoke one-time PIN?'),
      message: context.tr(
        vi: 'Mã này sẽ không mở được hộp nữa.',
        en: 'This code will no longer open the box.',
      ),
      confirmLabel: context.tr(vi: 'Hủy PIN', en: 'Revoke'),
      destructive: true,
    );
    if (confirmed && mounted) await _revokeOneTimePin(pin);
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
    return AppPage(
      title: context.tr(vi: 'Mã PIN', en: 'PIN codes'),
      subtitle: context.tr(
        vi: 'Mở hộp bằng bàn phím mà không cần điện thoại.',
        en: 'Open the box from its keypad, no phone needed.',
      ),
      onRefresh: _reload,
      children: [
        const SizedBox(height: AppSpacing.md),
        OwnedDevicePicker(
          selectedDeviceId: _device?.id,
          onChanged: _selectDevice,
        ),
        if (_device != null) ..._buildContent(),
      ],
    );
  }

  List<Widget> _buildContent() {
    if (_loading && _overview == null) {
      return const [
        Padding(
          padding: EdgeInsets.only(top: AppSpacing.xxl),
          child: Center(child: CircularProgressIndicator.adaptive()),
        ),
      ];
    }
    if (_loadFailed) {
      return [
        EmptyState(
          icon: AppIcons.wifiOff,
          title: context.tr(vi: 'Không tải được', en: 'Could not load'),
          message: context.tr(
            vi: 'Kéo xuống để thử lại.',
            en: 'Pull down to try again.',
          ),
        ),
      ];
    }
    return [
      SectionHeader(title: context.tr(vi: 'PIN cố định', en: 'Permanent PIN')),
      _PermanentPinCard(
        overview: _overview,
        busy: _busy,
        onChange: _changePermanentPin,
      ),
      SectionHeader(
        title: context.tr(vi: 'PIN một lần', en: 'One-time PINs'),
        action: HeaderButton(
          icon: AppIcons.plus,
          label: context.tr(vi: 'Tạo', en: 'New'),
          onPressed: _busy ? null : _createOneTimePin,
        ),
      ),
      if (_oneTimePins.isEmpty)
        GroupedSection(
          children: [
            GroupedTile(
              leading: IconBadge(
                icon: AppIcons.timer,
                color: context.colors.textSecondary,
                filled: false,
                size: 30,
              ),
              title: context.tr(vi: 'Chưa có mã nào', en: 'No codes yet'),
              subtitle: context.tr(
                vi: 'Tạo mã cho người giao hàng, mã mất hiệu lực sau một lần dùng.',
                en: 'Create a code for a courier; it stops working after one use.',
              ),
            ),
          ],
        )
      else
        GroupedSection(
          footer: context.tr(
            vi: 'Các mã trong 30 ngày gần nhất.',
            en: 'Codes from the last 30 days.',
          ),
          children: [
            for (final pin in _oneTimePins)
              _OneTimePinTile(
                pin: pin,
                onRevoke: _busy ? null : () => _confirmRevoke(pin),
              ),
          ],
        ),
    ];
  }
}

class _PermanentPinCard extends StatelessWidget {
  final DevicePinOverview? overview;
  final bool busy;
  final VoidCallback onChange;

  const _PermanentPinCard({
    required this.overview,
    required this.busy,
    required this.onChange,
  });

  @override
  Widget build(BuildContext context) {
    final isSet = overview?.permanentPinSet == true;
    final updatedAt = overview?.permanentPinUpdatedAt?.toLocal();

    return GlassSurface(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Builder(builder: (context) {
        final colors = context.colors;
        final detail = !isSet
            ? context.tr(
                vi: 'Bàn phím chưa mở được hộp.',
                en: 'The keypad cannot open the box yet.')
            : updatedAt == null
                ? context.tr(
                    vi: '4 chữ số, dùng trên bàn phím hộp.',
                    en: '4 digits, used on the box keypad.')
                : context.tr(
                    vi: 'Cập nhật ${formatShortDateTime(updatedAt)}',
                    en: 'Updated ${formatShortDateTime(updatedAt)}');
        return Row(
          children: [
            IconBadge(
              icon: isSet ? AppIcons.securityCheck : AppIcons.warning,
              color: isSet ? colors.locked : colors.unlocked,
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isSet
                        ? context.tr(vi: 'Đã đặt mã PIN', en: 'PIN is set')
                        : context.tr(vi: 'Chưa đặt mã PIN', en: 'No PIN yet'),
                    style: context.text.titleSmall,
                  ),
                  const SizedBox(height: 2),
                  Text(detail, style: context.text.bodySmall),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.xs),
            FilledButton(
              onPressed: busy ? null : onChange,
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 36),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              ),
              child: Text(
                isSet
                    ? context.tr(vi: 'Đổi', en: 'Change')
                    : context.tr(vi: 'Đặt PIN', en: 'Set PIN'),
              ),
            ),
          ],
        );
      }),
    );
  }
}

class _OneTimePinTile extends StatelessWidget {
  final OneTimePinInfo pin;
  final VoidCallback? onRevoke;

  const _OneTimePinTile({required this.pin, required this.onRevoke});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final status = pin.statusAt(DateTime.now());
    final (label, color) = switch (status) {
      OneTimePinStatus.active => (
          context.tr(vi: 'Còn hiệu lực', en: 'Active'),
          colors.locked,
        ),
      OneTimePinStatus.used => (
          context.tr(vi: 'Đã dùng', en: 'Used'),
          colors.accent,
        ),
      OneTimePinStatus.expired => (
          context.tr(vi: 'Hết hạn', en: 'Expired'),
          colors.textSecondary,
        ),
    };
    final detail = switch (status) {
      OneTimePinStatus.used => context.tr(
          vi: 'Dùng lúc ${formatShortDateTime(pin.usedAt!.toLocal())}',
          en: 'Used ${formatShortDateTime(pin.usedAt!.toLocal())}'),
      _ => context.tr(
          vi: 'Hết hạn ${formatShortDateTime(pin.expiresAt.toLocal())}',
          en: 'Expires ${formatShortDateTime(pin.expiresAt.toLocal())}'),
    };
    final active = status == OneTimePinStatus.active;

    return GroupedTile(
      leading: IconBadge(
        icon: AppIcons.keyFill,
        color: color,
        filled: active,
        size: 30,
      ),
      title: context.tr(
        vi: 'Tạo ${formatShortDateTime(pin.createdAt.toLocal())}',
        en: 'Created ${formatShortDateTime(pin.createdAt.toLocal())}',
      ),
      subtitle: detail,
      trailing: active
          ? IconButton(
              tooltip: context.tr(vi: 'Hủy PIN', en: 'Revoke PIN'),
              onPressed: onRevoke,
              icon: Icon(AppIcons.revoke, color: colors.alert, size: 22),
            )
          : StatusPill(label: label, color: color),
    );
  }
}
