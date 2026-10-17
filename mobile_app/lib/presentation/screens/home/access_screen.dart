import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../services/notification_service.dart';
import '../../../services/supabase_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_bubble_background.dart';

class AccessScreen extends StatefulWidget {
  const AccessScreen({super.key});

  @override
  State<AccessScreen> createState() => _AccessScreenState();
}

class _AccessScreenState extends State<AccessScreen> {
  late String _currentUserName;
  late String _currentUserEmail;

  @override
  void initState() {
    super.initState();
    _currentUserName = SupabaseService.cachedUserName;
    _currentUserEmail = SupabaseService.currentUser?.email ?? "";
    final user = SupabaseService.currentUser;
    if (user != null) {
      final initials = _currentUserName.trim().isEmpty
          ? '?'
          : _currentUserName.trim().substring(0, 1).toUpperCase();
      _members.add({
        "id": user.id,
        "name": _currentUserName,
        "email": _currentUserEmail,
        "role": "Owner",
        "roleColor": const Color(0xFF8B5CF6),
        "isOwner": true,
        "avatarText": initials,
      });
    }
  }

  final List<Map<String, dynamic>> _members = [];

  void _showInviteMemberModal() {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    String selectedRole = "Full Access";

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          context.tr(
                              vi: "Mời thành viên mới",
                              en: "Invite a new member"),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isDark
                                ? const Color(0xFFF8FAFC)
                                : AppColors.textPrimary,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: nameController,
                      decoration: InputDecoration(
                        labelText: context.tr(
                            vi: "Họ và tên thành viên", en: "Member name"),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: context.tr(
                            vi: "Địa chỉ email", en: "Email address"),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      context.tr(vi: "Quyền hạn:", en: "Permission:"),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? const Color(0xFFCBD5E1)
                            : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            label: const Text("Full Access"),
                            selected: selectedRole == "Full Access",
                            onSelected: (val) {
                              if (val)
                                setModalState(
                                    () => selectedRole = "Full Access");
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ChoiceChip(
                            label: const Text("View-only"),
                            selected: selectedRole == "View-only",
                            onSelected: (val) {
                              if (val)
                                setModalState(() => selectedRole = "View-only");
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          if (emailController.text.contains("@")) {
                            final name = nameController.text.trim().isEmpty
                                ? "Thành viên mới"
                                : nameController.text.trim();
                            setState(() {
                              _members.add({
                                "id": DateTime.now()
                                    .millisecondsSinceEpoch
                                    .toString(),
                                "name": name,
                                "email": emailController.text.trim(),
                                "role": "Invited",
                                "roleColor": const Color(0xFFF59E0B),
                                "isOwner": false,
                                "avatarText": name.isNotEmpty
                                    ? name.substring(0, 1).toUpperCase()
                                    : "?",
                              });
                            });
                            Navigator.pop(context);
                            AppToast.show(
                              context,
                              message: context.tr(
                                  vi: "Đã gửi lời mời tham gia đến ${emailController.text}!",
                                  en: "Invitation sent to ${emailController.text}!"),
                              type: ToastType.success,
                            );
                            NotificationService.create(
                              type: 'access_invited',
                              title: 'Access invitation',
                              body: context.tr(
                                vi: 'Đã gửi lời mời đến ${emailController.text.trim()}.',
                                en: 'An invitation was sent to ${emailController.text.trim()}.',
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandBlue,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                            context.tr(
                                vi: "GỬI LỜI MỜI", en: "SEND INVITATION"),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _revokeAccess(int index, Map<String, dynamic> member) {
    if (member['isOwner'] == true) {
      AppToast.show(
        context,
        message: context.tr(
            vi: "Không thể thu hồi quyền của chủ sở hữu.",
            en: "The owner's access cannot be revoked."),
        type: ToastType.error,
      );
      return;
    }

    setState(() {
      _members.removeAt(index);
    });

    AppToast.show(
      context,
      message: context.tr(
          vi: "Đã thu hồi quyền truy cập của ${member['name']}!",
          en: "Access revoked for ${member['name']}!"),
      type: ToastType.info,
    );
    NotificationService.create(
      type: 'access_revoked',
      title: 'Access revoked',
      body: context.tr(
        vi: 'Đã thu hồi quyền truy cập của ${member['name']}.',
        en: 'Access was revoked for ${member['name']}.',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText =
        isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final secondaryText =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;

    return NeonBubbleBackground(
      preset: NeonBubblePreset.iosLiquid,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 108),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      context.tr(vi: "Quyền truy cập", en: "Access"),
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: primaryText,
                        letterSpacing: -0.5,
                      ),
                    ),
                    LiquidGlassContainer(
                      borderRadius: 16,
                      blur: 16,
                      tintOpacity: 0.14,
                      padding: EdgeInsets.zero,
                      child: SizedBox(
                        width: 44,
                        height: 44,
                        child: IconButton(
                          icon: Icon(Icons.person_add_outlined,
                              size: 22,
                              color: isDark
                                  ? const Color(0xFF38BDF8)
                                  : AppColors.brandBlue),
                          onPressed: _showInviteMemberModal,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Members List Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      context.tr(
                          vi: "Thành viên chia sẻ thiết bị",
                          en: "Members with device access"),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: primaryText,
                      ),
                    ),
                    Text(
                      context.tr(
                          vi: "${_members.length} người",
                          en: "${_members.length} members"),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: secondaryText,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Shared Members Cards List
                ..._members.asMap().entries.map((entry) {
                  final index = entry.key;
                  final member = entry.value;
                  final isOwner = member['isOwner'] == true;

                  // Use dynamic cached user details for Owner if available
                  final displayName =
                      isOwner ? _currentUserName : member['name'];
                  final displayEmail =
                      isOwner ? _currentUserEmail : member['email'];

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14.0),
                    child: Dismissible(
                      key: Key(member['id']),
                      direction: isOwner
                          ? DismissDirection.none
                          : DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.85),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Icon(Icons.delete_outline_rounded,
                                color: Colors.white, size: 24),
                            SizedBox(width: 6),
                            Text(context.tr(vi: "Thu hồi", en: "Revoke"),
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13)),
                          ],
                        ),
                      ),
                      onDismissed: (_) => _revokeAccess(index, member),
                      child: LiquidGlassContainer(
                        borderRadius: 20.0,
                        blur: 18.0,
                        tintOpacity: 0.16,
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            // Avatar Badge Circle
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: (member['roleColor'] as Color)
                                    .withOpacity(0.18),
                                border: Border.all(
                                  color: (member['roleColor'] as Color)
                                      .withOpacity(0.4),
                                  width: 1.2,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  member['avatarText'],
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: member['roleColor'],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),

                            // Member Info & Role Badge
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          displayName,
                                          style: TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600,
                                            color: primaryText,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 8),

                                      // Role Badge Container
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: (member['roleColor'] as Color)
                                              .withOpacity(0.14),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          border: Border.all(
                                            color:
                                                (member['roleColor'] as Color)
                                                    .withOpacity(0.35),
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Text(
                                          member['role'],
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: member['roleColor'],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    displayEmail,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w400,
                                      color: secondaryText,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),

                            // Popup Menu Action
                            if (!isOwner)
                              PopupMenuButton<String>(
                                icon: Icon(Icons.more_vert_rounded,
                                    size: 20, color: secondaryText),
                                onSelected: (value) {
                                  if (value == 'revoke') {
                                    _revokeAccess(index, member);
                                  }
                                },
                                itemBuilder: (context) => [
                                  PopupMenuItem(
                                    value: 'revoke',
                                    child: Row(
                                      children: [
                                        Icon(Icons.remove_circle_outline,
                                            color: Colors.redAccent, size: 18),
                                        SizedBox(width: 8),
                                        Text(
                                            context.tr(
                                                vi: "Thu hồi quyền",
                                                en: "Revoke access"),
                                            style: const TextStyle(
                                                color: Colors.redAccent,
                                                fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 16),

                // Helper / Hint Row (as specified in Figma layout)
                Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.swipe_left_rounded,
                          size: 16, color: secondaryText),
                      const SizedBox(width: 6),
                      Text(
                        context.tr(
                            vi: "Vuốt thành viên sang trái để thu hồi quyền",
                            en: "Swipe left on shared members to revoke access"),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: secondaryText,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
