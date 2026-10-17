class BoxStatusModel {
  final String doorStatus; // 'open' | 'closed'
  final String lockStatus; // 'locked' | 'unlocked'
  final bool packageDetected;
  final double currentWeight;
  final DateTime timestamp;

  BoxStatusModel({
    required this.doorStatus,
    required this.lockStatus,
    required this.packageDetected,
    required this.currentWeight,
    required this.timestamp,
  });

  factory BoxStatusModel.fromJson(Map<String, dynamic> json) {
    return BoxStatusModel(
      doorStatus: json['door']?.toString() ?? 'closed',
      lockStatus: json['lock']?.toString() ?? 'locked',
      packageDetected: json['package_detected'] == true,
      currentWeight:
          (json['weight_kg'] ?? json['weight'] ?? 0.0 as num).toDouble(),
      timestamp: DateTime.now(),
    );
  }

  bool get isLocked => lockStatus.toLowerCase() == 'locked';
  bool get isDoorClosed => doorStatus.toLowerCase() == 'closed';
}
