import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const ElectricityMonitorApp());
}

class ElectricityMonitorApp extends StatelessWidget {
  const ElectricityMonitorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Energy Monitor',
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFFAFAFA),
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF84A98C),
          secondary: Color(0xFFE07A5F),
          surface: Color(0xFFF5F5F4),
          error: Color(0xFFE07A5F),
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: Color(0xFF3D405B),
        ),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: false,
          backgroundColor: Color(0xFFF8FBF8),
          foregroundColor: Color(0xFFF8FBF8),
          titleTextStyle: TextStyle(
            color: Color(0xFF3D405B),
            fontSize: 24,
            fontWeight: FontWeight.w600,
          ),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE5E7EB), width: 1),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: Color(0xFF84A98C),
          unselectedItemColor: Color(0xFF6B7280),
          elevation: 8,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600),
        ),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: Color(0xFF3D405B)),
          bodyMedium: TextStyle(color: Color(0xFF6B7280)),
          titleLarge: TextStyle(
            color: Color(0xFF3D405B),
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      home: const LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
