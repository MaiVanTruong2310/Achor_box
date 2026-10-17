import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class StatusHeader extends StatelessWidget {
  final bool isConnected;
  final bool isConnecting;
  final String boxId;

  const StatusHeader({
    super.key,
    required this.isConnected,
    required this.isConnecting,
    required this.boxId,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Connection Bar
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
          decoration: BoxDecoration(
            color: isConnecting
                ? AppColors.warning.withOpacity(0.15)
                : (isConnected
                    ? AppColors.success.withOpacity(0.15)
                    : AppColors.danger.withOpacity(0.15)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (isConnecting) ...[
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.warning),
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  '⚡ Đang kết nối HiveMQ Broker...',
                  style: TextStyle(
                    color: AppColors.warning,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ] else if (isConnected) ...[
                const Icon(Icons.check_circle, color: AppColors.success, size: 16),
                const SizedBox(width: 8),
                const Text(
                  '✅ ĐÃ KẾT NỐI SẴN SÀNG (HiveMQ Cloud)',
                  style: TextStyle(
                    color: AppColors.success,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ] else ...[
                const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
                const SizedBox(width: 8),
                const Text(
                  '❌ MẤT KẾT NỐI BROKER',
                  style: TextStyle(
                    color: AppColors.danger,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
