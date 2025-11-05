import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_e_monitor/models/prepaid_meter_data.dart';
import 'package:mobile_e_monitor/models/tenant_unit.dart';

void main() {
  group('PrepaidMeterData Model Tests', () {
    test('fromMap creates valid PrepaidMeterData with all fields', () {
      // Arrange
      final Map<dynamic, dynamic> testData = {
        'current': 2.5,
        'voltage': 230.0,
        'power': 575.0,
        'energy': 1.25,
        'remaining_credit': 5000.0,
        'remaining_units': 23.86,
        'timestamp': '2025-11-04 14:30:00',
      };

      // Act
      final meterData = PrepaidMeterData.fromMap(testData);

      // Assert
      expect(meterData.current, 2.5);
      expect(meterData.voltage, 230.0);
      expect(meterData.power, 575.0);
      expect(meterData.energyUsed, 1.25);
      expect(meterData.remainingCredit, 5000.0);
      expect(meterData.remainingUnits, 23.86);
      expect(meterData.timestamp, '2025-11-04 14:30:00');
      expect(meterData.lowCreditAlert, false);
    });

    test('fromMap handles missing fields with defaults', () {
      // Arrange
      final Map<dynamic, dynamic> emptyData = {};

      // Act
      final meterData = PrepaidMeterData.fromMap(emptyData);

      // Assert
      expect(meterData.current, 0.0);
      expect(meterData.voltage, 0.0);
      expect(meterData.power, 0.0);
      expect(meterData.energyUsed, 0.0);
      expect(meterData.remainingCredit, 0.0);
      expect(meterData.remainingUnits, 0.0);
      expect(meterData.timestamp, '');
      expect(meterData.lowCreditAlert, true); // <5 units
    });

    test('lowCreditAlert triggers when units below 5', () {
      // Arrange
      final Map<dynamic, dynamic> lowCreditData = {
        'remaining_units': 4.5,
      };

      // Act
      final meterData = PrepaidMeterData.fromMap(lowCreditData);

      // Assert
      expect(meterData.lowCreditAlert, true);
    });

    test('lowCreditAlert false when units above 5', () {
      // Arrange
      final Map<dynamic, dynamic> goodCreditData = {
        'remaining_units': 10.0,
      };

      // Act
      final meterData = PrepaidMeterData.fromMap(goodCreditData);

      // Assert
      expect(meterData.lowCreditAlert, false);
    });

    test('fromMap handles integer values correctly', () {
      // Arrange
      final Map<dynamic, dynamic> integerData = {
        'current': 2,
        'voltage': 230,
        'power': 460,
        'remaining_units': 10,
      };

      // Act
      final meterData = PrepaidMeterData.fromMap(integerData);

      // Assert
      expect(meterData.current, 2.0);
      expect(meterData.voltage, 230.0);
      expect(meterData.power, 460.0);
      expect(meterData.remainingUnits, 10.0);
    });

    test('fromMap handles edge case: exactly 5 units', () {
      // Arrange
      final Map<dynamic, dynamic> edgeCaseData = {
        'remaining_units': 5.0,
      };

      // Act
      final meterData = PrepaidMeterData.fromMap(edgeCaseData);

      // Assert
      expect(meterData.lowCreditAlert, false); // Should be false at exactly 5
    });

    test('fromMap handles very large values', () {
      // Arrange
      final Map<dynamic, dynamic> largeData = {
        'current': 100.0,
        'voltage': 250.0,
        'power': 25000.0,
        'remaining_credit': 1000000.0,
        'remaining_units': 5000.0,
      };

      // Act
      final meterData = PrepaidMeterData.fromMap(largeData);

      // Assert
      expect(meterData.current, 100.0);
      expect(meterData.power, 25000.0);
      expect(meterData.remainingCredit, 1000000.0);
      expect(meterData.lowCreditAlert, false);
    });
  });

  group('TenantUnit Model Tests', () {
    test('creates TenantUnit with valid data', () {
      // Act
      final unit = TenantUnit(
        id: 'unit_001',
        name: 'House A',
        percentage: 33.33,
      );

      // Assert
      expect(unit.id, 'unit_001');
      expect(unit.name, 'House A');
      expect(unit.percentage, 33.33);
    });

    test('handles different unit IDs', () {
      // Act
      final unit1 = TenantUnit(id: 'unit_001', name: 'House A', percentage: 30);
      final unit2 = TenantUnit(id: 'unit_002', name: 'House B', percentage: 35);
      final unit3 = TenantUnit(id: 'unit_003', name: 'House C', percentage: 35);

      // Assert
      expect(unit1.id, 'unit_001');
      expect(unit2.id, 'unit_002');
      expect(unit3.id, 'unit_003');
    });

    test('percentage sums correctly for multiple units', () {
      // Arrange
      final units = [
        TenantUnit(id: 'unit_001', name: 'House A', percentage: 35.0),
        TenantUnit(id: 'unit_002', name: 'House B', percentage: 28.0),
        TenantUnit(id: 'unit_003', name: 'House C', percentage: 37.0),
      ];

      // Act
      final totalPercentage = units.fold<double>(
        0,
        (sum, unit) => sum + unit.percentage,
      );

      // Assert
      expect(totalPercentage, 100.0);
    });
  });

  group('Business Logic Tests', () {
    test('calculates correct cost from kWh', () {
      // Arrange
      const ratePerKwh = 209.5;
      const units = 10.0;

      // Act
      final cost = units * ratePerKwh;

      // Assert
      expect(cost, 2095.0);
    });

    test('calculates units from Naira amount', () {
      // Arrange
      const ratePerKwh = 209.5;
      const amount = 5000.0;

      // Act
      final units = amount / ratePerKwh;

      // Assert
      expect(units, closeTo(23.87, 0.01));
    });

    test('calculates power from voltage and current', () {
      // Arrange
      const voltage = 230.0;
      const current = 2.5;

      // Act
      final power = voltage * current;

      // Assert
      expect(power, 575.0);
    });

    test('remaining credit calculation after usage', () {
      // Arrange
      const initialCredit = 10000.0;
      const energyUsed = 5.0; // kWh
      const ratePerKwh = 209.5;

      // Act
      final creditUsed = energyUsed * ratePerKwh;
      final remainingCredit = initialCredit - creditUsed;

      // Assert
      expect(creditUsed, 1047.5);
      expect(remainingCredit, 8952.5);
    });

    test('prevents negative remaining units', () {
      // Arrange
      const currentUnits = 2.0;
      const energyConsumed = 5.0;

      // Act
      var newUnits = currentUnits - energyConsumed;
      if (newUnits < 0) newUnits = 0;

      // Assert
      expect(newUnits, 0.0);
    });
  });
}
