import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/device.dart';
import '../../data/models/device_access.dart';
import '../../services/supabase_service.dart';

/// Single source of the signed-in user's boxes for every tab: one realtime
/// `devices` subscription instead of one per screen.
///
/// The last snapshot is cached per user in SharedPreferences so Home shows
/// boxes instantly on a cold start, then Supabase replaces it. The cache
/// only speeds up display; Supabase stays the source of truth.
class DeviceController extends ChangeNotifier {
  static const _cachePrefix = 'devices_cache_v1_';

  StreamSubscription<List<Map<String, dynamic>>>? _subscription;
  String? _userId;
  List<Map<String, dynamic>> _rows = const [];
  Map<String, DeviceAccessLevel> _levels = const {};
  List<Device> _devices = const [];
  bool _initialized = false;
  bool _loading = false;
  bool _hasError = false;

  List<Device> get devices => _devices;
  List<Device> get ownedDevices =>
      _devices.where((device) => device.isOwner).toList();

  /// True only until the first data, cached or live, is available.
  bool get loading => _loading;
  bool get hasError => _hasError;

  /// Null also means the user no longer has access to that box.
  Device? byId(String? id) {
    if (id == null) return null;
    for (final device in _devices) {
      if (device.id == id) return device;
    }
    return null;
  }

  Future<void> initialize() async {
    if (_initialized) return;
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) return;
    _initialized = true;
    _userId = userId;
    _loading = true;
    notifyListeners();

    await _loadCache(userId);
    if (_userId != userId) return;
    _subscribe();
  }

  /// Re-subscribes, e.g. on pull to refresh or after a dropped connection.
  Future<void> refresh() async {
    if (!_initialized) return initialize();
    _subscribe();
  }

  void _subscribe() {
    _subscription?.cancel();
    _hasError = false;
    final stream = SupabaseService.getDevicesStream();
    if (stream == null) {
      _loading = false;
      notifyListeners();
      return;
    }
    _subscription = stream.listen(_applyRows, onError: (Object error) {
      debugPrint('Devices stream error: $error');
      _loading = false;
      _hasError = true;
      notifyListeners();
    });
  }

  Future<void> _applyRows(List<Map<String, dynamic>> rows) async {
    final userId = _userId;
    _rows = rows;
    _loading = false;
    _hasError = false;
    _rebuild();

    final levels = await SupabaseService.getMyDeviceAccessLevels(rows);
    if (_userId != userId || !identical(_rows, rows)) return;
    _levels = levels;
    _rebuild();
    unawaited(_saveCache(userId!));
  }

  void _rebuild() {
    _devices = _rows
        .map((row) => Device.fromRow(
              row,
              currentUserId: _userId,
              memberLevel: _levels[row['id']?.toString()],
            ))
        .toList()
      ..sort((a, b) => a.displayName.compareTo(b.displayName));
    notifyListeners();
  }

  Future<void> _loadCache(String userId) async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final raw = preferences.getString('$_cachePrefix$userId');
      if (raw == null || _userId != userId) return;
      final json = jsonDecode(raw) as Map<String, dynamic>;
      _rows = [
        for (final row in json['rows'] as List)
          Map<String, dynamic>.from(row as Map),
      ];
      _levels = {
        for (final entry in (json['levels'] as Map).entries)
          if (DeviceAccessLevel.fromServer(entry.value as String?)
              case final level?)
            entry.key as String: level,
      };
      _loading = false;
      _rebuild();
    } catch (error) {
      debugPrint('Load devices cache error: $error');
    }
  }

  Future<void> _saveCache(String userId) async {
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(
        '$_cachePrefix$userId',
        jsonEncode({
          'rows': _rows,
          'levels': {
            for (final entry in _levels.entries)
              entry.key: entry.value.serverValue,
          },
        }),
      );
    } catch (error) {
      debugPrint('Save devices cache error: $error');
    }
  }

  /// Called on sign-out: stops the subscription and deletes this user's
  /// cached boxes from the phone.
  Future<void> reset() async {
    final userId = _userId;
    _subscription?.cancel();
    _subscription = null;
    _userId = null;
    _rows = const [];
    _levels = const {};
    _devices = const [];
    _initialized = false;
    _loading = false;
    _hasError = false;
    notifyListeners();
    if (userId == null) return;
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.remove('$_cachePrefix$userId');
    } catch (error) {
      debugPrint('Clear devices cache error: $error');
    }
  }
}

final globalDeviceController = DeviceController();
