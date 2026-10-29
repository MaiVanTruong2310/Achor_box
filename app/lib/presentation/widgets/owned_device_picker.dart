import 'package:flutter/material.dart';

import '../../core/devices/device_controller.dart';
import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';
import '../components/glass_surface.dart';

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
  final _controller = globalDeviceController;
  List<OwnedDevice> _devices = const [];
  bool _reportedInitial = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_sync);
    _controller.initialize();
    // Devices may already be loaded; report after the first frame because
    // the parent calls setState in onChanged.
    WidgetsBinding.instance.addPostFrameCallback((_) => _sync());
  }

  @override
  void dispose() {
    _controller.removeListener(_sync);
    super.dispose();
  }

  void _sync() {
    if (!mounted || _controller.loading) {
      if (mounted) setState(() {});
      return;
    }
    final devices = [
      for (final device in _controller.ownedDevices)
        OwnedDevice(
          id: device.id,
          name: device.displayName,
          serial: device.serial,
        ),
    ];
    setState(() => _devices = devices);

    final selected = widget.selectedDeviceId;
    final current = devices.where((device) => device.id == selected);
    if (current.isEmpty) {
      if (selected != null || devices.isNotEmpty || !_reportedInitial) {
        widget.onChanged(devices.isEmpty ? null : devices.first);
      }
    } else if (!_reportedInitial) {
      // A preselected device (e.g. opened from device detail) still needs to
      // be reported once so the parent learns its name and loads its data.
      widget.onChanged(current.first);
    }
    _reportedInitial = true;
  }

  @override
  Widget build(BuildContext context) {
    if (_controller.loading) {
      return const SizedBox(
        height: AppSizes.minTapTarget,
        child: Center(child: CircularProgressIndicator.adaptive()),
      );
    }
    if (_devices.isEmpty) {
      return Text(
        context.tr(
          vi: 'Bạn chưa sở hữu hộp nào. Hãy thêm hộp ở tab Thiết bị.',
          en: 'You do not own any box yet. Add one from the Devices tab.',
        ),
        style: context.text.bodyMedium?.copyWith(
          color: context.colors.textPrimary.withValues(alpha: 0.8),
        ),
      );
    }

    return SizedBox(
      height: AppSizes.minTapTarget,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: _devices.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.xs),
        itemBuilder: (context, index) {
          final device = _devices[index];
          return _DeviceChip(
            device: device,
            selected: device.id == widget.selectedDeviceId,
            onTap: () => widget.onChanged(device),
          );
        },
      ),
    );
  }
}

class _DeviceChip extends StatelessWidget {
  final OwnedDevice device;
  final bool selected;
  final VoidCallback onTap;

  const _DeviceChip({
    required this.device,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      child: GlassSurface(
        capsule: true,
        style: selected ? GlassStyle.light : GlassStyle.dark,
        onTap: onTap,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        child: Builder(builder: (context) {
          final colors = context.colors;
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                selected ? AppIcons.boxFill : AppIcons.box,
                size: 18,
                color: selected ? colors.accent : colors.textPrimary,
              ),
              const SizedBox(width: AppSpacing.xs),
              Text(device.name, style: context.text.titleSmall),
            ],
          );
        }),
      ),
    );
  }
}
