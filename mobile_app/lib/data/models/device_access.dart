/// Access level of the signed-in user on a device, mirroring the server
/// function `device_access_level`: the owner, or a member invited with
/// `full_control` / `view_only`.
enum DeviceAccessLevel {
  owner,
  fullControl,
  viewOnly;

  static DeviceAccessLevel? fromServer(String? value) => switch (value) {
        'owner' => DeviceAccessLevel.owner,
        'full_control' => DeviceAccessLevel.fullControl,
        'view_only' => DeviceAccessLevel.viewOnly,
        _ => null,
      };

  String get serverValue => switch (this) {
        DeviceAccessLevel.owner => 'owner',
        DeviceAccessLevel.fullControl => 'full_control',
        DeviceAccessLevel.viewOnly => 'view_only',
      };

  bool get isOwner => this == DeviceAccessLevel.owner;

  /// Owners and full-control members may queue lock/unlock commands.
  bool get canControl => this != DeviceAccessLevel.viewOnly;
}

class DeviceMember {
  final String userId;
  final String? fullName;
  final String email;
  final String? avatarUrl;
  final DeviceAccessLevel level;
  final DateTime? grantedAt;

  const DeviceMember({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.avatarUrl,
    required this.level,
    required this.grantedAt,
  });

  factory DeviceMember.fromJson(Map<String, dynamic> json) {
    final isOwner = json['is_owner'] == true;
    return DeviceMember(
      userId: json['user_id'].toString(),
      fullName: json['full_name'] as String?,
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      level: isOwner
          ? DeviceAccessLevel.owner
          : DeviceAccessLevel.fromServer(json['access_level'] as String?) ??
              DeviceAccessLevel.viewOnly,
      grantedAt: DateTime.tryParse(json['granted_at']?.toString() ?? ''),
    );
  }

  bool get isOwner => level.isOwner;

  /// Name to show, falling back to the email's local part.
  String get displayName {
    final name = fullName?.trim() ?? '';
    if (name.isNotEmpty) return name;
    final local = email.split('@').first;
    return local.isEmpty ? '?' : local;
  }

  String get initials => displayName.substring(0, 1).toUpperCase();
}
