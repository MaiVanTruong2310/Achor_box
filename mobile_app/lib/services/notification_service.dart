import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/models/app_notification.dart';
import 'supabase_service.dart';

class NotificationService {
  static const eventTypes = <String>[
    'low_battery',
    'device_offline',
    'device_online',
    'remote_unlock',
    'box_unlocked',
    'door_opened',
    'door_closed',
    'parcel_detected',
    'parcel_delivered',
    'device_added',
    'access_invited',
    'access_revoked',
    'pin_created',
    'pin_used',
    'pin_expired',
    'profile_updated',
    'password_changed',
    'security_alert',
    'system',
  ];

  static Stream<List<AppNotification>> watchNotifications() {
    final client = SupabaseService.client;
    final user = SupabaseService.currentUser;
    if (client == null || user == null) return const Stream.empty();
    return client
        .from('notifications')
        .stream(primaryKey: ['id'])
        .eq('user_id', user.id)
        .order('created_at', ascending: false)
        .map((rows) => rows.map(AppNotification.fromJson).toList());
  }

  static Future<Map<String, bool>> loadPreferences() async {
    final client = SupabaseService.client;
    final user = SupabaseService.currentUser;
    final defaults = {for (final type in eventTypes) type: true};
    if (client == null || user == null) return defaults;
    try {
      final rows = await client
          .from('notification_preferences')
          .select('event_type, enabled')
          .eq('user_id', user.id);
      for (final row in rows) {
        defaults[row['event_type'] as String] = row['enabled'] as bool? ?? true;
      }
    } catch (error) {
      debugPrint('Load notification preferences error: $error');
    }
    return defaults;
  }

  static Future<bool> setPreference(String type, bool enabled) async {
    final client = SupabaseService.client;
    final user = SupabaseService.currentUser;
    if (client == null || user == null) return false;
    try {
      await client.from('notification_preferences').upsert({
        'user_id': user.id,
        'event_type': type,
        'enabled': enabled,
      }, onConflict: 'user_id,event_type');
      return true;
    } catch (error) {
      debugPrint('Save notification preference error: $error');
      return false;
    }
  }

  static Future<void> create({
    required String type,
    required String title,
    String? body,
    String? deviceId,
    Duration dedupeWindow = const Duration(seconds: 20),
  }) async {
    final client = SupabaseService.client;
    final user = SupabaseService.currentUser;
    if (client == null || user == null) return;
    try {
      final preference = await client
          .from('notification_preferences')
          .select('enabled')
          .eq('user_id', user.id)
          .eq('event_type', type)
          .maybeSingle();
      if (preference?['enabled'] == false) return;

      var recentQuery = client
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', type)
          .gte('created_at',
              DateTime.now().subtract(dedupeWindow).toUtc().toIso8601String());
      if (deviceId != null) recentQuery = recentQuery.eq('device_id', deviceId);
      final recent = await recentQuery.limit(1);
      if (recent.isNotEmpty) return;

      await client.from('notifications').insert({
        'user_id': user.id,
        'device_id': deviceId,
        'type': type,
        'title': title,
        'body': body,
      });
    } catch (error) {
      debugPrint('Create notification error: $error');
    }
  }

  static Future<void> markRead(String id) async {
    final client = SupabaseService.client;
    final user = SupabaseService.currentUser;
    if (client == null || user == null) return;
    await client
        .from('notifications')
        .update({'is_read': true})
        .eq('id', id)
        .eq('user_id', user.id);
  }

  static Future<void> markAllRead() async {
    final client = SupabaseService.client;
    final user = SupabaseService.currentUser;
    if (client == null || user == null) return;
    await client
        .from('notifications')
        .update({'is_read': true})
        .eq('user_id', user.id)
        .eq('is_read', false);
  }

  static Future<void> delete(String id) async {
    final client = SupabaseService.client;
    final user = SupabaseService.currentUser;
    if (client == null || user == null) return;
    await client
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
  }
}
