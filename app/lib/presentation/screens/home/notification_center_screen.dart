import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/devices/device_controller.dart';
import '../../../core/localization/language_controller.dart';
import '../../../core/notifications/notification_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/app_notification.dart';
import '../../../data/models/device.dart';
import '../../components/components.dart';
import '../../widgets/app_toast.dart';
import '../../widgets/notification_tile.dart';
import 'device_detail_screen.dart';
import 'notification_settings_screen.dart';

enum _Filter { all, unread, device, access, system }

enum _TileAction { toggleRead, openDevice, delete }

class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() =>
      _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  final _controller = globalNotificationController;

  /// Boxes the user can still open. RLS only returns owned and shared
  /// devices, so a missing id means access was removed.
  final _devices = globalDeviceController;
  Timer? _clock;
  _Filter _filter = _Filter.all;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _controller.initialize();
    _devices.initialize();
    _clock = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    await Future.wait([_devices.refresh(), _controller.refresh()]);
    if (mounted) setState(() => _now = DateTime.now());
  }

  bool _matches(AppNotification item, _Filter filter) => switch (filter) {
        _Filter.all => true,
        _Filter.unread => !item.isRead,
        _Filter.device => item.category == NotificationCategory.device,
        _Filter.access => item.category == NotificationCategory.access,
        _Filter.system => item.category == NotificationCategory.system,
      };

  String _filterLabel(_Filter filter) => switch (filter) {
        _Filter.all => context.tr(vi: 'Tất cả', en: 'All'),
        _Filter.unread => context.tr(vi: 'Chưa đọc', en: 'Unread'),
        _Filter.device => context.tr(vi: 'Thiết bị', en: 'Devices'),
        _Filter.access => context.tr(vi: 'Truy cập', en: 'Access'),
        _Filter.system => context.tr(vi: 'Hệ thống', en: 'System'),
      };

  Device? _deviceFor(AppNotification item) => _devices.byId(item.deviceId);

  String _timeLabel(DateTime createdAt) {
    final local = createdAt.toLocal();
    final age = _now.difference(local);
    if (age.inMinutes < 1) return context.tr(vi: 'Vừa xong', en: 'Just now');
    if (age.inHours < 1) {
      return context.tr(
          vi: '${age.inMinutes} phút', en: '${age.inMinutes} min');
    }
    return '${_twoDigits(local.hour)}:${_twoDigits(local.minute)}';
  }

  String _dayLabel(DateTime day) {
    final today = DateUtils.dateOnly(_now);
    final difference = today.difference(day).inDays;
    if (difference == 0) return context.tr(vi: 'Hôm nay', en: 'Today');
    if (difference == 1) return context.tr(vi: 'Hôm qua', en: 'Yesterday');
    final date = '${_twoDigits(day.day)}/${_twoDigits(day.month)}';
    return day.year == today.year ? date : '$date/${day.year}';
  }

  static String _twoDigits(int value) => value.toString().padLeft(2, '0');

  Future<void> _open(AppNotification item) async {
    if (!item.isRead) unawaited(_setRead(item, true));
    if (item.deviceId == null) return;
    final device = _deviceFor(item);
    if (device == null) {
      if (!_devices.loading) {
        AppToast.show(
          context,
          message: context.tr(
            vi: 'Bạn không còn quyền truy cập hộp này.',
            en: 'You no longer have access to this box.',
          ),
        );
      }
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DeviceDetailScreen(device: device),
      ),
    );
  }

  Future<void> _setRead(AppNotification item, bool read) async {
    final ok = await _controller.setRead(item.id, read: read);
    if (ok || !mounted) return;
    AppToast.show(
      context,
      message: context.tr(
        vi: 'Không cập nhật được thông báo. Hãy kiểm tra kết nối mạng.',
        en: 'Could not update the notification. Check your connection.',
      ),
      type: ToastType.error,
    );
  }

  Future<void> _delete(AppNotification item) async {
    final ok = await _controller.delete(item.id);
    if (ok || !mounted) return;
    AppToast.show(
      context,
      message: context.tr(
        vi: 'Không xóa được thông báo. Hãy kiểm tra kết nối mạng.',
        en: 'Could not delete the notification. Check your connection.',
      ),
      type: ToastType.error,
    );
  }

  Future<void> _markAllRead() async {
    final ok = await _controller.markAllRead();
    if (!mounted) return;
    AppToast.show(
      context,
      message: ok
          ? context.tr(
              vi: 'Đã đánh dấu tất cả là đã đọc.', en: 'All marked as read.')
          : context.tr(
              vi: 'Không cập nhật được thông báo. Hãy kiểm tra kết nối mạng.',
              en: 'Could not update notifications. Check your connection.',
            ),
      type: ok ? ToastType.success : ToastType.error,
    );
  }

  Future<void> _showActions(AppNotification item) async {
    final device = _deviceFor(item);
    final body = item.localizedBody(context);
    final action = await showChoiceSheet<_TileAction>(
      context,
      title: item.localizedTitle(context),
      message: body.isEmpty ? null : body,
      options: [
        ChoiceOption(
          value: _TileAction.toggleRead,
          label: item.isRead
              ? context.tr(vi: 'Đánh dấu chưa đọc', en: 'Mark as unread')
              : context.tr(vi: 'Đánh dấu đã đọc', en: 'Mark as read'),
          icon: item.isRead ? AppIcons.notificationsFill : AppIcons.check,
        ),
        if (device != null)
          ChoiceOption(
            value: _TileAction.openDevice,
            label: context.tr(
              vi: 'Mở ${device.displayName}',
              en: 'Open ${device.displayName}',
            ),
            icon: AppIcons.boxFill,
            iconColor: context.colors.locked,
          ),
        ChoiceOption(
          value: _TileAction.delete,
          label: context.tr(vi: 'Xóa thông báo', en: 'Delete notification'),
          icon: AppIcons.trash,
          destructive: true,
        ),
      ],
    );
    if (!mounted || action == null) return;
    switch (action) {
      case _TileAction.toggleRead:
        await _setRead(item, !item.isRead);
      case _TileAction.openDevice:
        await _open(item);
      case _TileAction.delete:
        await _delete(item);
    }
  }

  void _openSettings() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const NotificationSettingsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([_controller, _devices]),
      builder: (context, _) {
        final all = _controller.items;
        final unread = _controller.unreadCount;
        final items = all.where((item) => _matches(item, _filter)).toList();

        return AppPage(
          title: context.tr(vi: 'Thông báo', en: 'Notifications'),
          subtitle: unread > 0
              ? context.tr(
                  vi: '$unread thông báo chưa đọc', en: '$unread unread')
              : context.tr(
                  vi: 'Bạn đã xem hết thông báo', en: 'You are all caught up'),
          showBackButton: true,
          onRefresh: _refresh,
          actions: [
            IconButton(
              tooltip: context.tr(
                  vi: 'Đánh dấu tất cả đã đọc', en: 'Mark all as read'),
              onPressed: unread == 0 ? null : _markAllRead,
              icon: const Icon(AppIcons.check),
            ),
            IconButton(
              tooltip: context.tr(
                  vi: 'Cài đặt thông báo', en: 'Notification settings'),
              onPressed: _openSettings,
              icon: const Icon(AppIcons.notificationsRinging),
            ),
          ],
          children: [
            const SizedBox(height: AppSpacing.md),
            _FilterBar(
              filters: [
                for (final filter in _Filter.values)
                  _FilterData(
                    label: _filterLabel(filter),
                    count: filter == _Filter.all
                        ? 0
                        : all.where((item) => _matches(item, filter)).length,
                    selected: filter == _filter,
                    onTap: () => setState(() => _filter = filter),
                  ),
              ],
            ),
            if (_controller.hasError) ...[
              const SizedBox(height: AppSpacing.sm),
              InkWell(
                onTap: _refresh,
                borderRadius: AppRadius.mdAll,
                child: InlineMessage(context.tr(
                  vi: 'Mất kết nối cập nhật trực tiếp. Chạm để thử lại.',
                  en: 'Live updates disconnected. Tap to retry.',
                )),
              ),
            ],
            if (_controller.loading)
              const Padding(
                padding: EdgeInsets.all(AppSpacing.xxl),
                child: Center(child: CircularProgressIndicator.adaptive()),
              )
            else if (items.isEmpty)
              _emptyState()
            else
              ..._groupedTiles(items),
          ],
        );
      },
    );
  }

  Widget _emptyState() => switch (_filter) {
        _Filter.all => EmptyState(
            icon: AppIcons.notifications,
            title:
                context.tr(vi: 'Chưa có thông báo', en: 'No notifications yet'),
            message: context.tr(
              vi: 'Cảnh báo từ hộp, lượt mở khóa và thay đổi quyền truy cập sẽ hiện ở đây.',
              en: 'Box alerts, unlocks and access changes will show up here.',
            ),
          ),
        _Filter.unread => EmptyState(
            icon: AppIcons.check,
            title: context.tr(
                vi: 'Không còn thông báo chưa đọc',
                en: 'No unread notifications'),
          ),
        _ => EmptyState(
            icon: AppIcons.notifications,
            title: context.tr(
                vi: 'Không có thông báo trong mục này',
                en: 'Nothing in this category'),
          ),
      };

  /// Items arrive newest first; a day header starts each new date.
  List<Widget> _groupedTiles(List<AppNotification> items) {
    final widgets = <Widget>[];
    DateTime? currentDay;
    for (final item in items) {
      final day = DateUtils.dateOnly(item.createdAt.toLocal());
      if (day != currentDay) {
        currentDay = day;
        widgets.add(_DayHeader(_dayLabel(day)));
      }
      final device = _deviceFor(item);
      widgets.add(Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: NotificationTile(
          notification: item,
          timeLabel: _timeLabel(item.createdAt),
          deviceName: device?.displayName,
          onTap: () => _open(item),
          onLongPress: () => _showActions(item),
          onDelete: () => _delete(item),
        ),
      ));
    }
    return widgets;
  }
}

class _DayHeader extends StatelessWidget {
  final String label;

  const _DayHeader(this.label);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xxs,
        AppSpacing.lg,
        AppSpacing.xxs,
        AppSpacing.xs,
      ),
      child: Text(
        label,
        style: context.text.titleSmall?.copyWith(
          color: context.colors.textPrimary.withValues(alpha: 0.8),
        ),
      ),
    );
  }
}

class _FilterData {
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  const _FilterData({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });
}

/// Horizontally scrolling glass capsules; the selected one is light glass,
/// like Apple Home's active tiles.
class _FilterBar extends StatelessWidget {
  final List<_FilterData> filters;

  const _FilterBar({required this.filters});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      clipBehavior: Clip.none,
      child: Row(
        children: [
          for (final filter in filters)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.xs),
              child: Semantics(
                button: true,
                selected: filter.selected,
                child: GlassSurface(
                  capsule: true,
                  style: filter.selected ? GlassStyle.light : GlassStyle.dark,
                  onTap: filter.onTap,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  child: Builder(builder: (context) {
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(filter.label, style: context.text.titleSmall),
                        if (filter.count > 0) ...[
                          const SizedBox(width: AppSpacing.xxs + 2),
                          Text(
                            '${filter.count}',
                            style: context.text.labelMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ],
                    );
                  }),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
