import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../data/models/app_notification.dart';
import '../../services/notification_service.dart';

class NotificationController extends ChangeNotifier {
  StreamSubscription<List<AppNotification>>? _subscription;
  List<AppNotification> _items = const [];
  Map<String, bool> _preferences = const {};
  bool _initialized = false;

  List<AppNotification> get items => _items;
  Map<String, bool> get preferences => _preferences;
  int get unreadCount => _items.where((item) => !item.isRead).length;
  AppNotification? get latestWarning {
    for (final item in _items) {
      if (!item.isRead &&
          (item.severity == NotificationSeverity.warning ||
              item.severity == NotificationSeverity.danger)) {
        return item;
      }
    }
    return null;
  }

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    _preferences = await NotificationService.loadPreferences();
    _subscription = NotificationService.watchNotifications().listen(
      (items) {
        _items = items;
        notifyListeners();
      },
      onError: (Object error) =>
          debugPrint('Notification stream error: $error'),
    );
    notifyListeners();
  }

  Future<void> setPreference(String type, bool enabled) async {
    final previous = _preferences[type] ?? true;
    _preferences = {..._preferences, type: enabled};
    notifyListeners();
    if (!await NotificationService.setPreference(type, enabled)) {
      _preferences = {..._preferences, type: previous};
      notifyListeners();
    }
  }

  Future<void> markRead(String id) => NotificationService.markRead(id);
  Future<void> markAllRead() => NotificationService.markAllRead();
  Future<void> delete(String id) => NotificationService.delete(id);

  void reset() {
    _subscription?.cancel();
    _subscription = null;
    _items = const [];
    _preferences = const {};
    _initialized = false;
    notifyListeners();
  }
}

final globalNotificationController = NotificationController();
