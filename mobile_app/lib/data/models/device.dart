import 'device_access.dart';

enum DeviceLockState { locked, unlocked, unknown }

/// A row of `public.devices` as seen by the signed-in user.
class Device {
  static const onlineTimeout = Duration(seconds: 90);

  final String id;
  final String serial;
  final String? name;
  final String? location;
  final String? ownerId;
  final String status;
  final DateTime? lastSeenAt;
  final DeviceLockState lockState;
  final bool doorOpen;
  final bool packageDetected;
  final bool scaleReady;
  final double? weightKg;
  final int? batteryLevel;
  final DeviceAccessLevel? accessLevel;

  const Device({
    required this.id,
    required this.serial,
    this.name,
    this.location,
    this.ownerId,
    this.status = 'offline',
    this.lastSeenAt,
    this.lockState = DeviceLockState.unknown,
    this.doorOpen = false,
    this.packageDetected = false,
    this.scaleReady = false,
    this.weightKg,
    this.batteryLevel,
    this.accessLevel,
  });

  factory Device.fromRow(
    Map<String, dynamic> row, {
    String? currentUserId,
    DeviceAccessLevel? memberLevel,
  }) {
    final ownerId = row['owner_id']?.toString();
    final isOwner = currentUserId != null && ownerId == currentUserId;
    return Device(
      id: row['id'].toString(),
      serial: row['serial_number']?.toString() ?? '',
      name: _nonEmpty(row['name']),
      location: _nonEmpty(row['location_label']),
      ownerId: ownerId,
      status: row['status']?.toString().toLowerCase() ?? 'offline',
      lastSeenAt: DateTime.tryParse(row['last_seen_at']?.toString() ?? ''),
      lockState: switch (row['lock_status']?.toString().toLowerCase()) {
        'locked' => DeviceLockState.locked,
        'unlocked' => DeviceLockState.unlocked,
        _ => DeviceLockState.unknown,
      },
      doorOpen: row['door_status']?.toString().toLowerCase() == 'open',
      packageDetected: row['package_detected'] == true,
      scaleReady: row['scale_ready'] == true,
      weightKg: (row['weight_kg'] as num?)?.toDouble(),
      batteryLevel: (row['battery_level'] as num?)?.toInt(),
      accessLevel: isOwner ? DeviceAccessLevel.owner : memberLevel,
    );
  }

  static String? _nonEmpty(Object? value) {
    final text = value?.toString().trim();
    return text == null || text.isEmpty ? null : text;
  }

  String get displayName => name ?? serial;

  bool isOnlineAt(DateTime now) {
    final seen = lastSeenAt;
    return status == 'online' &&
        seen != null &&
        now.toUtc().difference(seen.toUtc()) < onlineTimeout;
  }

  bool get canControl => accessLevel?.canControl ?? false;
  bool get isOwner => accessLevel?.isOwner ?? false;
  bool get isUnlocked => lockState == DeviceLockState.unlocked;

  Device withAccessLevel(DeviceAccessLevel? level) => Device(
        id: id,
        serial: serial,
        name: name,
        location: location,
        ownerId: ownerId,
        status: status,
        lastSeenAt: lastSeenAt,
        lockState: lockState,
        doorOpen: doorOpen,
        packageDetected: packageDetected,
        scaleReady: scaleReady,
        weightKg: weightKg,
        batteryLevel: batteryLevel,
        accessLevel: level,
      );
}
