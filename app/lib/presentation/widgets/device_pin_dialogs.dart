import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/localization/language_controller.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/device_pin.dart';
import '../components/components.dart';
import 'app_toast.dart';

/// Asks for a new 4-digit permanent box PIN. Returns the PIN, or null if the
/// user cancelled. Controllers live in the dialog's own State.
Future<String?> showChangeDevicePinDialog(BuildContext context) {
  return showGlassDialog<String>(context, const _ChangeDevicePinDialog());
}

/// Shows a freshly created one-time PIN. This is the only time the code is
/// visible: the server stores only its hash.
Future<void> showOneTimePinCreatedDialog(
  BuildContext context,
  CreatedOneTimePin pin,
) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) {
      final expiresAt = pin.expiresAt?.toLocal();
      return AlertDialog(
        title:
            Text(dialogContext.tr(vi: 'PIN dùng một lần', en: 'One-time PIN')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              AppIcons.pinFill,
              size: 42,
              color: dialogContext.colors.accent,
            ),
            const SizedBox(height: AppSpacing.sm),
            SelectableText(
              pin.code,
              style: dialogContext.text.displaySmall?.copyWith(
                letterSpacing: 10,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              expiresAt == null
                  ? dialogContext.tr(
                      vi: 'Mã chỉ dùng được một lần.',
                      en: 'The code can be used only once.',
                    )
                  : dialogContext.tr(
                      vi: 'Hết hạn lúc ${formatShortDateTime(expiresAt)}. '
                          'Mã chỉ dùng được một lần.',
                      en: 'Expires at ${formatShortDateTime(expiresAt)}. '
                          'The code can be used only once.',
                    ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              dialogContext.tr(
                vi: 'Hãy lưu hoặc gửi mã ngay: sau khi đóng sẽ không xem lại được.',
                en: 'Save or share it now: it cannot be shown again.',
              ),
              textAlign: TextAlign.center,
              style: dialogContext.text.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: pin.code));
              if (dialogContext.mounted) {
                AppToast.show(
                  dialogContext,
                  message: dialogContext.tr(
                    vi: 'Đã sao chép PIN một lần.',
                    en: 'One-time PIN copied.',
                  ),
                  type: ToastType.info,
                );
              }
            },
            icon: const Icon(AppIcons.copy, size: 18),
            label: Text(dialogContext.tr(vi: 'Sao chép', en: 'Copy')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(dialogContext.tr(vi: 'Xong', en: 'Done')),
          ),
        ],
      );
    },
  );
}

String formatShortDateTime(DateTime time) {
  String two(int number) => number.toString().padLeft(2, '0');
  return '${two(time.hour)}:${two(time.minute)} '
      '${two(time.day)}/${two(time.month)}';
}

class _ChangeDevicePinDialog extends StatefulWidget {
  const _ChangeDevicePinDialog();

  @override
  State<_ChangeDevicePinDialog> createState() => _ChangeDevicePinDialogState();
}

class _ChangeDevicePinDialogState extends State<_ChangeDevicePinDialog> {
  final TextEditingController _pinController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _pinController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _submit() {
    final error =
        validateNewDevicePin(_pinController.text, _confirmController.text);
    if (error == null) {
      Navigator.pop(context, _pinController.text);
      return;
    }
    setState(() {
      _error = error == 'length'
          ? context.tr(
              vi: 'PIN phải có đúng 4 chữ số.',
              en: 'The PIN must have exactly 4 digits.')
          : context.tr(
              vi: 'Hai mã PIN không khớp.', en: 'The two PINs do not match.');
    });
  }

  @override
  Widget build(BuildContext context) {
    return GlassDialog(
      icon: AppIcons.keyFill,
      title: context.tr(vi: 'Đổi mã PIN hộp', en: 'Change box PIN'),
      message: context.tr(
        vi: 'Mã 4 số dùng để mở hộp trên bàn phím của hộp.',
        en: 'The 4-digit code that opens the box on its keypad.',
      ),
      fields: [
        AppTextField(
          controller: _pinController,
          label: context.tr(vi: 'PIN mới (4 số)', en: 'New PIN (4 digits)'),
          prefixIcon: AppIcons.lock,
          autofocus: true,
          obscureText: true,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.next,
          maxLength: 4,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        ),
        AppTextField(
          controller: _confirmController,
          label: context.tr(vi: 'Nhập lại PIN', en: 'Confirm PIN'),
          prefixIcon: AppIcons.lock,
          obscureText: true,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          maxLength: 4,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onSubmitted: (_) => _submit(),
        ),
      ],
      error: _error,
      confirmLabel: context.tr(vi: 'Lưu PIN', en: 'Save PIN'),
      onConfirm: _submit,
      onCancel: () => Navigator.pop(context),
    );
  }
}
