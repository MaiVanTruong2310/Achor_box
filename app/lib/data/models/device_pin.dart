enum OneTimePinStatus { active, used, expired }

/// A one-time PIN as listed by `list_device_one_time_pins`. The code itself is
/// stored only as a salted hash, so it is never part of this model.
class OneTimePinInfo {
  final String id;
  final DateTime createdAt;
  final DateTime expiresAt;
  final DateTime? usedAt;

  const OneTimePinInfo({
    required this.id,
    required this.createdAt,
    required this.expiresAt,
    required this.usedAt,
  });

  factory OneTimePinInfo.fromJson(Map<String, dynamic> json) {
    return OneTimePinInfo(
      id: json['pin_id'].toString(),
      createdAt: DateTime.parse(json['created_at'].toString()),
      expiresAt: DateTime.parse(json['expires_at'].toString()),
      usedAt: DateTime.tryParse(json['used_at']?.toString() ?? ''),
    );
  }

  OneTimePinStatus statusAt(DateTime now) {
    if (usedAt != null) return OneTimePinStatus.used;
    if (!expiresAt.isAfter(now)) return OneTimePinStatus.expired;
    return OneTimePinStatus.active;
  }
}

/// Result of `create_device_one_time_pin`: the only moment the code is known.
class CreatedOneTimePin {
  final String id;
  final String code;
  final DateTime? expiresAt;

  const CreatedOneTimePin({
    required this.id,
    required this.code,
    required this.expiresAt,
  });

  static CreatedOneTimePin? fromJson(Map<String, dynamic>? json) {
    final code = json?['pin_code']?.toString();
    if (json == null || code == null || code.isEmpty) return null;
    return CreatedOneTimePin(
      id: json['pin_id']?.toString() ?? '',
      code: code,
      expiresAt: DateTime.tryParse(json['expires_at']?.toString() ?? ''),
    );
  }
}

class DevicePinOverview {
  final bool permanentPinSet;
  final DateTime? permanentPinUpdatedAt;

  const DevicePinOverview({
    required this.permanentPinSet,
    required this.permanentPinUpdatedAt,
  });

  factory DevicePinOverview.fromJson(Map<String, dynamic> json) {
    return DevicePinOverview(
      permanentPinSet: json['permanent_pin_set'] == true,
      permanentPinUpdatedAt:
          DateTime.tryParse(json['permanent_pin_updated_at']?.toString() ?? ''),
    );
  }
}

/// Permanent box PINs are exactly 4 digits (`set_device_access_pin`).
String? validateNewDevicePin(String pin, String confirmation) {
  if (!RegExp(r'^[0-9]{4}$').hasMatch(pin)) return 'length';
  if (pin != confirmation) return 'mismatch';
  return null;
}
