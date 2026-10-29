import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../core/localization/language_controller.dart';

/// Platform-adaptive confirmation: Cupertino alert on iOS, Material elsewhere.
Future<bool> showConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final cancelLabel = context.tr(vi: 'Hủy', en: 'Cancel');
  final isCupertino = switch (Theme.of(context).platform) {
    TargetPlatform.iOS || TargetPlatform.macOS => true,
    _ => false,
  };

  final result = await showAdaptiveDialog<bool>(
    context: context,
    builder: (dialogContext) {
      void close(bool value) => Navigator.pop(dialogContext, value);
      if (isCupertino) {
        return CupertinoAlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            CupertinoDialogAction(
              onPressed: () => close(false),
              child: Text(cancelLabel),
            ),
            CupertinoDialogAction(
              isDestructiveAction: destructive,
              isDefaultAction: !destructive,
              onPressed: () => close(true),
              child: Text(confirmLabel),
            ),
          ],
        );
      }
      final alert = Theme.of(dialogContext).colorScheme.error;
      return AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => close(false), child: Text(cancelLabel)),
          TextButton(
            onPressed: () => close(true),
            style: destructive
                ? TextButton.styleFrom(foregroundColor: alert)
                : null,
            child: Text(confirmLabel),
          ),
        ],
      );
    },
  );
  return result ?? false;
}
