import 'package:flutter/material.dart';

import '../../../../core/localization/language_controller.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/device.dart';
import '../../../components/components.dart';

/// Lock / parcel / connection overview across all boxes.
class HomeSummary extends StatelessWidget {
  final List<Device> devices;
  final DateTime now;

  const HomeSummary({super.key, required this.devices, required this.now});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final online = devices.where((d) => d.isOnlineAt(now)).toList();
    final unlocked = online.where((d) => d.isUnlocked).length;
    final parcels = online.where((d) => d.packageDetected).length;

    final chips = [
      SummaryChip(
        icon: unlocked > 0 ? AppIcons.unlock : AppIcons.lock,
        color: unlocked > 0 ? colors.unlocked : colors.locked,
        title: context.tr(vi: 'Khóa', en: 'Locks'),
        value: unlocked > 0
            ? context.tr(vi: '$unlocked đang mở', en: '$unlocked unlocked')
            : context.tr(vi: 'Đã khóa hết', en: 'All locked'),
      ),
      SummaryChip(
        icon: AppIcons.parcelFill,
        color: parcels > 0 ? colors.indigo : colors.offline,
        title: context.tr(vi: 'Kiện hàng', en: 'Parcels'),
        value: parcels > 0
            ? context.tr(vi: '$parcels chờ lấy', en: '$parcels waiting')
            : context.tr(vi: 'Không có', en: 'None'),
      ),
      SummaryChip(
        icon: AppIcons.wifi,
        color: online.length == devices.length ? colors.teal : colors.offline,
        title: context.tr(vi: 'Kết nối', en: 'Connection'),
        value: context.tr(
          vi: '${online.length}/${devices.length} trực tuyến',
          en: '${online.length}/${devices.length} online',
        ),
      ),
    ];

    return SizedBox(
      height: 50,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: chips.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.xs),
        itemBuilder: (_, index) => chips[index],
      ),
    );
  }
}
