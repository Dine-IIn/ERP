import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:antigravity_erp/main.dart';

void main() {
  testWidgets('ERP App smoke test - Portal Login Screen loads', (WidgetTester tester) async {
    // Set viewport size to avoid overflows on constrained testing environments
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;

    // Reset size after test completes
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    // Build our app and trigger a frame.
    await tester.pumpWidget(const AntiGravityERPApp());
    await tester.pumpAndSettle();

    // Verify that the portal login screen is loaded
    expect(find.text('Portal Login'), findsOneWidget);
    expect(find.text('Scale Your Industry\nWith AntiGravity ERP'), findsOneWidget);

    // Verify that the text fields are rendered
    expect(find.byType(TextField), findsNWidgets(3)); // Company Code, Username, Password

    // Verify that Sandbox shortcuts exist
    expect(find.text('Super Admin'), findsOneWidget);
    expect(find.text('Company Admin'), findsOneWidget);
    expect(find.text('Sales Mgr'), findsOneWidget);

    // Tap on the "Super Admin" shortcut chip
    await tester.tap(find.text('Super Admin'));
    await tester.pumpAndSettle();

    // Since tapping "Super Admin" automatically triggers login, let's verify routing
    expect(find.text('Super Admin Controller'), findsOneWidget);
  });
}
