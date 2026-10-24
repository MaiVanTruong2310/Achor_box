import 'package:flutter_test/flutter_test.dart';
import 'package:smart_delivery_box/data/models/device_pin.dart';

void main() {
  final now = DateTime.utc(2026, 10, 25, 12);

  OneTimePinInfo pin({required DateTime expiresAt, DateTime? usedAt}) {
    return OneTimePinInfo(
      id: 'p1',
      createdAt: DateTime.utc(2026, 10, 25, 11),
      expiresAt: expiresAt,
      usedAt: usedAt,
    );
  }

  group('OneTimePinInfo.statusAt', () {
    test('is active before expiry when unused', () {
      expect(
        pin(expiresAt: now.add(const Duration(minutes: 1))).statusAt(now),
        OneTimePinStatus.active,
      );
    });

    test('is expired at or after expiry', () {
      expect(pin(expiresAt: now).statusAt(now), OneTimePinStatus.expired);
      expect(
        pin(expiresAt: now.subtract(const Duration(seconds: 1))).statusAt(now),
        OneTimePinStatus.expired,
      );
    });

    test('used wins over expiry', () {
      expect(
        pin(
          expiresAt: now.subtract(const Duration(hours: 1)),
          usedAt: now.subtract(const Duration(hours: 2)),
        ).statusAt(now),
        OneTimePinStatus.used,
      );
    });
  });

  test('OneTimePinInfo.fromJson parses list_device_one_time_pins rows', () {
    final info = OneTimePinInfo.fromJson({
      'pin_id': 'abc',
      'created_at': '2026-10-25T11:00:00+00:00',
      'expires_at': '2026-10-25T11:30:00+00:00',
      'used_at': null,
    });
    expect(info.id, 'abc');
    expect(info.usedAt, isNull);
    expect(info.expiresAt, DateTime.utc(2026, 10, 25, 11, 30));
  });

  group('CreatedOneTimePin.fromJson', () {
    test('parses create_device_one_time_pin output', () {
      final created = CreatedOneTimePin.fromJson({
        'pin_id': 'abc',
        'pin_code': '0427',
        'expires_at': '2026-10-25T11:30:00+00:00',
      });
      expect(created?.code, '0427');
      expect(created?.expiresAt, DateTime.utc(2026, 10, 25, 11, 30));
    });

    test('returns null without a code', () {
      expect(CreatedOneTimePin.fromJson(null), isNull);
      expect(CreatedOneTimePin.fromJson({'pin_id': 'abc'}), isNull);
      expect(CreatedOneTimePin.fromJson({'pin_code': ''}), isNull);
    });
  });

  test('DevicePinOverview.fromJson', () {
    final set = DevicePinOverview.fromJson({
      'permanent_pin_set': true,
      'permanent_pin_updated_at': '2026-10-20T08:00:00+00:00',
    });
    expect(set.permanentPinSet, isTrue);
    expect(set.permanentPinUpdatedAt, DateTime.utc(2026, 10, 20, 8));

    final unset = DevicePinOverview.fromJson({
      'permanent_pin_set': false,
      'permanent_pin_updated_at': null,
    });
    expect(unset.permanentPinSet, isFalse);
    expect(unset.permanentPinUpdatedAt, isNull);
  });

  group('validateNewDevicePin', () {
    test('accepts matching 4-digit PINs', () {
      expect(validateNewDevicePin('0427', '0427'), isNull);
    });

    test('rejects wrong length or non-digits', () {
      expect(validateNewDevicePin('123', '123'), 'length');
      expect(validateNewDevicePin('12345', '12345'), 'length');
      expect(validateNewDevicePin('12a4', '12a4'), 'length');
    });

    test('rejects mismatched confirmation', () {
      expect(validateNewDevicePin('1234', '1243'), 'mismatch');
    });
  });
}
