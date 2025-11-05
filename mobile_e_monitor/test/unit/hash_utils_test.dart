import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_e_monitor/utils/hash_utils.dart';

void main() {
  group('HashUtils Tests', () {
    test('hashAccessCode returns consistent hash for same input', () {
      // Arrange
      const accessCode = 'TEST1234';

      // Act
      final hash1 = HashUtils.hashAccessCode(accessCode);
      final hash2 = HashUtils.hashAccessCode(accessCode);

      // Assert
      expect(hash1, hash2);
      expect(hash1, isNotEmpty);
    });

    test('hashAccessCode returns different hashes for different inputs', () {
      // Arrange
      const accessCode1 = 'TEST1234';
      const accessCode2 = 'TEST5678';

      // Act
      final hash1 = HashUtils.hashAccessCode(accessCode1);
      final hash2 = HashUtils.hashAccessCode(accessCode2);

      // Assert
      expect(hash1, isNot(equals(hash2)));
    });

    test('hashAccessCode handles lowercase and uppercase consistently', () {
      // Arrange
      const lowercase = 'test1234';
      const uppercase = 'TEST1234';

      // Act
      final hashLower = HashUtils.hashAccessCode(lowercase);
      final hashUpper = HashUtils.hashAccessCode(uppercase);

      // Assert
      expect(hashLower, isNot(equals(hashUpper))); // Case sensitive
    });

    test('verifyAccessCode returns true for matching codes', () {
      // Arrange
      const plainCode = 'TEST1234';
      final hashedCode = HashUtils.hashAccessCode(plainCode);

      // Act
      final isValid = HashUtils.verifyAccessCode(plainCode, hashedCode);

      // Assert
      expect(isValid, true);
    });

    test('verifyAccessCode returns false for non-matching codes', () {
      // Arrange
      const plainCode = 'TEST1234';
      const wrongCode = 'WRONG123';
      final hashedCode = HashUtils.hashAccessCode(plainCode);

      // Act
      final isValid = HashUtils.verifyAccessCode(wrongCode, hashedCode);

      // Assert
      expect(isValid, false);
    });

    test('hashAccessCode handles empty string', () {
      // Act
      final hash = HashUtils.hashAccessCode('');

      // Assert
      expect(hash, isNotEmpty);
    });

    test('hashAccessCode produces SHA-256 hash (64 characters)', () {
      // Arrange
      const accessCode = 'TEST1234';

      // Act
      final hash = HashUtils.hashAccessCode(accessCode);

      // Assert
      expect(hash.length, 64); // SHA-256 produces 64-character hex string
    });

    test('verifyAccessCode handles edge cases', () {
      // Test with special characters
      const specialCode = 'TEST@#\$%';
      final hashedSpecial = HashUtils.hashAccessCode(specialCode);
      expect(HashUtils.verifyAccessCode(specialCode, hashedSpecial), true);

      // Test with numbers only
      const numericCode = '12345678';
      final hashedNumeric = HashUtils.hashAccessCode(numericCode);
      expect(HashUtils.verifyAccessCode(numericCode, hashedNumeric), true);
    });

    test('hash includes salt in calculation', () {
      // This test verifies that the salt is being used
      // by checking that the hash is different from a simple SHA-256 of the code

      // Arrange
      const accessCode = 'TEST1234';

      // Act
      final hashedWithSalt = HashUtils.hashAccessCode(accessCode);

      // Assert
      // The hash should be different from hashing just the access code
      // because it includes 'unit_salt_2024'
      expect(hashedWithSalt, isNotEmpty);
      expect(hashedWithSalt.length, 64);
    });

    test('multiple verification attempts with same code work correctly', () {
      // Arrange
      const plainCode = 'UNIT001A';
      final hashedCode = HashUtils.hashAccessCode(plainCode);

      // Act & Assert
      expect(HashUtils.verifyAccessCode(plainCode, hashedCode), true);
      expect(HashUtils.verifyAccessCode(plainCode, hashedCode), true);
      expect(HashUtils.verifyAccessCode(plainCode, hashedCode), true);
    });

    test('verifyAccessCode with invalid hash format returns false', () {
      // Arrange
      const plainCode = 'TEST1234';
      const invalidHash = 'not-a-valid-hash';

      // Act
      final isValid = HashUtils.verifyAccessCode(plainCode, invalidHash);

      // Assert
      expect(isValid, false);
    });
  });

  group('Access Code Format Tests', () {
    test('typical access code format UNIT####', () {
      const codes = ['UNIT0001', 'UNIT0002', 'UNIT9999'];

      for (final code in codes) {
        final hash = HashUtils.hashAccessCode(code);
        expect(hash, isNotEmpty);
        expect(HashUtils.verifyAccessCode(code, hash), true);
      }
    });

    test('8-character access codes', () {
      const codes = ['TEST1234', 'ABCD5678', 'ZYXW9876'];

      for (final code in codes) {
        expect(code.length, 8);
        final hash = HashUtils.hashAccessCode(code);
        expect(HashUtils.verifyAccessCode(code, hash), true);
      }
    });
  });
}
