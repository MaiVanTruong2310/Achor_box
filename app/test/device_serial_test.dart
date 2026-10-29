import 'package:flutter_test/flutter_test.dart';
import 'package:smart_delivery_box/core/utils/device_serial.dart';

void main() {
  group('normalizeDeviceSerial', () {
    test('keeps a canonical serial', () {
      expect(normalizeDeviceSerial('DBX-98C377AD9D60'), 'DBX-98C377AD9D60');
    });

    test('upper-cases and trims input', () {
      expect(normalizeDeviceSerial('  dbx-98c377ad9d60 '), 'DBX-98C377AD9D60');
    });

    test('accepts other separators or none', () {
      expect(normalizeDeviceSerial('DBX_98C377AD9D60'), 'DBX-98C377AD9D60');
      expect(normalizeDeviceSerial('DBX:98C377AD9D60'), 'DBX-98C377AD9D60');
      expect(normalizeDeviceSerial('DBX98C377AD9D60'), 'DBX-98C377AD9D60');
    });

    test('accepts bare 12 hex digits, with or without colons', () {
      expect(normalizeDeviceSerial('98C377AD9D60'), 'DBX-98C377AD9D60');
      expect(normalizeDeviceSerial('98:c3:77:ad:9d:60'), 'DBX-98C377AD9D60');
    });

    test('extracts the serial from a JSON QR payload', () {
      expect(
        normalizeDeviceSerial('{"serial_number": "dbx-98c377ad9d60"}'),
        'DBX-98C377AD9D60',
      );
      expect(
        normalizeDeviceSerial('{"device_id":"98C377AD9D60","v":2}'),
        'DBX-98C377AD9D60',
      );
    });

    test('finds a serial embedded in a URL', () {
      expect(
        normalizeDeviceSerial('https://anchorbox.app/pair?s=DBX-98C377AD9D60'),
        'DBX-98C377AD9D60',
      );
    });

    test('returns empty for content without a serial', () {
      expect(normalizeDeviceSerial(''), '');
      expect(normalizeDeviceSerial('hello world'), '');
      expect(normalizeDeviceSerial('DBX-98C377AD9D6'), ''); // 11 digits
      expect(normalizeDeviceSerial('DS-8921-X7'), '');
    });
  });

  group('isValidDeviceSerial', () {
    test('accepts only DBX- plus 12 upper-case hex digits', () {
      expect(isValidDeviceSerial('DBX-98C377AD9D60'), isTrue);
      expect(isValidDeviceSerial('dbx-98c377ad9d60'), isFalse);
      expect(isValidDeviceSerial('DBX-98C377AD9D6G'), isFalse);
      expect(isValidDeviceSerial(''), isFalse);
    });
  });
}
