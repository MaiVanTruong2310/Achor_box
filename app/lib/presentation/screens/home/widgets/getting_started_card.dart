import 'package:flutter/material.dart';

import '../../../../core/localization/language_controller.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../components/components.dart';

class GettingStartedCard extends StatelessWidget {
  final VoidCallback onAddDevice;

  const GettingStartedCard({super.key, required this.onAddDevice});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Builder(builder: _content),
    );
  }

  Widget _content(BuildContext context) {
    final colors = context.colors;
    final steps = [
      (
        AppIcons.scan,
        colors.accent,
        context.tr(
            vi: 'Quét mã QR trên hộp', en: 'Scan the QR code on the box'),
      ),
      (
        AppIcons.wifi,
        colors.teal,
        context.tr(
            vi: 'Gửi Wi-Fi cho hộp qua Bluetooth',
            en: 'Send Wi-Fi to the box over Bluetooth'),
      ),
      (
        AppIcons.pinFill,
        colors.purple,
        context.tr(
            vi: 'Đặt mã PIN cho bàn phím', en: 'Set a PIN for the keypad'),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Center(child: BrandLogo(height: 64, onDark: true)),
        const SizedBox(height: AppSpacing.md),
        Text(
          context.tr(
              vi: 'Bắt đầu với Anchor Box', en: 'Get started with Anchor Box'),
          textAlign: TextAlign.center,
          style: context.text.titleLarge,
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          context.tr(
            vi: 'Ba bước để hộp sẵn sàng nhận hàng.',
            en: 'Three steps to get your box ready.',
          ),
          textAlign: TextAlign.center,
          style: context.text.bodyMedium?.copyWith(color: colors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.lg),
        for (final (index, (icon, color, label)) in steps.indexed) ...[
          if (index > 0) const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              IconBadge(icon: icon, color: color, size: 32),
              const SizedBox(width: AppSpacing.sm),
              Expanded(child: Text(label, style: context.text.bodyLarge)),
            ],
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        AppButton(
          label: context.tr(vi: 'Thêm hộp đầu tiên', en: 'Add your first box'),
          icon: AppIcons.plus,
          onPressed: onAddDevice,
        ),
      ],
    );
  }
}
