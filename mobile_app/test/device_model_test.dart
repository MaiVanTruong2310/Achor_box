import 'package:flutter_test/flutter_test.dart';
import 'package:smart_delivery_box/data/models/device.dart';
import 'package:smart_delivery_box/data/models/device_access.dart';

void main() {
  final now = DateTime.utc(2026, 10, 25, 12);

  Map<String, dynamic> row({
    String status = 'online',
    DateTime? lastSeen,
    String? lock = 'locked',
    String? owner = 'owner-1',
    String? name = 'Hộp trước nhà',
  }) =>
      {
        'id': 'd1',
        'serial_number': 'DBX-98C377AD9D60',
        'name': name,
        'location_label': '  ',
        'owner_id': owner,
        'status': status,
        'last_seen_at': (lastSeen ?? now).toIso8601String(),
        'lock_status': lock,
        'door_status': 'closed',
        'package_detected': true,
        'scale_ready': true,
        'weight_kg': 1,
        'battery_level': null,
      };

  test('parses a devices row', () {
    final device = Device.fromRow(row(), currentUserId: 'owner-1');
    expect(device.serial, 'DBX-98C377AD9D60');
    expect(device.displayName, 'Hộp trước nhà');
    expect(device.location, isNull);
    expect(device.lockState, DeviceLockState.locked);
    expect(device.weightKg, 1.0);
    expect(device.packageDetected, isTrue);
    expect(device.accessLevel, DeviceAccessLevel.owner);
  });

  test('falls back to the serial when unnamed', () {
    expect(Device.fromRow(row(name: null)).displayName, 'DBX-98C377AD9D60');
  });

  test('uses the member level for shared devices', () {
    final device = Device.fromRow(
      row(),
      currentUserId: 'member-2',
      memberLevel: DeviceAccessLevel.viewOnly,
    );
    expect(device.isOwner, isFalse);
    expect(device.canControl, isFalse);
  });

  group('isOnlineAt', () {
    test('online when status is online and seen recently', () {
      final device = Device.fromRow(
          row(lastSeen: now.subtract(const Duration(seconds: 30))));
      expect(device.isOnlineAt(now), isTrue);
    });

    test('offline when the heartbeat is older than the timeout', () {
      final device = Device.fromRow(
          row(lastSeen: now.subtract(const Duration(minutes: 2))));
      expect(device.isOnlineAt(now), isFalse);
    });

    test('offline when status is not online', () {
      expect(Device.fromRow(row(status: 'offline')).isOnlineAt(now), isFalse);
    });
  });

  test('unknown lock status maps to unknown', () {
    final device = Device.fromRow(row(lock: null));
    expect(device.lockState, DeviceLockState.unknown);
    expect(device.isUnlocked, isFalse);
  });
}
