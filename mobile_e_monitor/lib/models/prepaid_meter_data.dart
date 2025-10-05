class PrepaidMeterData {
  final double current;
  final double voltage;
  final double power;
  final double energyUsed;
  final double remainingCredit;
  final double remainingUnits;
  final String timestamp;
  final bool lowCreditAlert;

  PrepaidMeterData({
    required this.current,
    required this.voltage,
    required this.power,
    required this.energyUsed,
    required this.remainingCredit,
    required this.remainingUnits,
    required this.timestamp,
    required this.lowCreditAlert,
  });

  factory PrepaidMeterData.fromMap(Map<dynamic, dynamic> map) {
    return PrepaidMeterData(
      current: (map['current'] ?? 0.0).toDouble(),
      voltage: (map['voltage'] ?? 0.0).toDouble(),
      power: (map['power'] ?? 0.0).toDouble(),
      energyUsed: (map['energy'] ?? 0.0).toDouble(),
      remainingCredit: (map['remaining_credit'] ?? 0.0).toDouble(),
      remainingUnits: (map['remaining_units'] ?? 0.0).toDouble(),
      timestamp: map['timestamp'] ?? '',
      lowCreditAlert: (map['remaining_units'] ?? 0.0) < 5.0,
    );
  }
}
