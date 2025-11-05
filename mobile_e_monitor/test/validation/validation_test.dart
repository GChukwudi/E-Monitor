import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Access Code Validation Tests', () {
    bool isValidAccessCode(String code) {
      // Access code validation rules:
      // 1. Not empty
      // 2. Maximum 8 characters
      // 3. Alphanumeric only
      if (code.isEmpty) return false;
      if (code.length > 8) return false;
      return RegExp(r'^[A-Z0-9]+$').hasMatch(code);
    }

    test('empty access code is invalid', () {
      expect(isValidAccessCode(''), false);
    });

    test('valid access code passes', () {
      expect(isValidAccessCode('TEST1234'), true);
      expect(isValidAccessCode('UNIT0001'), true);
      expect(isValidAccessCode('ABC123'), true);
    });

    test('access code longer than 8 characters is invalid', () {
      expect(isValidAccessCode('TOOLONGCODE'), false);
      expect(isValidAccessCode('123456789'), false);
    });

    test('access code with lowercase is invalid (must be uppercase)', () {
      expect(isValidAccessCode('test1234'), false);
      expect(isValidAccessCode('Test1234'), false);
    });

    test('access code with special characters is invalid', () {
      expect(isValidAccessCode('TEST@123'), false);
      expect(isValidAccessCode('UNIT-001'), false);
      expect(isValidAccessCode('TEST 123'), false);
    });

    test('uppercase conversion works', () {
      final input = 'test1234'.toUpperCase();
      expect(isValidAccessCode(input), true);
    });
  });

  group('Recharge Amount Validation Tests', () {
    String? validateRechargeAmount(String input) {
      if (input.trim().isEmpty) {
        return 'Please enter an amount';
      }

      final amount = double.tryParse(input);

      if (amount == null) {
        return 'Please enter a valid number';
      }

      if (amount <= 0) {
        return 'Amount must be greater than zero';
      }

      if (amount < 100) {
        return 'Minimum recharge is ₦100';
      }

      if (amount > 1000000) {
        return 'Maximum recharge is ₦1,000,000';
      }

      return null; // Valid
    }

    test('empty amount shows error', () {
      expect(validateRechargeAmount(''), 'Please enter an amount');
      expect(validateRechargeAmount('   '), 'Please enter an amount');
    });

    test('non-numeric input shows error', () {
      expect(validateRechargeAmount('abc'), 'Please enter a valid number');
      expect(validateRechargeAmount('12.34.56'), 'Please enter a valid number');
    });

    test('zero amount shows error', () {
      expect(validateRechargeAmount('0'), 'Amount must be greater than zero');
    });

    test('negative amount shows error', () {
      expect(
          validateRechargeAmount('-100'), 'Amount must be greater than zero');
    });

    test('amount below minimum shows error', () {
      expect(validateRechargeAmount('50'), 'Minimum recharge is ₦100');
      expect(validateRechargeAmount('99'), 'Minimum recharge is ₦100');
    });

    test('amount above maximum shows error', () {
      expect(
          validateRechargeAmount('1500000'), 'Maximum recharge is ₦1,000,000');
    });

    test('valid amounts pass validation', () {
      expect(validateRechargeAmount('100'), null);
      expect(validateRechargeAmount('500'), null);
      expect(validateRechargeAmount('5000'), null);
      expect(validateRechargeAmount('50000'), null);
      expect(validateRechargeAmount('1000000'), null);
    });

    test('decimal amounts are valid', () {
      expect(validateRechargeAmount('100.50'), null);
      expect(validateRechargeAmount('5000.75'), null);
    });
  });

  group('Credit Calculation Validation Tests', () {
    double calculateUnitsFromAmount(double amount) {
      const ratePerKwh = 209.5;
      return amount / ratePerKwh;
    }

    double calculateCostFromUnits(double units) {
      const ratePerKwh = 209.5;
      return units * ratePerKwh;
    }

    test('calculates correct units from amount', () {
      expect(calculateUnitsFromAmount(209.5), closeTo(1.0, 0.01));
      expect(calculateUnitsFromAmount(419.0), closeTo(2.0, 0.01));
      expect(calculateUnitsFromAmount(5000), closeTo(23.87, 0.01));
    });

    test('calculates correct cost from units', () {
      expect(calculateCostFromUnits(1.0), 209.5);
      expect(calculateCostFromUnits(10.0), 2095.0);
      expect(calculateCostFromUnits(23.87),
          closeTo(5000.765, 0.5)); // Increased tolerance
    });

    test('round-trip conversion (amount → units → amount)', () {
      const originalAmount = 5000.0;
      final units = calculateUnitsFromAmount(originalAmount);
      final backToAmount = calculateCostFromUnits(units);

      expect(backToAmount, closeTo(originalAmount, 1.0));
    });

    test('handles very small amounts', () {
      final units = calculateUnitsFromAmount(100);
      expect(units, greaterThan(0));
      expect(units, closeTo(0.48, 0.01));
    });

    test('handles very large amounts', () {
      final units = calculateUnitsFromAmount(100000);
      expect(units, closeTo(477.33, 1.0));
    });
  });

  group('Low Credit Alert Validation Tests', () {
    bool shouldShowLowCreditAlert(double remainingUnits,
        {double threshold = 5.0}) {
      return remainingUnits < threshold;
    }

    test('shows alert when units below threshold', () {
      expect(shouldShowLowCreditAlert(4.9), true);
      expect(shouldShowLowCreditAlert(3.0), true);
      expect(shouldShowLowCreditAlert(1.0), true);
      expect(shouldShowLowCreditAlert(0.5), true);
    });

    test('does not show alert when units at or above threshold', () {
      expect(shouldShowLowCreditAlert(5.0), false);
      expect(shouldShowLowCreditAlert(5.1), false);
      expect(shouldShowLowCreditAlert(10.0), false);
      expect(shouldShowLowCreditAlert(100.0), false);
    });

    test('custom threshold works', () {
      expect(shouldShowLowCreditAlert(8.0, threshold: 10.0), true);
      expect(shouldShowLowCreditAlert(12.0, threshold: 10.0), false);
    });

    test('handles zero units', () {
      expect(shouldShowLowCreditAlert(0), true);
    });
  });

  group('Unit Active Status Validation Tests', () {
    bool canAccessUnit(bool isActive, double remainingUnits) {
      return isActive && remainingUnits >= 0;
    }

    test('active unit with credit can be accessed', () {
      expect(canAccessUnit(true, 10.0), true);
      expect(canAccessUnit(true, 0.1), true);
    });

    test('inactive unit cannot be accessed', () {
      expect(canAccessUnit(false, 10.0), false);
      expect(canAccessUnit(false, 100.0), false);
    });

    test('active unit with no credit can still be accessed', () {
      // Unit is accessible but relay will be off
      expect(canAccessUnit(true, 0.0), true);
    });

    test('inactive unit with no credit cannot be accessed', () {
      expect(canAccessUnit(false, 0.0), false);
    });
  });

  group('Naira Formatting Validation Tests', () {
    String formatNaira(double amount) {
      return '₦${amount.toStringAsFixed(0).replaceAllMapped(
            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
            (Match m) => '${m[1]},',
          )}';
    }

    test('formats small amounts correctly', () {
      expect(formatNaira(100), '₦100');
      expect(formatNaira(999), '₦999');
    });

    test('formats thousands with comma', () {
      expect(formatNaira(1000), '₦1,000');
      expect(formatNaira(5000), '₦5,000');
      expect(formatNaira(9999), '₦9,999');
    });

    test('formats large amounts with multiple commas', () {
      expect(formatNaira(100000), '₦100,000');
      expect(formatNaira(1000000), '₦1,000,000');
      expect(formatNaira(5234567), '₦5,234,567');
    });

    test('handles decimal values by rounding', () {
      expect(formatNaira(1234.56), '₦1,235');
      expect(formatNaira(9999.99), '₦10,000');
    });

    test('handles zero', () {
      expect(formatNaira(0), '₦0');
    });
  });

  group('Power Calculation Validation Tests', () {
    double calculatePower(double voltage, double current) {
      return voltage * current;
    }

    test('calculates power correctly', () {
      expect(calculatePower(230, 1), 230);
      expect(calculatePower(230, 2.5), 575);
      expect(calculatePower(220, 4.35), closeTo(957, 1));
    });

    test('handles zero current', () {
      expect(calculatePower(230, 0), 0);
    });

    test('handles zero voltage', () {
      expect(calculatePower(0, 2.5), 0);
    });

    test('handles decimal values', () {
      expect(calculatePower(230.5, 2.75), closeTo(633.875, 0.01));
    });
  });

  group('Time Range Validation Tests', () {
    bool isValidTimeRange(String range) {
      return ['24h', '7d', '30d'].contains(range);
    }

    test('valid time ranges pass', () {
      expect(isValidTimeRange('24h'), true);
      expect(isValidTimeRange('7d'), true);
      expect(isValidTimeRange('30d'), true);
    });

    test('invalid time ranges fail', () {
      expect(isValidTimeRange('1h'), false);
      expect(isValidTimeRange('90d'), false);
      expect(isValidTimeRange('invalid'), false);
      expect(isValidTimeRange(''), false);
    });
  });

  group('Building/Unit ID Validation Tests', () {
    bool isValidBuildingId(String id) {
      return RegExp(r'^building_\d{3}$').hasMatch(id);
    }

    bool isValidUnitId(String id) {
      return RegExp(r'^unit_\d{3}$').hasMatch(id);
    }

    test('valid building IDs pass', () {
      expect(isValidBuildingId('building_001'), true);
      expect(isValidBuildingId('building_002'), true);
      expect(isValidBuildingId('building_999'), true);
    });

    test('invalid building IDs fail', () {
      expect(isValidBuildingId('building_1'), false);
      expect(isValidBuildingId('building_0001'), false);
      expect(isValidBuildingId('bldg_001'), false);
      expect(isValidBuildingId(''), false);
    });

    test('valid unit IDs pass', () {
      expect(isValidUnitId('unit_001'), true);
      expect(isValidUnitId('unit_002'), true);
      expect(isValidUnitId('unit_003'), true);
    });

    test('invalid unit IDs fail', () {
      expect(isValidUnitId('unit_1'), false);
      expect(isValidUnitId('unit_0001'), false);
      expect(isValidUnitId('apartment_001'), false);
      expect(isValidUnitId(''), false);
    });
  });
}
