import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'home_page.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _accessCodeController = TextEditingController();
  bool _isLoading = false;
  bool _obscureText = true;
  String? _errorMessage;

  @override
  void dispose() {
    _accessCodeController.dispose();
    super.dispose();
  }

  Future<void> _loginWithAccessCode() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final accessCode = _accessCodeController.text.trim().toUpperCase();

    if (accessCode.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter your access code';
        _isLoading = false;
      });
      return;
    }

    try {
      final DatabaseReference database = FirebaseDatabase.instance.ref();
      final buildingsSnapshot = await database.child('buildings').get();

      if (!buildingsSnapshot.exists) {
        setState(() {
          _errorMessage = 'No buildings found';
          _isLoading = false;
        });
        return;
      }

      final buildingsData = buildingsSnapshot.value as Map<dynamic, dynamic>;

      for (final buildingEntry in buildingsData.entries) {
        final buildingId = buildingEntry.key as String;
        final buildingData = buildingEntry.value as Map<dynamic, dynamic>;

        if (buildingData.containsKey('units')) {
          final units = buildingData['units'] as Map<dynamic, dynamic>;

          for (final unitEntry in units.entries) {
            final unitId = unitEntry.key as String;
            final unitData = unitEntry.value as Map<dynamic, dynamic>;

            if (unitData['accessCode'] == accessCode &&
                (unitData['isActive'] ?? true)) {
              if (mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) => HomePage(
                      authenticatedUnitId: unitId,
                      buildingId: buildingId,
                      buildingName: buildingData['name'] ?? 'Building',
                      accessCode: accessCode,
                    ),
                  ),
                );
              }
              return;
            }
          }
        }
      }

      setState(() {
        _errorMessage = 'Invalid access code or unit not active';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Login failed: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF84A98C),
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - 96,
              ),
              child: IntrinsicHeight(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Centered card
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'Enter your unit\'s access code',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF3D405B),
                            ),
                          ),
                          const SizedBox(height: 24),
                          TextField(
                            controller: _accessCodeController,
                            obscureText: _obscureText,
                            textCapitalization: TextCapitalization.characters,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 2,
                            ),
                            decoration: InputDecoration(
                              labelText: 'Access Code',
                              hintText: 'Enter provided code',
                              hintStyle: const TextStyle(
                                color: Color(0xFF9CA3AF),
                                fontWeight: FontWeight.w400,
                                fontSize: 14,
                              ),
                              prefixIcon: const Icon(
                                Icons.lock_outline,
                                color: Color(0xFF6B7280),
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscureText
                                      ? Icons.visibility
                                      : Icons.visibility_off,
                                  color: const Color(0xFF6B7280),
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscureText = !_obscureText;
                                  });
                                },
                              ),
                              filled: true,
                              fillColor: const Color(0xFFF5F5F4),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: Color(0xFFE5E7EB),
                                  width: 1,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color:
                                      const Color(0xFF84A98C).withOpacity(0.4),
                                  width: 2,
                                ),
                              ),
                              errorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: Color(0xFFE07A5F),
                                  width: 2,
                                ),
                              ),
                            ),
                            maxLength: 8,
                            onSubmitted: (_) => _loginWithAccessCode(),
                          ),
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE07A5F).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color:
                                      const Color(0xFFE07A5F).withOpacity(0.3),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.error_outline,
                                    color: Color(0xFFE07A5F),
                                    size: 20,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(
                                        color: Color(0xFFE07A5F),
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed:
                                  _isLoading ? null : _loginWithAccessCode,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF84A98C),
                                foregroundColor: Colors.white,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                disabledBackgroundColor:
                                    const Color(0xFF84A98C).withOpacity(0.6),
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Text(
                                      'Access My Unit',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 80),

                    Text(
                      'Don\'t have an access code?\nContact your property manager',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.8),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
