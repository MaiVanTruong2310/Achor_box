import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Profile photo, or the name's initial on a tinted circle.
class UserAvatar extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double size;
  final Color? color;

  const UserAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = 40,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final tint = color ?? context.colors.accent;
    final initial = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();
    final url = imageUrl;

    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(shape: BoxShape.circle, color: tint),
      alignment: Alignment.center,
      child: url == null || url.isEmpty
          ? Text(
              initial,
              style: TextStyle(
                color: Colors.white,
                fontSize: size * 0.42,
                fontWeight: FontWeight.w600,
              ),
            )
          : Image.network(
              url,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Text(
                initial,
                style: TextStyle(color: Colors.white, fontSize: size * 0.42),
              ),
            ),
    );
  }
}
