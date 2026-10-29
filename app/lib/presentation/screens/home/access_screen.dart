import 'package:flutter/material.dart';

import '../../../core/cache/session_cache.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/form_validators.dart';
import '../../../data/models/device_access.dart';
import '../../../services/supabase_service.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/owned_device_picker.dart';

/// Sharing tab: share an owned box with other registered users.
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

enum _MemberAction { fullControl, viewOnly, revoke }

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
        // Show the last known members at once, then refresh them.
        _members = device == null
            ? const []
            : SessionCache.get<List<DeviceMember>>(_membersKey(device.id)) ??
                const [];
        _loadFailed = false;
      }
    });
    if (device != null && changed) _reload();
  }

  static String _membersKey(String deviceId) => 'members:$deviceId';

  Future<void> _reload() async {
    final deviceId = _deviceId;
    if (deviceId == null) return;
    setState(() => _loading = true);
    final members = await SupabaseService.listDeviceMembers(deviceId);
    if (!mounted || _deviceId != deviceId) return;
    if (members != null) SessionCache.set(_membersKey(deviceId), members);
    setState(() {
      _loading = false;
      // Keep showing cached members when only the refresh failed.
      _loadFailed = members == null && _members.isEmpty;
      _members = members ?? _members;
    });
  }

  Future<void> _showInviteSheet() async {
    final deviceId = _deviceId;
    if (deviceId == null || _busy) return;
    final invite = await showModalBottomSheet<_InviteRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _InviteMemberSheet(deviceName: _deviceName),
    );
    if (invite == null || !mounted) return;
    await _invite(deviceId, invite.email, invite.level);
  }

  Future<void> _invite(
    String deviceId,
    String email,
    DeviceAccessLevel level,
  ) async {
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

  Future<void> _openMember(DeviceMember member) async {
    final deviceId = _deviceId;
    if (deviceId == null || _busy || member.isOwner) return;
    final action = await showChoiceSheet<_MemberAction>(
      context,
      title: member.displayName,
      message: member.email,
      selected: member.level == DeviceAccessLevel.fullControl
          ? _MemberAction.fullControl
          : _MemberAction.viewOnly,
      options: [
        ChoiceOption(
          value: _MemberAction.fullControl,
          label: context.tr(vi: 'Toàn quyền', en: 'Full access'),
          subtitle: context.tr(
            vi: 'Xem trạng thái và mở/khóa từ xa.',
            en: 'View status and lock/unlock remotely.',
          ),
          icon: AppIcons.unlock,
          iconColor: context.colors.locked,
        ),
        ChoiceOption(
          value: _MemberAction.viewOnly,
          label: context.tr(vi: 'Chỉ xem', en: 'View only'),
          subtitle: context.tr(
            vi: 'Xem trạng thái và lịch sử, không mở khóa.',
            en: 'View status and history, no unlocking.',
          ),
          icon: AppIcons.viewOnly,
          iconColor: context.colors.unlocked,
        ),
        ChoiceOption(
          value: _MemberAction.revoke,
          label: context.tr(vi: 'Thu hồi quyền', en: 'Remove access'),
          icon: AppIcons.userRemove,
          destructive: true,
        ),
      ],
    );
    if (action == null || !mounted) return;
    switch (action) {
      case _MemberAction.fullControl
          when member.level != DeviceAccessLevel.fullControl:
        await _invite(deviceId, member.email, DeviceAccessLevel.fullControl);
      case _MemberAction.viewOnly
          when member.level != DeviceAccessLevel.viewOnly:
        await _invite(deviceId, member.email, DeviceAccessLevel.viewOnly);
      case _MemberAction.revoke:
        await _revoke(member);
      default:
        break;
    }
  }

  Future<void> _revoke(DeviceMember member) async {
    final deviceId = _deviceId;
    if (deviceId == null || _busy) return;
    final confirmed = await showConfirmDialog(
      context,
      title: context.tr(vi: 'Thu hồi quyền truy cập?', en: 'Remove access?'),
      message: context.tr(
        vi: '${member.displayName} sẽ không còn xem hoặc mở được $_deviceName.',
        en: '${member.displayName} will no longer see or open $_deviceName.',
      ),
      confirmLabel: context.tr(vi: 'Thu hồi', en: 'Remove'),
      destructive: true,
    );
    if (!confirmed || !mounted) return;

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
              en: 'Access removed for ${member.displayName}.')
          : (SupabaseService.lastSharingError ??
              context.tr(
                  vi: 'Không thể thu hồi quyền.',
                  en: 'Could not remove access.')),
      type: ok ? ToastType.success : ToastType.error,
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: context.tr(vi: 'Chia sẻ', en: 'Sharing'),
      subtitle: context.tr(
        vi: 'Cho người thân cùng xem và mở hộp.',
        en: 'Let family members see and open your box.',
      ),
      showBackButton: widget.showBackButton,
      onRefresh: _reload,
      children: [
        const SizedBox(height: AppSpacing.md),
        OwnedDevicePicker(
          selectedDeviceId: _deviceId,
          onChanged: _selectDevice,
        ),
        if (_deviceId != null) ..._buildMembers(),
      ],
    );
  }

  List<Widget> _buildMembers() {
    final header = SectionHeader(
      title: context.tr(vi: 'Thành viên', en: 'Members'),
      action: HeaderButton(
        icon: AppIcons.plus,
        label: context.tr(vi: 'Mời', en: 'Invite'),
        onPressed: _busy ? null : _showInviteSheet,
      ),
    );

    if (_loading && _members.isEmpty) {
      return [
        header,
        const Padding(
          padding: EdgeInsets.only(top: AppSpacing.xl),
          child: Center(child: CircularProgressIndicator.adaptive()),
        ),
      ];
    }
    if (_loadFailed) {
      return [
        header,
        EmptyState(
          icon: AppIcons.wifiOff,
          title: context.tr(vi: 'Không tải được', en: 'Could not load'),
          message: context.tr(
            vi: 'Kéo xuống để thử lại.',
            en: 'Pull down to try again.',
          ),
        ),
      ];
    }

    final colors = context.colors;
    return [
      header,
      GroupedSection(
        footer: _members.length <= 1
            ? context.tr(
                vi: 'Chưa chia sẻ với ai. Người được mời cần có tài khoản Anchor Box.',
                en: 'Not shared yet. Invitees need an Anchor Box account.',
              )
            : context.tr(
                vi: 'Chạm vào thành viên để đổi quyền hoặc thu hồi.',
                en: 'Tap a member to change or remove access.',
              ),
        children: [
          for (final member in _members)
            GroupedTile(
              leading: UserAvatar(
                name: member.displayName,
                imageUrl: member.avatarUrl,
                size: 36,
                color: _roleColor(colors, member.level),
              ),
              title: member.displayName,
              subtitle: member.email,
              trailing: StatusPill(
                label: _roleLabel(member.level),
                color: _roleColor(colors, member.level),
              ),
              onTap: member.isOwner || _busy ? null : () => _openMember(member),
            ),
        ],
      ),
    ];
  }

  String _roleLabel(DeviceAccessLevel level) => switch (level) {
        DeviceAccessLevel.owner => context.tr(vi: 'Chủ hộp', en: 'Owner'),
        DeviceAccessLevel.fullControl =>
          context.tr(vi: 'Toàn quyền', en: 'Full access'),
        DeviceAccessLevel.viewOnly =>
          context.tr(vi: 'Chỉ xem', en: 'View only'),
      };

  Color _roleColor(AppColors colors, DeviceAccessLevel level) =>
      switch (level) {
        DeviceAccessLevel.owner => colors.purple,
        DeviceAccessLevel.fullControl => colors.locked,
        DeviceAccessLevel.viewOnly => colors.unlocked,
      };
}

class _InviteRequest {
  final String email;
  final DeviceAccessLevel level;

  const _InviteRequest(this.email, this.level);
}

/// Owns its controller and validation; pops an [_InviteRequest] when valid.
class _InviteMemberSheet extends StatefulWidget {
  final String deviceName;

  const _InviteMemberSheet({required this.deviceName});

  @override
  State<_InviteMemberSheet> createState() => _InviteMemberSheetState();
}

class _InviteMemberSheetState extends State<_InviteMemberSheet> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  DeviceAccessLevel _level = DeviceAccessLevel.viewOnly;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.pop(
      context,
      _InviteRequest(_emailController.text.trim(), _level),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    GroupedTile levelTile(
      DeviceAccessLevel level,
      IconData icon,
      Color color,
      String title,
      String subtitle,
    ) {
      return GroupedTile(
        leading: IconBadge(icon: icon, color: color, size: 30),
        title: title,
        subtitle: subtitle,
        showChevron: false,
        trailing: _level == level
            ? Icon(AppIcons.check, color: colors.accent, size: 20)
            : null,
        onTap: () => setState(() => _level = level),
      );
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.md,
        0,
        AppSpacing.md,
        MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.tr(vi: 'Mời thành viên', en: 'Invite a member'),
              textAlign: TextAlign.center,
              style: context.text.titleMedium,
            ),
            const SizedBox(height: AppSpacing.xxs),
            Text(
              context.tr(
                vi: 'Chia sẻ ${widget.deviceName} với người đã có tài khoản Anchor Box.',
                en: 'Share ${widget.deviceName} with someone who has an Anchor Box account.',
              ),
              textAlign: TextAlign.center,
              style: context.text.bodySmall,
            ),
            const SizedBox(height: AppSpacing.lg),
            AppTextField(
              controller: _emailController,
              label: context.tr(vi: 'Email', en: 'Email'),
              prefixIcon: AppIcons.email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              autofocus: true,
              autofillHints: const [AutofillHints.email],
              validator: FormValidators.email(context),
              onSubmitted: (_) => _submit(),
            ),
            GroupedSection(
              header: context.tr(vi: 'Quyền hạn', en: 'Permission'),
              children: [
                levelTile(
                  DeviceAccessLevel.viewOnly,
                  AppIcons.viewOnly,
                  colors.unlocked,
                  context.tr(vi: 'Chỉ xem', en: 'View only'),
                  context.tr(
                    vi: 'Xem trạng thái và lịch sử, không mở khóa.',
                    en: 'View status and history, no unlocking.',
                  ),
                ),
                levelTile(
                  DeviceAccessLevel.fullControl,
                  AppIcons.unlock,
                  colors.locked,
                  context.tr(vi: 'Toàn quyền', en: 'Full access'),
                  context.tr(
                    vi: 'Xem trạng thái và mở/khóa từ xa.',
                    en: 'View status and lock/unlock remotely.',
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            AppButton(
              label: context.tr(vi: 'Gửi lời mời', en: 'Send invite'),
              icon: AppIcons.userAdd,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}
