import 'package:enterprise_erp_app/app/erp_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('super admin can sign in and open ERP workspace', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1400, 1000);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const ErpApp());

    expect(find.text('Enterprise ERP'), findsOneWidget);
    expect(find.text('Email or username'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);

    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Super Admin Control Plane'), findsOneWidget);
    expect(find.text('Create Company / Entity'), findsOneWidget);
    expect(find.text('Feature Access'), findsOneWidget);

    await tester.tap(find.text('Open ERP workspace'));
    await tester.pumpAndSettle();

    expect(find.text('Command Center'), findsWidgets);
    expect(find.text('Enterprise cockpit'), findsWidgets);
    expect(find.text('Enterprise Process Map'), findsOneWidget);
    expect(find.text('Order-to-cash'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('module-manufacturing')));
    await tester.pumpAndSettle();

    expect(find.text('Manufacturing'), findsWidgets);
    expect(find.text('Plan to produce'), findsWidgets);
    expect(find.text('BOMs and alternate BOMs'), findsOneWidget);
  });
}
