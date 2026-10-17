import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/localization/language_controller.dart';
import '../../../services/notification_service.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/liquid_glass_segmented_control.dart';
import '../../widgets/neon_bubble_background.dart';

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key});

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  int _selectedFilterIndex =
      0; // 0: Permanent, 1: Temporary, 2: One-time, 3: All
  final Map<String, bool> _revealedPins = {};

  final List<Map<String, dynamic>> _pinCodes = [];

  void _showAddPinModal() {
    final titleController = TextEditingController();
    final codeController = TextEditingController();
    String selectedType = "Permanent";

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
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
                      context.tr(vi: "Tạo mã PIN mới", en: "Create a new PIN"),
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
                  controller: titleController,
                  decoration: InputDecoration(
                    labelText: context.tr(
                        vi: "Tên mã PIN (Ví dụ: Người giao hàng, Bạn bè)",
                        en: "PIN name (e.g. Courier, Friends)"),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  decoration: InputDecoration(
                    labelText: context.tr(vi: "Mã PIN 4 số", en: "4-digit PIN"),
                    border: OutlineInputBorder(),
                    counterText: "",
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      if (titleController.text.isNotEmpty &&
                          codeController.text.length == 4) {
                        setState(() {
                          _pinCodes.insert(0, {
                            "id": DateTime.now()
                                .millisecondsSinceEpoch
                                .toString(),
                            "title": titleController.text.trim(),
                            "code": codeController.text.trim(),
                            "type": selectedType,
                            "subtext": "Mới tạo hôm nay",
                            "badge": "New",
                            "badgeColor": AppColors.brandBlue,
                          });
                        });
                        Navigator.pop(context);
                        AppToast.show(
                          context,
                          message: context.tr(
                              vi: "Đã tạo mã PIN thành công!",
                              en: "PIN created successfully!"),
                          type: ToastType.success,
                        );
                        NotificationService.create(
                          type: 'pin_created',
                          title: 'PIN created',
                          body: context.tr(
                            vi: 'Mã PIN ${titleController.text.trim()} đã được tạo.',
                            en: 'PIN ${titleController.text.trim()} was created.',
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
                    child: Text(context.tr(vi: "TẠO MÃ PIN", en: "CREATE PIN"),
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText =
        isDark ? const Color(0xFFF8FAFC) : AppColors.textPrimary;
    final secondaryText =
        isDark ? const Color(0xFFA7B5C8) : AppColors.textSecondary;

    List<Map<String, dynamic>> filteredList = _pinCodes;
    if (_selectedFilterIndex == 0) {
      filteredList =
          _pinCodes.where((item) => item['type'] == 'Permanent').toList();
    } else if (_selectedFilterIndex == 1) {
      filteredList =
          _pinCodes.where((item) => item['type'] == 'Temporary').toList();
    } else if (_selectedFilterIndex == 2) {
      filteredList =
          _pinCodes.where((item) => item['type'] == 'One-time').toList();
    }

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
                // Header & Add Action Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      context.tr(vi: "Mã PIN", en: "PIN Codes"),
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
                          icon: Icon(Icons.add_rounded,
                              size: 24,
                              color: isDark
                                  ? const Color(0xFF38BDF8)
                                  : AppColors.brandBlue),
                          onPressed: _showAddPinModal,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Category Filter Tabs
                LiquidGlassSegmentedControl(
                  height: 44,
                  borderRadius: 22,
                  selectorBorderRadius: 18,
                  selectedIndex: _selectedFilterIndex,
                  OnItemSelected: (index) {
                    setState(() {
                      _selectedFilterIndex = index;
                    });
                  },
                  items: [
                    LiquidGlassSegmentItem(
                        label: context.tr(vi: "Vĩnh viễn", en: "Permanent")),
                    LiquidGlassSegmentItem(
                        label: context.tr(vi: "Tạm thời", en: "Temporary")),
                    LiquidGlassSegmentItem(
                        label: context.tr(vi: "Một lần", en: "One-time")),
                  ],
                ),
                const SizedBox(height: 20),

                // Sub-header count
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      context.tr(
                          vi: "Danh sách mã truy cập", en: "Access code list"),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: primaryText,
                      ),
                    ),
                    Text(
                      context.tr(
                          vi: "${filteredList.length} mã PIN",
                          en: "${filteredList.length} PINs"),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: secondaryText,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // PIN Code Cards List
                if (filteredList.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 40.0),
                    child: Center(
                      child: Text(
                        context.tr(
                            vi: "Chưa có mã PIN nào trong mục này.",
                            en: "There are no PINs in this category."),
                        style: TextStyle(color: secondaryText, fontSize: 14),
                      ),
                    ),
                  )
                else
                  ...filteredList.map((item) {
                    final isRevealed = _revealedPins[item['id']] ?? false;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14.0),
                      child: LiquidGlassContainer(
                        borderRadius: 20.0,
                        blur: 18.0,
                        tintOpacity: 0.16,
                        padding: const EdgeInsets.all(18.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header Row: Title & Badge
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          item['title'],
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: primaryText,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (item['badge'] != null) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: (item['badgeColor'] as Color)
                                                .withOpacity(0.12),
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            border: Border.all(
                                              color:
                                                  (item['badgeColor'] as Color)
                                                      .withOpacity(0.3),
                                              width: 0.8,
                                            ),
                                          ),
                                          child: Text(
                                            item['badge'],
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: item['badgeColor'],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),

                                // Actions (Copy & Reveal)
                                Row(
                                  children: [
                                    GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          _revealedPins[item['id']] =
                                              !isRevealed;
                                        });
                                      },
                                      child: Icon(
                                        isRevealed
                                            ? Icons.visibility_off_outlined
                                            : Icons.visibility_outlined,
                                        size: 20,
                                        color: secondaryText,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    GestureDetector(
                                      onTap: () {
                                        Clipboard.setData(
                                            ClipboardData(text: item['code']));
                                        AppToast.show(
                                          context,
                                          message:
                                              "Đã sao chép mã PIN: ${item['code']}",
                                          type: ToastType.info,
                                        );
                                      },
                                      child: Icon(
                                        Icons.copy_rounded,
                                        size: 19,
                                        color: isDark
                                            ? const Color(0xFF38BDF8)
                                            : AppColors.brandBlue,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Reveal only a PIN created by the current user.
                            Text(
                              isRevealed
                                  ? item['code']
                                  : "•••• ${item['code']}",
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? const Color(0xFF38BDF8)
                                    : AppColors.brandBlue,
                                letterSpacing: 2.0,
                              ),
                            ),
                            const SizedBox(height: 6),

                            // Subtext / Creation Date / Schedule Info
                            Text(
                              item['subtext'],
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w400,
                                color: secondaryText,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
