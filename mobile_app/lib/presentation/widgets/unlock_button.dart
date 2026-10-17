import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class UnlockButton extends StatelessWidget {
  final VoidCallback onPressed;
  final bool isConnected;

  const UnlockButton({
    super.key,
    required this.onPressed,
    required this.isConnected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton.icon(
        onPressed: isConnected ? onPressed : null,
        icon: const Icon(Icons.lock_open_rounded, size: 22, color: Colors.white),
        label: const Text(
          '🔓 MỞ KHÓA TỪ XA (MQTT)',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          disabledBackgroundColor: Colors.grey.shade400,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }
}
