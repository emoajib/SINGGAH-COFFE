import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:singgah_pos_mobile/screens/dashboard_screen.dart';
import 'package:singgah_pos_mobile/screens/login_screen.dart';
import 'package:singgah_pos_mobile/services/auth_provider.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider()..tryAutoLogin(),
      child: const SinggahPosApp(),
    ),
  );
}

class SinggahPosApp extends StatelessWidget {
  const SinggahPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isInitializing) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            home: Scaffold(
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.coffee, size: 64, color: Color(0xFF4B3621)),
                    const SizedBox(height: 16),
                    const CircularProgressIndicator(),
                  ],
                ),
              ),
            ),
          );
        }
        return MaterialApp(
          title: 'Singgah Coffee POS',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF4B3621),
              secondary: const Color(0xFFD4A373),
            ),
            useMaterial3: true,
            fontFamily: 'Inter',
          ),
          home: auth.isAuthenticated ? const DashboardScreen() : const LoginScreen(),
        );
      },
    );
  }
}
