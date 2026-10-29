/// Box serials have the form `DBX-` + 12 upper-case hex digits (the ESP32 MAC).
final RegExp deviceSerialPattern = RegExp(r'^DBX-[0-9A-F]{12}$');

bool isValidDeviceSerial(String serial) => deviceSerialPattern.hasMatch(serial);

/// Extracts a box serial from scanned QR content or manual input.
///
/// Accepts a JSON object with a serial field, text containing `DBX-...`
/// (separators `-`, `_`, `:` or spaces), or just the 12 hex digits.
/// Returns an empty string when no serial can be found.
String normalizeDeviceSerial(String input) {
  final raw = input.trim();
  final upper = raw.toUpperCase();

  if (raw.startsWith('{') && raw.endsWith('}')) {
    final match = RegExp(
      r'"(?:serial|serial_number|id|device_id)"\s*:\s*"([^"]+)"',
      caseSensitive: false,
    ).firstMatch(raw);
    if (match != null) return normalizeDeviceSerial(match.group(1)!);
  }

  final embedded = RegExp(r'DBX[\s_:-]*([0-9A-F]{12})').firstMatch(upper);
  if (embedded != null) return 'DBX-${embedded.group(1)}';

  final compact = upper.replaceAll(RegExp(r'[^0-9A-Z]'), '');
  if (RegExp(r'^[0-9A-F]{12}$').hasMatch(compact)) return 'DBX-$compact';
  if (RegExp(r'^DBX[0-9A-F]{12}$').hasMatch(compact)) {
    return 'DBX-${compact.substring(3)}';
  }
  return '';
}
