import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:singgah_pos_mobile/screens/login_screen.dart';
import 'package:singgah_pos_mobile/services/auth_provider.dart';

void main() {
  testWidgets('App shows login screen on launch', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AuthProvider()..tryAutoLogin(),
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pump();

    expect(find.text('Singgah Coffee POS'), findsOneWidget);
    expect(find.text('Login to start your shift'), findsOneWidget);
  });
}
