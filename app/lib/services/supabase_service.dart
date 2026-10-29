import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/cache/session_cache.dart';
import '../core/constants/supabase_config.dart';
import '../data/models/device_access.dart';
import '../data/models/device_pin.dart';

enum PasswordChangeResult {
  success,
  wrongCurrentPassword,
  newPasswordRejected,
  failed,
}

class SupabaseService {
  static String newDeviceCommandId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex =
        bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  static bool _isInitialized = false;
  static Map<String, dynamic>? _cachedProfile;
  static String? lastAvatarError;
  static final ValueNotifier<String?> avatarUrlNotifier = ValueNotifier(null);
  static final ValueNotifier<String?> userNameNotifier = ValueNotifier(null);

  static bool get isInitialized => _isInitialized;

  static SupabaseClient? get client {
    if (!_isInitialized) return null;
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  /// Current authenticated user
  static User? get currentUser => client?.auth.currentUser;

  /// Check if an active session exists locally
  static bool get hasActiveSession => currentUser != null;

  /// Cached user full name available synchronously in memory
  static String get cachedUserName {
    if (_cachedProfile != null &&
        _cachedProfile!['full_name'] != null &&
        (_cachedProfile!['full_name'] as String).isNotEmpty) {
      return _cachedProfile!['full_name'];
    }

    final user = currentUser;
    if (user != null) {
      if (user.userMetadata?['full_name'] != null &&
          (user.userMetadata!['full_name'] as String).isNotEmpty) {
        return user.userMetadata!['full_name'];
      }
      if (user.email != null && user.email!.contains('@')) {
        final emailPrefix = user.email!.split('@').first;
        if (emailPrefix.isNotEmpty) {
          // Capitalize first letter of email username
          return emailPrefix[0].toUpperCase() + emailPrefix.substring(1);
        }
      }
    }
    return "Người dùng";
  }

  /// Safe initialization of Supabase client on App start
  static Future<bool> initialize() async {
    try {
      await Supabase.initialize(
        url: SupabaseConfig.supabaseUrl,
        anonKey: SupabaseConfig.supabaseAnonKey,
      );
      _isInitialized = true;
      debugPrint("Supabase initialized successfully.");

      // Pre-warm user profile cache if session exists
      if (currentUser != null) {
        getCurrentProfile();
      }
      return true;
    } catch (e) {
      debugPrint("Supabase initialization deferred: $e");
      _isInitialized = false;
      return false;
    }
  }

  /// Sign In with Email & Password
  static Future<AuthResponse?> signIn({
    required String email,
    required String password,
  }) async {
    if (!_isInitialized || client == null) return null;
    try {
      final response = await client!.auth.signInWithPassword(
        email: email,
        password: password,
      );
      if (response.user != null) {
        getCurrentProfile();
      }
      return response;
    } catch (e) {
      debugPrint("Supabase SignIn Error: $e");
      rethrow;
    }
  }

  /// Sign Up new user account with full_name & phone in raw_user_meta_data
  static Future<AuthResponse?> signUp({
    required String email,
    required String password,
    String? fullName,
    String? phone,
  }) async {
    if (!_isInitialized || client == null) return null;
    try {
      final response = await client!.auth.signUp(
        email: email,
        password: password,
        data: {
          if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
      );
      if (response.user != null) {
        getCurrentProfile();
      }
      return response;
    } catch (e) {
      debugPrint("Supabase SignUp Error: $e");
      rethrow;
    }
  }

  static Future<void> sendEmailOtp({
    required String email,
    required bool isPasswordReset,
  }) async {
    if (!_isInitialized || client == null) {
      throw StateError('Supabase is not initialized');
    }
    if (isPasswordReset) {
      await client!.auth.signInWithOtp(
        email: email.trim(),
        shouldCreateUser: false,
      );
    } else {
      await client!.auth.resend(
        type: OtpType.signup,
        email: email.trim(),
      );
    }
  }

  static Future<AuthResponse> verifyEmailOtp({
    required String email,
    required String token,
    required bool isPasswordReset,
  }) {
    if (!_isInitialized || client == null) {
      throw StateError('Supabase is not initialized');
    }
    return client!.auth.verifyOTP(
      email: email.trim(),
      token: token.trim(),
      type: isPasswordReset ? OtpType.email : OtpType.signup,
    );
  }

  /// Fetch User Profile from `public.profiles` table and cache in memory
  static Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    if (!_isInitialized || client == null) return null;
    final metadata = Map<String, dynamic>.from(
      currentUser?.userMetadata ?? const <String, dynamic>{},
    );
    try {
      final response = await client!
          .from('profiles')
          .select()
          .eq('id', userId)
          .maybeSingle();
      final profile = <String, dynamic>{
        ...?response,
        ...metadata,
      };
      final databaseAvatar = profile['avatar_url'] as String?;
      final metadataAvatar = metadata['avatar_url'] as String?;
      if (databaseAvatar == null || databaseAvatar.isEmpty) {
        profile['avatar_url'] = metadataAvatar;
      }

      _cachedProfile = profile;
      userNameNotifier.value = profile['full_name'] as String?;
      final avatarUrl = profile['avatar_url'] as String?;
      avatarUrlNotifier.value =
          avatarUrl == null || avatarUrl.isEmpty ? null : avatarUrl;
      return profile;
    } catch (e) {
      debugPrint("Error fetching user profile: $e");
      _cachedProfile = metadata;
      userNameNotifier.value = metadata['full_name'] as String?;
      final avatarUrl = metadata['avatar_url'] as String?;
      avatarUrlNotifier.value =
          avatarUrl == null || avatarUrl.isEmpty ? null : avatarUrl;
      return metadata.isEmpty ? null : metadata;
    }
  }

  /// Fetch Current Logged-In User Profile
  static Future<Map<String, dynamic>?> getCurrentProfile() async {
    final user = currentUser;
    if (user == null) return null;
    return await getUserProfile(user.id);
  }

  /// Clear profile cache on sign out
  static Future<void> signOut() async {
    _cachedProfile = null;
    SessionCache.clear();
    avatarUrlNotifier.value = null;
    userNameNotifier.value = null;
    if (!_isInitialized || client == null) return;
    await client!.auth.signOut();
  }

  /// Update User Password
  static Future<bool> updateUserPassword({
    required String email,
    required String newPassword,
  }) async {
    if (!_isInitialized || client == null) return false;
    try {
      if (currentUser != null) {
        await client!.auth.updateUser(
          UserAttributes(password: newPassword),
        );
        return true;
      }

      final rpcResult = await client!.rpc('reset_password_by_email', params: {
        'p_email': email.trim().toLowerCase(),
        'p_new_password': newPassword,
      });

      return rpcResult == true;
    } catch (e) {
      debugPrint("Supabase Update Password Error: $e");
      return false;
    }
  }

  /// Re-authenticates with [currentPassword] before updating, so a stolen
  /// session alone cannot change the password.
  static Future<PasswordChangeResult> changeAuthenticatedPassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final user = currentUser;
    if (!_isInitialized || client == null || user?.email == null) {
      return PasswordChangeResult.failed;
    }
    try {
      await client!.auth
          .signInWithPassword(email: user!.email!, password: currentPassword);
    } on AuthException catch (error) {
      debugPrint('Re-authenticate error: ${error.statusCode} ${error.code}');
      return error.code == 'invalid_credentials' || error.statusCode == '400'
          ? PasswordChangeResult.wrongCurrentPassword
          : PasswordChangeResult.failed;
    } catch (error) {
      debugPrint('Re-authenticate error: $error');
      return PasswordChangeResult.failed;
    }
    try {
      await client!.auth.updateUser(UserAttributes(password: newPassword));
      return PasswordChangeResult.success;
    } on AuthException catch (error) {
      debugPrint('Update password error: ${error.statusCode} ${error.code}');
      return error.code == 'same_password' || error.code == 'weak_password'
          ? PasswordChangeResult.newPasswordRejected
          : PasswordChangeResult.failed;
    } catch (error) {
      debugPrint('Update password error: $error');
      return PasswordChangeResult.failed;
    }
  }

  /// Stream real-time device status from PostgreSQL table `devices`.
  /// RLS returns owned devices plus devices shared with the user.
  static Stream<List<Map<String, dynamic>>>? getDevicesStream() {
    if (!_isInitialized || client == null || currentUser == null) return null;
    try {
      return client!.from('devices').stream(primaryKey: ['id']);
    } catch (e) {
      return null;
    }
  }

  static Stream<List<Map<String, dynamic>>>? watchDevice(String deviceId) {
    if (!_isInitialized || client == null || currentUser == null) return null;
    return client!
        .from('devices')
        .stream(primaryKey: ['id']).eq('id', deviceId);
  }

  /// Access level per device id for the signed-in user (owned + shared).
  static Future<Map<String, DeviceAccessLevel>> getMyDeviceAccessLevels(
    Iterable<Map<String, dynamic>> deviceRows,
  ) async {
    final user = currentUser;
    final levels = <String, DeviceAccessLevel>{};
    if (!_isInitialized || client == null || user == null) return levels;
    for (final row in deviceRows) {
      if (row['owner_id']?.toString() == user.id) {
        levels[row['id'].toString()] = DeviceAccessLevel.owner;
      }
    }
    try {
      final rows = await client!
          .from('device_access')
          .select('device_id, level')
          .eq('user_id', user.id);
      for (final row in rows) {
        final level = DeviceAccessLevel.fromServer(row['level'] as String?);
        if (level != null) levels[row['device_id'].toString()] = level;
      }
    } catch (error) {
      debugPrint('Load device access levels error: $error');
    }
    return levels;
  }

  static Future<bool> waitForDeviceOnline(
    String serial, {
    Duration timeout = const Duration(seconds: 45),
  }) async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      try {
        final row = await client!
            .from('devices')
            .select('status,last_seen_at')
            .eq('serial_number', serial.trim().toUpperCase())
            .eq('owner_id', currentUser!.id)
            .maybeSingle();
        final lastSeen =
            DateTime.tryParse(row?['last_seen_at']?.toString() ?? '');
        if (row?['status']?.toString().toLowerCase() == 'online' &&
            lastSeen != null &&
            DateTime.now().toUtc().difference(lastSeen.toUtc()) <
                const Duration(seconds: 90)) {
          return true;
        }
      } catch (error) {
        debugPrint('Wait for device online error: $error');
      }
      await Future<void>.delayed(const Duration(seconds: 3));
    }
    return false;
  }

  static Stream<List<Map<String, dynamic>>>? watchDeviceEvents(
      String deviceId) {
    if (!_isInitialized || client == null || currentUser == null) return null;
    return client!
        .from('device_events')
        .stream(primaryKey: ['id'])
        .eq('device_id', deviceId)
        .order('created_at', ascending: false)
        .limit(20);
  }

  static Future<bool> setDeviceAccessPin({
    required String deviceId,
    required String pin,
  }) async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    try {
      await client!.rpc(
        'set_device_access_pin',
        params: {'p_device_id': deviceId, 'p_pin': pin},
      );
      return true;
    } catch (error) {
      debugPrint('Set device access PIN error: $error');
      return false;
    }
  }

  static Future<CreatedOneTimePin?> createOneTimeDevicePin({
    required String deviceId,
    int expiresMinutes = 30,
  }) async {
    if (!_isInitialized || client == null || currentUser == null) return null;
    try {
      final result = await client!.rpc(
        'create_device_one_time_pin',
        params: {
          'p_device_id': deviceId,
          'p_expires_minutes': expiresMinutes,
        },
      );
      if (result is List && result.isNotEmpty) {
        return CreatedOneTimePin.fromJson(
            Map<String, dynamic>.from(result.first as Map));
      }
      return null;
    } catch (error) {
      debugPrint('Create one-time device PIN error: $error');
      return null;
    }
  }

  static Future<DevicePinOverview?> getDevicePinOverview(
      String deviceId) async {
    if (!_isInitialized || client == null || currentUser == null) return null;
    try {
      final result = await client!.rpc(
        'get_device_pin_overview',
        params: {'p_device_id': deviceId},
      );
      if (result is List && result.isNotEmpty) {
        return DevicePinOverview.fromJson(
            Map<String, dynamic>.from(result.first as Map));
      }
      return null;
    } catch (error) {
      debugPrint('Load PIN overview error: $error');
      return null;
    }
  }

  /// One-time PINs of the last 30 days, newest first. Null on failure.
  static Future<List<OneTimePinInfo>?> listOneTimeDevicePins(
      String deviceId) async {
    if (!_isInitialized || client == null || currentUser == null) return null;
    try {
      final result = await client!.rpc(
        'list_device_one_time_pins',
        params: {'p_device_id': deviceId},
      );
      return (result as List)
          .map((row) =>
              OneTimePinInfo.fromJson(Map<String, dynamic>.from(row as Map)))
          .toList();
    } catch (error) {
      debugPrint('List one-time PINs error: $error');
      return null;
    }
  }

  /// Expires an unused one-time PIN. False if it was already used/expired.
  static Future<bool> revokeOneTimeDevicePin(String pinId) async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    try {
      final result = await client!.rpc(
        'revoke_device_one_time_pin',
        params: {'p_pin_id': pinId},
      );
      return result == true;
    } catch (error) {
      debugPrint('Revoke one-time PIN error: $error');
      return false;
    }
  }

  // ──────────────────────────────────────
  // Device sharing
  // ──────────────────────────────────────

  static String? lastSharingError;

  /// Owner + members of a device. Null on failure.
  static Future<List<DeviceMember>?> listDeviceMembers(String deviceId) async {
    if (!_isInitialized || client == null || currentUser == null) return null;
    try {
      final result = await client!.rpc(
        'list_device_members',
        params: {'p_device_id': deviceId},
      );
      return (result as List)
          .map((row) =>
              DeviceMember.fromJson(Map<String, dynamic>.from(row as Map)))
          .toList();
    } catch (error) {
      debugPrint('List device members error: $error');
      return null;
    }
  }

  /// Shares a device with a registered user. Inviting an existing member
  /// again updates their access level.
  static Future<bool> inviteDeviceMember({
    required String deviceId,
    required String email,
    required DeviceAccessLevel level,
  }) async {
    lastSharingError = null;
    if (!_isInitialized || client == null || currentUser == null) {
      lastSharingError = sharingErrorMessage('Authentication required');
      return false;
    }
    try {
      await client!.rpc(
        'invite_device_member',
        params: {
          'p_device_id': deviceId,
          'p_email': email.trim().toLowerCase(),
          'p_access_level': level.serverValue,
        },
      );
      return true;
    } catch (error) {
      debugPrint('Invite device member error: $error');
      lastSharingError = sharingErrorMessage(error);
      return false;
    }
  }

  static Future<bool> revokeDeviceMember({
    required String deviceId,
    required String userId,
  }) async {
    lastSharingError = null;
    if (!_isInitialized || client == null || currentUser == null) return false;
    try {
      final result = await client!.rpc(
        'revoke_device_member',
        params: {'p_device_id': deviceId, 'p_user_id': userId},
      );
      return result == true;
    } catch (error) {
      debugPrint('Revoke device member error: $error');
      lastSharingError = sharingErrorMessage(error);
      return false;
    }
  }

  /// Maps server exceptions of the sharing RPCs to Vietnamese messages.
  static String sharingErrorMessage(Object error) {
    final message = error.toString();
    if (message.contains('Authentication required')) {
      return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
    }
    if (message.contains('User not found')) {
      return 'Email này chưa đăng ký tài khoản Anchor Box.';
    }
    if (message.contains('Cannot invite yourself')) {
      return 'Bạn đã là chủ sở hữu của hộp này.';
    }
    if (message.contains('not owned by user') ||
        message.contains('Device not found')) {
      return 'Chỉ chủ sở hữu mới quản lý được thành viên của hộp.';
    }
    return 'Không thể cập nhật quyền truy cập. Vui lòng thử lại.';
  }

  static Future<bool> queueDeviceCommand({
    required String commandId,
    required String deviceId,
    required String command,
  }) async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    try {
      await client!.from('device_commands').insert({
        'id': commandId,
        'device_id': deviceId,
        'command': command.toUpperCase(),
        'requested_by': currentUser!.id,
      });
      return true;
    } catch (error) {
      debugPrint('Queue device command error: $error');
      return false;
    }
  }

  /// Claims an unowned physical box by its public serial number.
  /// Ownership is assigned in PostgreSQL using auth.uid(); clients cannot
  /// choose another owner id.
  static Future<Map<String, dynamic>?> claimDeviceBySerial(
      String serial) async {
    lastDevicePairingError = null;
    if (!_isInitialized || client == null || currentUser == null) {
      lastDevicePairingError = 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
      return null;
    }
    try {
      final result = await client!.rpc(
        'claim_device_by_serial',
        params: {'p_serial_number': serial.trim().toUpperCase()},
      );
      Map<String, dynamic>? device;
      if (result is List && result.isNotEmpty) {
        device = Map<String, dynamic>.from(result.first as Map);
      } else if (result is Map) {
        device = Map<String, dynamic>.from(result);
      }
      if (device == null || device['owner_id']?.toString() != currentUser!.id) {
        lastDevicePairingError =
            'Không thể xác nhận quyền sở hữu Hộp. Vui lòng thử lại.';
        return null;
      }
      return device;
    } catch (error) {
      debugPrint('Claim device error: $error');
      lastDevicePairingError = _pairingErrorMessage(error);
      return null;
    }
  }

  static Future<bool> unbindDevice(String deviceId) async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    try {
      final result = await client!.rpc(
        'unbind_owned_device',
        params: {'p_device_id': deviceId},
      );
      return result == true;
    } catch (error) {
      debugPrint('Unbind device error: $error');
      return false;
    }
  }

  static Future<Map<String, String>?> startDevicePairing(String serial) async {
    lastDevicePairingError = null;
    if (!_isInitialized || client == null || currentUser == null) {
      lastDevicePairingError = 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
      return null;
    }
    try {
      final result = await client!.rpc(
        'start_device_pairing',
        params: {'p_serial_number': serial.trim().toUpperCase()},
      );

      if (result is Map) {
        return {
          'challenge_id': result['challenge_id']?.toString() ?? '',
          'otp_code': result['otp_code']?.toString() ?? '',
        };
      } else if (result != null) {
        return {
          'challenge_id': result.toString(),
          'otp_code': '',
        };
      }
      return null;
    } catch (error) {
      lastDevicePairingError = _pairingErrorMessage(error);
      debugPrint('Start device pairing error: $error');
      return null;
    }
  }

  static Future<Map<String, dynamic>?> confirmDevicePairing({
    required String challengeId,
    required String otp,
  }) async {
    lastDevicePairingError = null;
    if (!_isInitialized || client == null || currentUser == null) {
      lastDevicePairingError = 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
      return null;
    }
    try {
      final result = await client!.rpc(
        'confirm_device_pairing',
        params: {'p_challenge_id': challengeId, 'p_otp_code': otp.trim()},
      );
      if (result is List && result.isNotEmpty) {
        return Map<String, dynamic>.from(result.first as Map);
      }
      return null;
    } catch (error) {
      lastDevicePairingError = _pairingErrorMessage(error);
      debugPrint('Confirm device pairing error: $error');
      return null;
    }
  }

  static String? lastDevicePairingError;

  static String _pairingErrorMessage(Object error) {
    final message = error.toString();
    if (message.contains('Authentication required')) {
      return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
    }
    if (message.contains('Device not found')) {
      return 'Không tìm thấy mã hộp này.';
    }
    if (message.contains('Device already belongs')) {
      return 'Hộp đã được liên kết với một tài khoản khác.';
    }
    if (message.contains('Invalid OTP')) return 'Mã OTP không đúng.';
    if (message.contains('OTP expired')) return 'Mã OTP đã hết hạn.';
    if (message.contains('OTP already used')) return 'Mã OTP đã được sử dụng.';
    if (message.contains('Too many attempts')) {
      return 'Bạn đã nhập sai OTP quá số lần cho phép.';
    }
    return 'Không thể kết nối hộp. Vui lòng thử lại.';
  }

  // ──────────────────────────────────────
  // Avatar Upload & Management
  // ──────────────────────────────────────

  /// Cached avatar URL for synchronous access
  static String? get cachedAvatarUrl {
    final cachedUrl = _cachedProfile?['avatar_url'] as String?;
    if (cachedUrl != null && cachedUrl.isNotEmpty) return cachedUrl;
    final metadataUrl = currentUser?.userMetadata?['avatar_url'] as String?;
    return metadataUrl == null || metadataUrl.isEmpty ? null : metadataUrl;
  }

  /// Upload avatar image bytes to Supabase Storage 'avatars' bucket
  /// Returns the public URL of the uploaded image, or null on failure
  static Future<String?> uploadAvatar(
      List<int> imageBytes, String fileExtension) async {
    if (!_isInitialized || client == null || currentUser == null) return null;
    lastAvatarError = null;
    try {
      final userId = currentUser!.id;
      final normalizedExtension = fileExtension.toLowerCase() == 'jpeg'
          ? 'jpg'
          : fileExtension.toLowerCase();
      final objectPath = '$userId/avatar.$normalizedExtension';

      // Map file extension to correct MIME type (jpg → image/jpeg)
      final mimeType = normalizedExtension == 'jpg'
          ? 'image/jpeg'
          : 'image/$normalizedExtension';

      await client!.storage.from('avatars').uploadBinary(
            objectPath,
            Uint8List.fromList(imageBytes),
            fileOptions: FileOptions(
              upsert: true,
              contentType: mimeType,
            ),
          );

      final publicUrl =
          client!.storage.from('avatars').getPublicUrl(objectPath);
      // Bust browser / Flutter cache by appending timestamp query param
      final cachedUrl = '$publicUrl?t=${DateTime.now().millisecondsSinceEpoch}';
      return cachedUrl;
    } on StorageException catch (error) {
      lastAvatarError = error.message;
      debugPrint(
        'Avatar upload error (${error.statusCode}/${error.error}): ${error.message}',
      );
      return null;
    } catch (error) {
      lastAvatarError = error.toString();
      debugPrint("Avatar upload error: $error");
      return null;
    }
  }

  /// Removes the current user's avatar objects from Storage.
  static Future<bool> removeAvatar() async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    try {
      final folder = currentUser!.id;
      final objects = await client!.storage.from('avatars').list(path: folder);
      if (objects.isNotEmpty) {
        await client!.storage.from('avatars').remove(
              objects.map((object) => '$folder/${object.name}').toList(),
            );
      }
      return await updateProfileAvatarUrl('');
    } catch (error) {
      debugPrint('Avatar removal error: $error');
      return false;
    }
  }

  /// Update avatar_url column in profiles table and refresh cache
  static Future<bool> updateProfileAvatarUrl(String avatarUrl) async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    var savedToAuth = false;
    var savedToProfile = false;

    try {
      await client!.auth.updateUser(
        UserAttributes(data: {'avatar_url': avatarUrl}),
      );
      savedToAuth = true;
    } catch (error) {
      debugPrint('Error updating avatar_url in auth metadata: $error');
    }

    try {
      await client!
          .from('profiles')
          .update({'avatar_url': avatarUrl}).eq('id', currentUser!.id);
      savedToProfile = true;
    } catch (error) {
      debugPrint("Error updating avatar_url in profiles: $error");
    }

    if (savedToAuth || savedToProfile) {
      // Update in-memory cache
      _cachedProfile ??= {};
      _cachedProfile!['avatar_url'] = avatarUrl;
      avatarUrlNotifier.value = avatarUrl.isEmpty ? null : avatarUrl;
      return true;
    }

    return false;
  }

  static Future<bool> updateCurrentProfile({
    required String fullName,
    required String phone,
  }) async {
    if (!_isInitialized || client == null || currentUser == null) return false;
    final values = <String, dynamic>{
      'full_name': fullName.trim(),
      'phone': phone.trim(),
    };
    var savedToAuth = false;
    var savedToProfile = false;

    try {
      await client!.auth.updateUser(UserAttributes(data: values));
      savedToAuth = true;
    } catch (error) {
      debugPrint('Error updating profile auth metadata: $error');
    }

    try {
      await client!.from('profiles').update(values).eq('id', currentUser!.id);
      savedToProfile = true;
    } catch (error) {
      debugPrint('Error updating profiles row: $error');
    }

    if (savedToAuth || savedToProfile) {
      _cachedProfile ??= {};
      _cachedProfile!.addAll(values);
      userNameNotifier.value = fullName.trim();
      return true;
    }
    return false;
  }
}
