import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../data/models/app_notification.dart';
import '../../services/notification_service.dart';

class NotificationController extends ChangeNotifier {
  StreamSubscription<List<AppNotification>>? _subscription;
  List<AppNotification> _items = const [];
  Map<String, bool> _preferences = const {};
  bool _initialized = false;
  bool _loading = false;
  bool _hasError = false;

  List<AppNotification> get items => _items;
  Map<String, bool> get preferences => _preferences;

  /// True until the first snapshot arrives from Supabase.
  bool get loading => _loading;

  /// The realtime stream failed; [items] may be stale until [refresh].
  bool get hasError => _hasError;
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
    _subscribe();
    _preferences = await NotificationService.loadPreferences();
    notifyListeners();
  }

  /// Re-subscribes to the realtime stream, e.g. after a dropped connection.
  Future<void> refresh() async {
    if (!_initialized) return initialize();
    _subscribe();
  }

  void _subscribe() {
    _subscription?.cancel();
    _loading = _items.isEmpty;
    _hasError = false;
    _subscription = NotificationService.watchNotifications().listen(
      (items) {
        _items = items;
        _loading = false;
        _hasError = false;
        notifyListeners();
      },
      onError: (Object error) {
        debugPrint('Notification stream error: $error');
        _loading = false;
        _hasError = true;
        notifyListeners();
      },
      onDone: () {
        if (!_loading) return;
        _loading = false;
        notifyListeners();
      },
    );
    notifyListeners();
  }

  /// Shows the change at once and rolls back if Supabase rejects it.
  Future<bool> setPreference(String type, bool enabled) async {
    final previous = _preferences[type] ?? true;
    _preferences = {..._preferences, type: enabled};
    notifyListeners();
    if (await NotificationService.setPreference(type, enabled)) return true;
    _preferences = {..._preferences, type: previous};
    notifyListeners();
    return false;
  }

  Future<bool> setRead(String id, {bool read = true}) => _optimistic(
        [
          for (final item in _items)
            item.id == id ? item.copyWith(isRead: read) : item,
        ],
        () => NotificationService.setRead(id, read: read),
      );

  Future<bool> markRead(String id) => setRead(id);

  Future<bool> markAllRead() => _optimistic(
        [for (final item in _items) item.copyWith(isRead: true)],
        NotificationService.markAllRead,
      );

  Future<bool> delete(String id) => _optimistic(
        _items.where((item) => item.id != id).toList(),
        () => NotificationService.delete(id),
      );

  /// Shows [next] immediately, then rolls back if Supabase rejects the
  /// change. Realtime later replaces the list with the server state.
  Future<bool> _optimistic(
    List<AppNotification> next,
    Future<bool> Function() commit,
  ) async {
    final previous = _items;
    _items = next;
    notifyListeners();
    final ok = await commit();
    if (!ok) {
      if (identical(_items, next)) {
        _items = previous;
        notifyListeners();
      } else {
        _subscribe();
      }
    }
    return ok;
  }

  void reset() {
    _subscription?.cancel();
    _subscription = null;
    _items = const [];
    _preferences = const {};
    _initialized = false;
    _loading = false;
    _hasError = false;
    notifyListeners();
  }
}

final globalNotificationController = NotificationController();
