import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/localization/language_controller.dart';
import '../../services/supabase_service.dart';
import 'liquid_glass_container.dart';

class OwnedDevice {
  final String id;
  final String name;
  final String serial;

  const OwnedDevice({
    required this.id,
    required this.name,
    required this.serial,
  });
}

/// Horizontal selector of the devices the signed-in user owns. Shown on the
/// PIN and Access tabs, where only owners can manage settings. Reports the
/// selection through [onChanged], including null when no device is owned.
class OwnedDevicePicker extends StatefulWidget {
  final String? selectedDeviceId;
  final ValueChanged<OwnedDevice?> onChanged;

  const OwnedDevicePicker({
    super.key,
    required this.selectedDeviceId,
    required this.onChanged,
  });

  @override
  State<OwnedDevicePicker> createState() => _OwnedDevicePickerState();
}

class _OwnedDevicePickerState extends State<OwnedDevicePicker> {
  StreamSubscription<List<Map<String, dynamic>>>? _subscription;
  List<OwnedDevice> _devices = const [];
  bool _loading = true;
  bool _reportedInitial = false;

  @override
  void initState() {
    super.initState();
    final stream = SupabaseService.getDevicesStream();
    if (stream == null) {
      _loading = false;
      return;
    }
    _subscription = stream.listen(
      _applyRows,
      onError: (Object error) {
        debugPrint('Owned devices stream error: $error');
        if (mounted) setState(() => _loading = false);
      },
    );
  }

  void _applyRows(List<Map<String, dynamic>> rows) {
    if (!mounted) return;
    final userId = SupabaseService.currentUser?.id;
    final devices = rows
        .where((row) => row['owner_id']?.toString() == userId)
        .map((row) => OwnedDevice(
              id: row['id'].toString(),
              name: (row['name'] ?? row['serial_number'] ?? 'Anchor Box')
                  .toString(),
              serial: row['serial_number']?.toString() ?? '',
            ))
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    setState(() {
      _devices = devices;
      _loading = false;
    });

    final selected = widget.selectedDeviceId;
    final current = devices.where((device) => device.id == selected);
    if (current.isEmpty) {
      widget.onChanged(devices.isEmpty ? null : devices.first);
    } else if (!_reportedInitial) {
      // A preselected device (e.g. opened from device detail) still needs to
      // be reported once so the parent learns its name and loads its data.
      widget.onChanged(current.first);
    }
    _reportedInitial = true;
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final secondaryText =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;

    if (_loading) {
      return const SizedBox(
        height: 44,
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }
    if (_devices.isEmpty) {
      return Text(
        context.tr(
          vi: 'Bạn chưa sở hữu hộp nào. Hãy thêm hộp ở tab Trang chủ.',
          en: 'You do not own any box yet. Add one from the Home tab.',
        ),
        style: TextStyle(color: secondaryText, fontSize: 13),
      );
    }

    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _devices.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final device = _devices[index];
          final selected = device.id == widget.selectedDeviceId;
          final accent = isDark ? const Color(0xFF38BDF8) : AppColors.brandBlue;
          return Semantics(
            button: true,
            selected: selected,
            child: GestureDetector(
              onTap: () => widget.onChanged(device),
              child: LiquidGlassContainer(
                borderRadius: 22,
                blur: 14,
                tintOpacity: selected ? 0.24 : 0.12,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.inventory_2_outlined,
                        size: 18,
                        color: selected ? accent : secondaryText,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        device.name,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w500,
                          color: selected ? accent : secondaryText,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
