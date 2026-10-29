import 'package:flutter/widgets.dart';

import '../../services/supabase_service.dart';
import '../devices/device_controller.dart';
import '../notifications/notification_controller.dart';
import '../security/app_lock_controller.dart';

/// Navigator of the whole app, for code that sits above it such as the app
/// lock overlay in `MaterialApp.builder`.
final appNavigatorKey = GlobalKey<NavigatorState>();

/// Signs out and clears every per-user cache and subscription.
Future<void> signOutAndClearSession() async {
  globalNotificationController.reset();
  await globalDeviceController.reset();
  globalAppLockController.reset();
  await SupabaseService.signOut();
}
