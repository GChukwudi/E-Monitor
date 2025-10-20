// ignore_for_file: prefer_interpolation_to_compose_strings, avoid_print

import 'dart:convert';
import 'package:crypto/crypto.dart';

class HashUtils {
  /// Hash access code using the same algorithm as web dashboard
  static String hashAccessCode(String accessCode) {
    try {
      // Use the EXACT same salt as web dashboard
      final input = accessCode + 'unit_salt_2024';
      final bytes = utf8.encode(input);
      final digest = sha256.convert(bytes);
      return digest.toString();
    } catch (error) {
      print('Error hashing access code: $error');
      // Fallback
      final input = accessCode + 'unit_salt_2024';
      final bytes = utf8.encode(input);
      return base64.encode(bytes);
    }
  }

  /// Verify if a plain text access code matches a hashed one
  static bool verifyAccessCode(String plainCode, String hashedCode) {
    try {
      final hashedInput = hashAccessCode(plainCode);
      return hashedInput == hashedCode;
    } catch (error) {
      print('Error verifying access code: $error');
      return false;
    }
  }
}
