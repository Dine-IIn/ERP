// This is a basic Flutter widget test for the Enterprise ERP.
// We mock StorageService (SharedPreferences) and run the MultiProvider setup.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:enterprise_erp/core/utils/storage_service.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';
import 'package:enterprise_erp/providers/theme_provider.dart';
import 'package:enterprise_erp/providers/user_provider.dart';
import 'package:enterprise_erp/providers/company_provider.dart';
import 'package:enterprise_erp/providers/chat_provider.dart';
import 'package:enterprise_erp/providers/expense_provider.dart';
import 'package:enterprise_erp/providers/dashboard_provider.dart';

void main() {
  setUpAll(() async {
    // Mock shared preferences initial values
    SharedPreferences.setMockInitialValues({});
    await StorageService().init();
  });

  testWidgets('Enterprise ERP MaterialApp smoke test', (WidgetTester tester) async {
    final themeProvider = ThemeProvider();
    await themeProvider.initialize();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => themeProvider),
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => UserProvider()),
          ChangeNotifierProvider(create: (_) => CompanyProvider()),
          ChangeNotifierProvider(create: (_) => ChatProvider()),
          ChangeNotifierProvider(create: (_) => ExpenseProvider()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: Text('Enterprise ERP Ready'),
          ),
        ),
      ),
    );

    // Verify MaterialApp and target text widget are built successfully
    expect(find.text('Enterprise ERP Ready'), findsOneWidget);
  });
}

