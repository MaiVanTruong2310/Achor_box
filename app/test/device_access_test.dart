import 'package:flutter_test/flutter_test.dart';
import 'package:smart_delivery_box/data/models/device_access.dart';
import 'package:smart_delivery_box/services/supabase_service.dart';

void main() {
  group('DeviceAccessLevel', () {
    test('maps server values both ways', () {
      for (final level in DeviceAccessLevel.values) {
        expect(DeviceAccessLevel.fromServer(level.serverValue), level);
      }
      expect(DeviceAccessLevel.fromServer(null), isNull);
      expect(DeviceAccessLevel.fromServer('admin'), isNull);
    });

    test('only owner and full control can send commands', () {
      expect(DeviceAccessLevel.owner.canControl, isTrue);
      expect(DeviceAccessLevel.fullControl.canControl, isTrue);
      expect(DeviceAccessLevel.viewOnly.canControl, isFalse);
      expect(DeviceAccessLevel.fullControl.isOwner, isFalse);
    });
  });

  group('DeviceMember.fromJson', () {
    test('parses the owner row of list_device_members', () {
      final member = DeviceMember.fromJson({
        'user_id': 'u1',
        'full_name': 'Mai Truong',
        'email': 'owner@example.com',
        'avatar_url': null,
        'access_level': 'owner',
        'is_owner': true,
        'granted_at': '2026-10-25T01:00:00+00:00',
      });
      expect(member.isOwner, isTrue);
      expect(member.displayName, 'Mai Truong');
      expect(member.initials, 'M');
      expect(member.grantedAt, DateTime.utc(2026, 10, 25, 1));
    });

    test('parses a member and falls back to the email local part', () {
      final member = DeviceMember.fromJson({
        'user_id': 'u2',
        'full_name': '  ',
        'email': 'lan.nguyen@example.com',
        'access_level': 'full_control',
        'is_owner': false,
      });
      expect(member.level, DeviceAccessLevel.fullControl);
      expect(member.displayName, 'lan.nguyen');
      expect(member.initials, 'L');
    });

    test('treats an unknown level as view only', () {
      final member = DeviceMember.fromJson({
        'user_id': 'u3',
        'email': 'x@example.com',
        'access_level': 'something_new',
        'is_owner': false,
      });
      expect(member.level, DeviceAccessLevel.viewOnly);
    });
  });

  group('SupabaseService.sharingErrorMessage', () {
    test('maps server exceptions to user messages', () {
      expect(
        SupabaseService.sharingErrorMessage(
            Exception('PostgrestException(message: User not found)')),
        contains('chưa đăng ký'),
      );
      expect(
        SupabaseService.sharingErrorMessage('Cannot invite yourself'),
        contains('chủ sở hữu'),
      );
      expect(
        SupabaseService.sharingErrorMessage(
            'Device not found or not owned by user'),
        contains('Chỉ chủ sở hữu'),
      );
      expect(
        SupabaseService.sharingErrorMessage('network down'),
        contains('Vui lòng thử lại'),
      );
    });
  });
}
