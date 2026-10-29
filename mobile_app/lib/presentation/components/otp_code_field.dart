import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';

/// One hidden text field drawn as separate digit boxes, so paste, delete and
/// iOS one-time-code autofill all work like a native code field.
class OtpCodeField extends StatefulWidget {
  final int length;
  final TextEditingController controller;
  final ValueChanged<String> onCompleted;
  final bool enabled;
  final bool hasError;

  const OtpCodeField({
    super.key,
    required this.controller,
    required this.onCompleted,
    this.length = 6,
    this.enabled = true,
    this.hasError = false,
  });

  @override
  State<OtpCodeField> createState() => _OtpCodeFieldState();
}

class _OtpCodeFieldState extends State<OtpCodeField> {
  final FocusNode _focusNode = FocusNode();
  String? _reportedCode;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChanged);
    _focusNode.addListener(_onChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    _focusNode.dispose();
    super.dispose();
  }

  void _onChanged() {
    setState(() {});
    final code = widget.controller.text;
    if (code.length < widget.length) {
      _reportedCode = null;
    } else if (code != _reportedCode) {
      _reportedCode = code;
      widget.onCompleted(code);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final code = widget.controller.text;
    final focused = _focusNode.hasFocus;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _focusNode.requestFocus(),
      child: Stack(
        children: [
          Opacity(
            opacity: 0,
            child: TextField(
              controller: widget.controller,
              focusNode: _focusNode,
              enabled: widget.enabled,
              autofocus: true,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              maxLength: widget.length,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              showCursor: false,
              enableInteractiveSelection: false,
              decoration: const InputDecoration(counterText: ''),
            ),
          ),
          Row(
            children: [
              for (var i = 0; i < widget.length; i++) ...[
                if (i > 0) const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: AnimatedContainer(
                    duration: AppDurations.fast,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: colors.surface,
                      borderRadius: AppRadius.mdAll,
                      border: Border.all(
                        width: 1.5,
                        color: widget.hasError
                            ? colors.alert
                            : focused && i == code.length
                                ? colors.accent
                                : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      i < code.length ? code[i] : '',
                      style: context.text.headlineSmall?.copyWith(
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
