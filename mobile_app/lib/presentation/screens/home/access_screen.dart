import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../data/models/device_access.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/ios26_back_button.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';
import '../../widgets/owned_device_picker.dart';

/// Access tab: share an owned box with other registered users.
/// Also pushed from the device detail screen with [initialDeviceId].
class AccessScreen extends StatefulWidget {
  final String? initialDeviceId;
  final bool showBackButton;

  const AccessScreen({
    super.key,
    this.initialDeviceId,
    this.showBackButton = false,
  });

  @override
  State<AccessScreen> createState() => _AccessScreenState();
}

class _AccessScreenState extends State<AccessScreen> {
  String? _deviceId;
  String _deviceName = '';
  List<DeviceMember> _members = const [];
  bool _loading = false;
  bool _loadFailed = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _deviceId = widget.initialDeviceId;
  }

  void _selectDevice(OwnedDevice? device) {
    final changed = device?.id != _deviceId || _members.isEmpty;
    setState(() {
      _deviceId = device?.id;
      _deviceName = device?.name ?? '';
      if (changed) {
        _members = const [];
        _loadFailed = false;
      }
    });
    if (device != null && changed) _reload();
  }

  Future<void> _reload() async {
    final deviceId = _deviceId;
    if (deviceId == null) return;
    setState(() => _loading = true);
    final members = await SupabaseService.listDeviceMembers(deviceId);
    if (!mounted || _deviceId != deviceId) return;
    setState(() {
      _loading = false;
      _loadFailed = members == null;
      _members = members ?? const [];
    });
  }

  Future<void> _showInviteSheet() async {
    final deviceId = _deviceId;
    if (deviceId == null || _busy) return;
    final invite = await showModalBottomSheet<_InviteRequest>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const _InviteMemberSheet(),
    );
    if (invite == null || !mounted) return;
    await _invite(deviceId, invite.email, invite.level);
  }

  Future<void> _invite(
      String deviceId, String email, DeviceAccessLevel level) async {
    setState(() => _busy = true);
    final ok = await SupabaseService.inviteDeviceMember(
      deviceId: deviceId,
      email: email,
      level: level,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    AppToast.show(
      context,
      message: ok
          ? context.tr(
              vi: 'Đã chia sẻ $_deviceName với $email.',
              en: '$_deviceName is now shared with $email.')
          : (SupabaseService.lastSharingError ??
              context.tr(
                  vi: 'Không thể chia sẻ hộp.',
                  en: 'Could not share the box.')),
      type: ok ? ToastType.success : ToastType.error,
    );
    if (ok) _reload();
  }

  Future<void> _changeLevel(DeviceMember member) async {
    final deviceId = _deviceId;
    if (deviceId == null) return;
    final next = member.level == DeviceAccessLevel.fullControl
        ? DeviceAccessLevel.viewOnly
        : DeviceAccessLevel.fullControl;
    await _invite(deviceId, member.email, next);
  }

  Future<bool> _confirmRevoke(DeviceMember member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(dialogContext.tr(
            vi: 'Thu hồi quyền truy cập?', en: 'Revoke access?')),
        content: Text(dialogContext.tr(
          vi: '${member.displayName} sẽ không còn xem hoặc mở được $_deviceName.',
          en: '${member.displayName} will no longer see or open $_deviceName.',
        )),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(dialogContext.tr(vi: 'Hủy', en: 'Cancel')),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(dialogContext.tr(vi: 'Thu hồi', en: 'Revoke')),
          ),
        ],
      ),
    );
    return confirmed == true;
  }

  Future<void> _revoke(DeviceMember member) async {
    final deviceId = _deviceId;
    if (deviceId == null || _busy) return;
    if (!await _confirmRevoke(member) || !mounted) return;

    setState(() => _busy = true);
    final ok = await SupabaseService.revokeDeviceMember(
      deviceId: deviceId,
      userId: member.userId,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    AppToast.show(
      context,
      message: ok
          ? context.tr(
              vi: 'Đã thu hồi quyền của ${member.displayName}.',
              en: 'Access revoked for ${member.displayName}.')
          : (SupabaseService.lastSharingError ??
              context.tr(
                  vi: 'Không thể thu hồi quyền.',
                  en: 'Could not revoke access.')),
      type: ok ? ToastType.success : ToastType.error,
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText =
        isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final secondaryText =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;
    final accent = isDark ? const Color(0xFF38BDF8) : AppColors.brandBlue;

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.fromLTRB(
                  20, 16, 20, widget.showBackButton ? 32 : 108),
              children: [
                if (widget.showBackButton) ...[
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Ios26BackButton(),
                  ),
                  const SizedBox(height: 16),
                ],
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        context.tr(vi: 'Quyền truy cập', en: 'Access'),
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: primaryText,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    if (_deviceId != null)
                      LiquidGlassContainer(
                        borderRadius: 16,
                        blur: 16,
                        tintOpacity: 0.14,
                        padding: EdgeInsets.zero,
                        child: SizedBox(
                          width: 44,
                          height: 44,
                          child: IconButton(
                            tooltip: context.tr(
                                vi: 'Mời thành viên', en: 'Invite member'),
                            icon: Icon(Icons.person_add_outlined,
                                size: 22, color: accent),
                            onPressed: _busy ? null : _showInviteSheet,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                OwnedDevicePicker(
                  selectedDeviceId: _deviceId,
                  onChanged: _selectDevice,
                ),
                if (_deviceId != null) ...[
                  const SizedBox(height: 20),
                  Text(
                    context.tr(
                        vi: 'Thành viên chia sẻ thiết bị',
                        en: 'Members with device access'),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: primaryText,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_loading && _members.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 32),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_loadFailed)
                    Text(
                      context.tr(
                        vi: 'Không tải được danh sách thành viên. Kéo xuống để thử lại.',
                        en: 'Could not load members. Pull down to retry.',
                      ),
                      style: TextStyle(color: secondaryText),
                    )
                  else ...[
                    ..._members.map((member) =>
                        _buildMemberCard(member, primaryText, secondaryText)),
                    if (_members.length <= 1)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          context.tr(
                            vi: 'Chưa chia sẻ với ai. Nhấn biểu tượng + để mời người đã có tài khoản.',
                            en: 'Not shared yet. Tap + to invite someone who has an account.',
                          ),
                          style: TextStyle(color: secondaryText, fontSize: 13),
                        ),
                      ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMemberCard(
      DeviceMember member, Color primaryText, Color secondaryText) {
    final (roleLabel, roleColor) = switch (member.level) {
      DeviceAccessLevel.owner => (
          context.tr(vi: 'Chủ sở hữu', en: 'Owner'),
          const Color(0xFF8B5CF6)
        ),
      DeviceAccessLevel.fullControl => (
          context.tr(vi: 'Toàn quyền', en: 'Full access'),
          const Color(0xFF10B981)
        ),
      DeviceAccessLevel.viewOnly => (
          context.tr(vi: 'Chỉ xem', en: 'View only'),
          const Color(0xFFF59E0B)
        ),
    };

    final card = LiquidGlassContainer(
      borderRadius: 20,
      blur: 18,
      tintOpacity: 0.16,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: roleColor.withValues(alpha: 0.18),
              border: Border.all(
                  color: roleColor.withValues(alpha: 0.4), width: 1.2),
            ),
            child: Center(
              child: Text(
                member.initials,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: roleColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        member.displayName,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: primaryText,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: roleColor.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: roleColor.withValues(alpha: 0.35),
                            width: 0.8),
                      ),
                      child: Text(
                        roleLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: roleColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  member.email,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: secondaryText),
                ),
              ],
            ),
          ),
          if (!member.isOwner)
            PopupMenuButton<String>(
              enabled: !_busy,
              icon:
                  Icon(Icons.more_vert_rounded, size: 20, color: secondaryText),
              onSelected: (value) {
                if (value == 'level') _changeLevel(member);
                if (value == 'revoke') _revoke(member);
              },
              itemBuilder: (menuContext) => [
                PopupMenuItem(
                  value: 'level',
                  child: Text(member.level == DeviceAccessLevel.fullControl
                      ? menuContext.tr(
                          vi: 'Chuyển sang Chỉ xem', en: 'Change to View only')
                      : menuContext.tr(
                          vi: 'Chuyển sang Toàn quyền',
                          en: 'Change to Full access')),
                ),
                PopupMenuItem(
                  value: 'revoke',
                  child: Text(
                    menuContext.tr(vi: 'Thu hồi quyền', en: 'Revoke access'),
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ),
              ],
            ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: member.isOwner
          ? card
          : Dismissible(
              key: ValueKey('member-${member.userId}'),
              direction: DismissDirection.endToStart,
              confirmDismiss: (_) async {
                await _revoke(member);
                return false; // The list reloads from the server instead.
              },
              background: Container(
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  context.tr(vi: 'Thu hồi', en: 'Revoke'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
              child: card,
            ),
    );
  }
}

class _InviteRequest {
  final String email;
  final DeviceAccessLevel level;

  const _InviteRequest(this.email, this.level);
}

/// Bottom sheet that owns its controller and validation; pops an
/// [_InviteRequest] when the input is valid.
class _InviteMemberSheet extends StatefulWidget {
  const _InviteMemberSheet();

  @override
  State<_InviteMemberSheet> createState() => _InviteMemberSheetState();
}

class _InviteMemberSheetState extends State<_InviteMemberSheet> {
  final TextEditingController _emailController = TextEditingController();
  DeviceAccessLevel _level = DeviceAccessLevel.viewOnly;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _submit() {
    final email = _emailController.text.trim();
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(() => _error =
          context.tr(vi: 'Email không hợp lệ.', en: 'Invalid email address.'));
      return;
    }
    Navigator.pop(context, _InviteRequest(email, _level));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText =
        isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final secondaryText =
        isDark ? const Color(0xFFCBD5E1) : AppColors.textSecondary;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        top: 20,
        left: 16,
        right: 16,
      ),
      child: LiquidGlassContainer(
        borderRadius: 24,
        blur: 28,
        tintOpacity: 0.25,
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.tr(vi: 'Mời thành viên', en: 'Invite a member'),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: primaryText,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            Text(
              context.tr(
                vi: 'Người được mời phải đã đăng ký tài khoản Anchor Box.',
                en: 'The invitee must already have an Anchor Box account.',
              ),
              style: TextStyle(fontSize: 12.5, color: secondaryText),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              autofocus: true,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: context.tr(vi: 'Địa chỉ email', en: 'Email address'),
                errorText: _error,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              context.tr(vi: 'Quyền hạn:', en: 'Permission:'),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: secondaryText,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: Text(context.tr(vi: 'Chỉ xem', en: 'View only')),
                    selected: _level == DeviceAccessLevel.viewOnly,
                    onSelected: (_) =>
                        setState(() => _level = DeviceAccessLevel.viewOnly),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ChoiceChip(
                    label:
                        Text(context.tr(vi: 'Toàn quyền', en: 'Full access')),
                    selected: _level == DeviceAccessLevel.fullControl,
                    onSelected: (_) =>
                        setState(() => _level = DeviceAccessLevel.fullControl),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              _level == DeviceAccessLevel.fullControl
                  ? context.tr(
                      vi: 'Xem trạng thái và mở/đóng khóa từ xa.',
                      en: 'Can view status and lock/unlock remotely.')
                  : context.tr(
                      vi: 'Chỉ xem trạng thái và lịch sử, không mở khóa được.',
                      en: 'Can view status and history but cannot unlock.'),
              style: TextStyle(fontSize: 12, color: secondaryText),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brandBlue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  context.tr(vi: 'CHIA SẺ', en: 'SHARE'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
