import 'package:flutter/material.dart';

import '../../../../core/localization/language_controller.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/device.dart';
import '../../../components/components.dart';

class DeviceCard extends StatelessWidget {
  final Device device;
  final bool isOnline;
  final bool isBusy;
  final VoidCallback onTap;
  final VoidCallback? onToggleLock;

  const DeviceCard({
    super.key,
    required this.device,
    required this.isOnline,
    required this.onTap,
    this.onToggleLock,
    this.isBusy = false,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      style: isOnline ? GlassStyle.light : GlassStyle.dark,
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Builder(builder: _content),
    );
  }

  Widget _content(BuildContext context) {
    final colors = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            _BrandAvatar(color: isOnline ? colors.accent : colors.offline),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    device.displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.titleMedium,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    device.location ??
                        context.tr(
                            vi: 'Chưa đặt vị trí', en: 'No location set'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.bodySmall,
                  ),
                ],
              ),
            ),
            StatusPill(
              label: isOnline
                  ? context.tr(vi: 'Trực tuyến', en: 'Online')
                  : context.tr(vi: 'Ngoại tuyến', en: 'Offline'),
              color: isOnline ? colors.locked : colors.offline,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(child: _lockState(context, colors)),
            Expanded(child: _lidState(context, colors)),
            Expanded(child: _parcelState(context, colors)),
          ],
        ),
        if (onToggleLock != null) ...[
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: device.isUnlocked
                ? context.tr(vi: 'Khóa lại', en: 'Lock')
                : context.tr(vi: 'Mở khóa', en: 'Unlock'),
            icon: device.isUnlocked ? AppIcons.lock : AppIcons.unlock,
            variant: device.isUnlocked
                ? AppButtonVariant.secondary
                : AppButtonVariant.primary,
            isLoading: isBusy,
            onPressed: isOnline ? onToggleLock : null,
          ),
        ],
      ],
    );
  }

  Widget _lockState(BuildContext context, AppColors colors) {
    if (!isOnline || device.lockState == DeviceLockState.unknown) {
      return _StateItem(
        icon: AppIcons.lock,
        color: colors.offline,
        label: context.tr(vi: 'Khóa', en: 'Lock'),
        value: '--',
      );
    }
    return device.isUnlocked
        ? _StateItem(
            icon: AppIcons.unlock,
            color: colors.unlocked,
            label: context.tr(vi: 'Khóa', en: 'Lock'),
            value: context.tr(vi: 'Đang mở', en: 'Unlocked'),
          )
        : _StateItem(
            icon: AppIcons.lock,
            color: colors.locked,
            label: context.tr(vi: 'Khóa', en: 'Lock'),
            value: context.tr(vi: 'Đã khóa', en: 'Locked'),
          );
  }

  Widget _lidState(BuildContext context, AppColors colors) {
    final label = context.tr(vi: 'Nắp hộp', en: 'Lid');
    if (!isOnline) {
      return _StateItem(
        icon: AppIcons.lid,
        color: colors.offline,
        label: label,
        value: '--',
      );
    }
    return device.doorOpen
        ? _StateItem(
            icon: AppIcons.lidOpen,
            color: device.isUnlocked ? colors.unlocked : colors.alert,
            label: label,
            value: context.tr(vi: 'Đang mở', en: 'Open'),
          )
        : _StateItem(
            icon: AppIcons.lid,
            color: colors.locked,
            label: label,
            value: context.tr(vi: 'Đã đóng', en: 'Closed'),
          );
  }

  Widget _parcelState(BuildContext context, AppColors colors) {
    final label = context.tr(vi: 'Kiện hàng', en: 'Parcel');
    if (!isOnline) {
      return _StateItem(
        icon: AppIcons.parcel,
        color: colors.offline,
        label: label,
        value: '--',
      );
    }
    final weight = device.weightKg;
    return device.packageDetected
        ? _StateItem(
            icon: AppIcons.parcelFill,
            color: colors.accent,
            label: label,
            value: weight == null
                ? context.tr(vi: 'Có hàng', en: 'Inside')
                : '${weight.toStringAsFixed(2)} kg',
          )
        : _StateItem(
            icon: AppIcons.parcel,
            color: colors.textSecondary,
            label: label,
            value: context.tr(vi: 'Trống', en: 'Empty'),
          );
  }
}

class _StateItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;

  const _StateItem({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: Column(
        children: [
          Icon(icon, color: color, size: 26),
          const SizedBox(height: AppSpacing.xxs),
          Text(value, style: context.text.titleSmall),
          Text(label, style: context.text.labelSmall),
        ],
      ),
    );
  }
}

/// The hand-inked anchor of the logo, used as the box's own icon.
class _BrandAvatar extends StatelessWidget {
  final Color color;

  const _BrandAvatar({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      padding: const EdgeInsets.all(AppSpacing.xs),
      decoration: ShapeDecoration(
        color: color,
        shape: const RoundedSuperellipseBorder(borderRadius: AppRadius.smAll),
      ),
      child: const BrandLogo(height: 28, onDark: true),
    );
  }
}
