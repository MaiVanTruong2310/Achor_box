import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/constants/app_colors.dart';
import '../../core/localization/language_controller.dart';
import '../../data/models/device_pin.dart';
import 'app_toast.dart';

/// Asks for a new 4-digit permanent box PIN. Returns the PIN, or null if the
/// user cancelled. Controllers live in the dialog's own State.
Future<String?> showChangeDevicePinDialog(BuildContext context) {
  return showDialog<String>(
    context: context,
    builder: (_) => const _ChangeDevicePinDialog(),
  );
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
            const Icon(Icons.password_rounded,
                size: 42, color: AppColors.brandBlue),
            const SizedBox(height: 14),
            SelectableText(
              pin.code,
              style: const TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.w800,
                letterSpacing: 10,
              ),
            ),
            const SizedBox(height: 12),
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
            const SizedBox(height: 8),
            Text(
              dialogContext.tr(
                vi: 'Hãy lưu hoặc gửi mã ngay: sau khi đóng sẽ không xem lại được.',
                en: 'Save or share it now: it cannot be shown again.',
              ),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12),
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
            icon: const Icon(Icons.copy_rounded),
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
    return AlertDialog(
      title: Text(context.tr(vi: 'Đổi mã PIN hộp', en: 'Change box PIN')),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _pinController,
              autofocus: true,
              obscureText: true,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.next,
              maxLength: 4,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText:
                    context.tr(vi: 'PIN mới (4 số)', en: 'New PIN (4 digits)'),
                border: const OutlineInputBorder(),
                counterText: '',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmController,
              obscureText: true,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
              maxLength: 4,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: context.tr(vi: 'Nhập lại PIN', en: 'Confirm PIN'),
                border: const OutlineInputBorder(),
                counterText: '',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.redAccent)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(context.tr(vi: 'Hủy', en: 'Cancel')),
        ),
        FilledButton(
          onPressed: _submit,
          child: Text(context.tr(vi: 'Lưu PIN', en: 'Save PIN')),
        ),
      ],
    );
  }
}
