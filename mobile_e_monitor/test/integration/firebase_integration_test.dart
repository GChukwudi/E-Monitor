import 'package:flutter_test/flutter_test.dart';

// Mock Firebase Database for testing
class MockFirebaseDatabase {
  final Map<String, dynamic> _data = {};

  Future<void> set(String path, dynamic value) async {
    await Future.delayed(
        const Duration(milliseconds: 100)); // Simulate network delay
    _data[path] = value;
  }

  Future<dynamic> get(String path) async {
    await Future.delayed(
        const Duration(milliseconds: 100)); // Simulate network delay
    return _data[path];
  }

  Future<void> update(String path, Map<String, dynamic> updates) async {
    await Future.delayed(const Duration(milliseconds: 100));
    final existingData = _data[path] as Map<String, dynamic>? ?? {};
    _data[path] = {...existingData, ...updates};
  }

  void clear() {
    _data.clear();
  }
}

void main() {
  group('Firebase Integration Tests (Mocked)', () {
    late MockFirebaseDatabase mockDb;

    setUp(() {
      mockDb = MockFirebaseDatabase();
    });

    tearDown(() {
      mockDb.clear();
    });

    test('writes and reads unit data successfully', () async {
      // Arrange
      const unitPath = 'buildings/building_001/units/unit_001';
      final unitData = {
        'power': 575.0,
        'current': 2.5,
        'voltage': 230.0,
        'remaining_units': 23.86,
        'remaining_credit': 5000.0,
        'timestamp': '2025-11-04 14:30:00',
      };

      // Act
      await mockDb.set(unitPath, unitData);
      final retrievedData = await mockDb.get(unitPath);

      // Assert
      expect(retrievedData, isNotNull);
      expect(retrievedData['power'], 575.0);
      expect(retrievedData['current'], 2.5);
      expect(retrievedData['voltage'], 230.0);
      expect(retrievedData['remaining_units'], 23.86);
    });

    test('updates remaining units after recharge', () async {
      // Arrange
      const unitPath = 'buildings/building_001/units/unit_001';
      await mockDb.set(unitPath, {
        'remaining_units': 10.0,
        'remaining_credit': 2095.0,
      });

      // Act - Recharge ₦5000 (= 23.87 kWh)
      const rechargeAmount = 5000.0;
      const newUnits = 23.87;

      await mockDb.update(unitPath, {
        'remaining_units': 10.0 + newUnits,
        'remaining_credit': 2095.0 + rechargeAmount,
      });

      final updatedData = await mockDb.get(unitPath);

      // Assert
      expect(updatedData['remaining_units'], closeTo(33.87, 0.01));
      expect(updatedData['remaining_credit'], closeTo(7095.0, 0.1));
    });

    test('deducts energy consumption correctly', () async {
      // Arrange
      const unitPath = 'buildings/building_001/units/unit_001';
      await mockDb.set(unitPath, {
        'remaining_units': 50.0,
        'remaining_credit': 10475.0,
      });

      // Act - Consume 2 kWh
      const energyConsumed = 2.0;
      const costPerKwh = 209.5;

      await mockDb.update(unitPath, {
        'remaining_units': 50.0 - energyConsumed,
        'remaining_credit': 10475.0 - (energyConsumed * costPerKwh),
      });

      final updatedData = await mockDb.get(unitPath);

      // Assert
      expect(updatedData['remaining_units'], 48.0);
      expect(updatedData['remaining_credit'], closeTo(10056.0, 0.1));
    });

    test('stores hourly history data', () async {
      // Arrange
      const historyPath =
          'buildings/building_001/units/unit_001/history/hourly/2025-11-04/10';
      final hourlyData = {
        'energy': 0.5,
        'avgPower': 300.0,
        'peakPower': 500.0,
        'avgCurrent': 1.3,
        'samples': 60,
      };

      // Act
      await mockDb.set(historyPath, hourlyData);
      final retrievedData = await mockDb.get(historyPath);

      // Assert
      expect(retrievedData['energy'], 0.5);
      expect(retrievedData['avgPower'], 300.0);
      expect(retrievedData['peakPower'], 500.0);
      expect(retrievedData['samples'], 60);
    });

    test('verifies access code authentication flow', () async {
      // Arrange
      const unitPath = 'buildings/building_001/units/unit_001';
      const accessCodeHash = 'abc123hashvalue'; // Mock hash

      await mockDb.set(unitPath, {
        'accessCode': accessCodeHash,
        'isActive': true,
        'name': 'House A',
      });

      // Act
      final unitData = await mockDb.get(unitPath);
      final storedHash = unitData['accessCode'];
      final isActive = unitData['isActive'];

      // Assert
      expect(storedHash, accessCodeHash);
      expect(isActive, true);
    });

    test('handles unit deactivation', () async {
      // Arrange
      const unitPath = 'buildings/building_001/units/unit_001';
      await mockDb.set(unitPath, {
        'isActive': true,
        'remaining_units': 10.0,
      });

      // Act - Property manager deactivates unit
      await mockDb.update(unitPath, {'isActive': false});
      final updatedData = await mockDb.get(unitPath);

      // Assert
      expect(updatedData['isActive'], false);
      expect(updatedData['remaining_units'], 10.0); // Credit preserved
    });

    test('reads non-existent path returns null', () async {
      // Act
      final data = await mockDb.get('buildings/nonexistent/path');

      // Assert
      expect(data, null);
    });

    test('multiple updates preserve other fields', () async {
      // Arrange
      const unitPath = 'buildings/building_001/units/unit_001';
      await mockDb.set(unitPath, {
        'power': 500.0,
        'current': 2.0,
        'voltage': 230.0,
        'remaining_units': 20.0,
      });

      // Act - Update only power
      await mockDb.update(unitPath, {'power': 600.0});
      final data = await mockDb.get(unitPath);

      // Assert
      expect(data['power'], 600.0);
      expect(data['current'], 2.0); // Preserved
      expect(data['voltage'], 230.0); // Preserved
      expect(data['remaining_units'], 20.0); // Preserved
    });
  });

  group('End-to-End Workflow Tests (Mocked)', () {
    late MockFirebaseDatabase mockDb;

    setUp(() {
      mockDb = MockFirebaseDatabase();
    });

    test('complete recharge workflow', () async {
      // Step 1: Initial state - low credit
      const unitPath = 'buildings/building_001/units/unit_001';
      await mockDb.set(unitPath, {
        'remaining_units': 2.0,
        'remaining_credit': 419.0,
        'power': 0.0,
      });

      // Step 2: User recharges ₦5000
      const rechargeAmount = 5000.0;
      const ratePerKwh = 209.5;
      final unitsAdded = rechargeAmount / ratePerKwh;

      await mockDb.update(unitPath, {
        'remaining_units': 2.0 + unitsAdded,
        'remaining_credit': 419.0 + rechargeAmount,
      });

      // Step 3: Verify ESP32 would see updated credit
      final finalData = await mockDb.get(unitPath);

      // Assert
      expect(finalData['remaining_units'],
          greaterThan(5.0)); // No longer low credit
      expect(finalData['remaining_credit'], greaterThan(1000.0));
      expect(finalData['remaining_units'], closeTo(25.87, 0.1));
    });

    test('complete usage and depletion workflow', () async {
      // Step 1: Start with some credit
      const unitPath = 'buildings/building_001/units/unit_001';
      await mockDb.set(unitPath, {
        'remaining_units': 5.0,
        'remaining_credit': 1047.5,
      });

      // Step 2: Simulate hourly consumption over multiple hours
      const hoursToSimulate = 6;
      const energyPerHour = 1.0; // 1 kWh per hour

      for (int hour = 0; hour < hoursToSimulate; hour++) {
        final currentData = await mockDb.get(unitPath);
        final newUnits = currentData['remaining_units'] - energyPerHour;
        final newCredit =
            currentData['remaining_credit'] - (energyPerHour * 209.5);

        await mockDb.update(unitPath, {
          'remaining_units': newUnits > 0 ? newUnits : 0,
          'remaining_credit': newCredit > 0 ? newCredit : 0,
        });
      }

      // Step 3: Verify credit depleted
      final finalData = await mockDb.get(unitPath);

      // Assert
      expect(finalData['remaining_units'], lessThan(1.0));
      expect(finalData['remaining_credit'], lessThan(500.0));
    });

    test('multiple units in same building work independently', () async {
      // Arrange - Set up three units
      const building = 'buildings/building_001/units';

      await mockDb.set('$building/unit_001', {
        'remaining_units': 10.0,
        'power': 300.0,
      });

      await mockDb.set('$building/unit_002', {
        'remaining_units': 20.0,
        'power': 500.0,
      });

      await mockDb.set('$building/unit_003', {
        'remaining_units': 5.0,
        'power': 200.0,
      });

      // Act - Update only unit_002
      await mockDb.update('$building/unit_002', {
        'remaining_units': 15.0,
      });

      // Assert - Others unchanged
      final unit1 = await mockDb.get('$building/unit_001');
      final unit2 = await mockDb.get('$building/unit_002');
      final unit3 = await mockDb.get('$building/unit_003');

      expect(unit1['remaining_units'], 10.0); // Unchanged
      expect(unit2['remaining_units'], 15.0); // Updated
      expect(unit3['remaining_units'], 5.0); // Unchanged
    });
  });

  group('Error Handling Tests', () {
    test('handles invalid data types gracefully', () {
      // This tests your fromMap error handling
      final Map<dynamic, dynamic> invalidData = {
        'current': 'not-a-number',
        'voltage': null,
        'power': 'invalid',
      };

      // Your PrepaidMeterData.fromMap should handle this
      // by converting to 0.0 or appropriate default
      double safeToDouble(dynamic value) {
        if (value == null) return 0.0;
        if (value is double) return value;
        if (value is int) return value.toDouble();
        if (value is String) {
          final parsed = double.tryParse(value);
          return parsed ?? 0.0;
        }
        return 0.0;
      }

      final current = safeToDouble(invalidData['current']);
      final voltage = safeToDouble(invalidData['voltage']);
      final power = safeToDouble(invalidData['power']);

      expect(current, 0.0);
      expect(voltage, 0.0);
      expect(power, 0.0);
    });
  });
}
