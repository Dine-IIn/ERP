import 'package:flutter_test/flutter_test.dart';
import 'package:antigravity_erp/app_state.dart';

void main() {
  group('SaaS ERP Business Engine & Multi-Tenant Integration Tests', () {
    late AppState appState;

    setUp(() {
      // Access the singleton and reset sessions/registries for fresh test isolation
      appState = AppState();
      appState.logout();
    });

    test('1. Multi-Tenant User Isolation & Auth Gating', () {
      // Attempt login with invalid credentials
      final loginErr = appState.login(
        username: 'nonexistent',
        password: 'wrongpassword',
        companyCode: 'DINE',
      );
      expect(loginErr, isNotNull);
      expect(appState.currentUser, isNull);

      // Login as Dine-In admin
      final dineAdminErr = appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );
      expect(dineAdminErr, isNull);
      expect(appState.currentUser, isNotNull);
      expect(appState.currentUser!.username, equals('admin'));
      expect(appState.currentUser!.companyCode, equals('DINE'));
      expect(appState.currentCompany!.code, equals('DINE'));

      // Verify that isolated registries only return DINE company records
      final dineLeads = appState.leadsForCurrentCompany;
      expect(dineLeads.isNotEmpty, isTrue);
      expect(dineLeads.every((l) => l.companyCode == 'DINE'), isTrue);

      final dineInventory = appState.inventoryForCurrentCompany;
      expect(dineInventory.isNotEmpty, isTrue);
      expect(dineInventory.every((i) => i.companyCode == 'DINE'), isTrue);

      // Log out and log in as Future Corp Admin to assert tenant boundary gating
      appState.logout();
      expect(appState.currentUser, isNull);

      final futureAdminErr = appState.login(
        username: 'future_admin',
        password: 'futurepassword',
        companyCode: 'FUTURE',
      );
      expect(futureAdminErr, isNull);
      expect(appState.currentUser!.companyCode, equals('FUTURE'));
      expect(appState.currentCompany!.code, equals('FUTURE'));

      // Future Corp is a standard tier tenant and has no seeded CRM leads or inventory
      expect(appState.leadsForCurrentCompany, isEmpty);
      expect(appState.inventoryForCurrentCompany, isEmpty);
    });

    test('2. Unified Workflow: CRM Won Lead Conversion -> Stock Deduction & Ledger Credit', () {
      // Login as DINE Admin to access seeded registries
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      final leadsBefore = appState.leadsForCurrentCompany;
      final inventoryBefore = appState.inventoryForCurrentCompany;
      final ledgerBefore = appState.ledgerTransactionsForCurrentCompany;

      // Identify target lead: lead1 (Acme Industrial Pipes), deal value: 85000
      final targetLead = leadsBefore.firstWhere((l) => l.id == 'lead1');
      expect(targetLead.status, equals('Hot'));

      // Identify target warehouse SKU: VALVE-01 (Pressure Relief Valve), quantity: 15, unit price: 2400
      final targetItem = inventoryBefore.firstWhere((i) => i.sku == 'VALVE-01');
      expect(targetItem.quantity, equals(15));

      // Attempt convert won sale with insufficient stock
      final failErr = appState.convertLeadToSale(
        leadId: 'lead1',
        inventorySku: 'VALVE-01',
        quantity: 50, // exceeds available stock 15
      );
      expect(failErr, contains('Insufficient warehouse stock'));

      // Convert won sale with valid quantity: 5 valves
      final successErr = appState.convertLeadToSale(
        leadId: 'lead1',
        inventorySku: 'VALVE-01',
        quantity: 5,
      );
      expect(successErr, isNull);

      // Assert Lead transitions to 'Won' and deal value is updated based on sold quantity * unitPrice
      final updatedLeads = appState.leadsForCurrentCompany;
      final wonLead = updatedLeads.firstWhere((l) => l.id == 'lead1');
      expect(wonLead.status, equals('Won'));
      expect(wonLead.dealValue, equals(5 * 2400.0)); // 12000.0

      // Assert warehouse inventory stock count is correctly deducted
      final updatedInventory = appState.inventoryForCurrentCompany;
      final deductedItem = updatedInventory.firstWhere((i) => i.sku == 'VALVE-01');
      expect(deductedItem.quantity, equals(10)); // 15 - 5

      // Assert finance double-entry ledger is credited under Sales Revenue (ACC-202)
      final updatedLedger = appState.ledgerTransactionsForCurrentCompany;
      final creditTx = updatedLedger.lastWhere((t) => t.code == 'ACC-202');
      expect(creditTx.type, equals('Credit'));
      expect(creditTx.amount, equals(12000.0));
      expect(creditTx.description, contains('Invoice generated from Won Lead'));

      // Assert notification is posted to the company general chat
      final chatMsgs = appState.messagesForCurrentCompany;
      expect(chatMsgs.last.content, contains('Invoice generated! Lead "Acme Industrial Pipes" converted to Won.'));
    });

    test('3. Unified Workflow: Manufacturing Production Job -> BOM Raw Material Deductions', () {
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      final inventoryBefore = appState.inventoryForCurrentCompany;
      final recipes = appState.recipesForCurrentCompany;

      // Identify Standard Pressure Valve Assembly recipe (finished SKU: VALVE-01)
      // Ingredients: STEEL-03 (1), BRASS-07 (10), COPPER-09 (2 sheets)
      final recipe = recipes.firstWhere((r) => r.id == 'REC-VALVE');
      
      final rawSteel = inventoryBefore.firstWhere((i) => i.sku == 'STEEL-03');
      final rawBrass = inventoryBefore.firstWhere((i) => i.sku == 'BRASS-07');
      final rawCopper = inventoryBefore.firstWhere((i) => i.sku == 'COPPER-09');
      final finishedValve = inventoryBefore.firstWhere((i) => i.sku == 'VALVE-01');

      final initialSteelQty = rawSteel.quantity; // 82
      final initialBrassQty = rawBrass.quantity; // 450
      final initialCopperQty = rawCopper.quantity; // 8
      final initialValveQty = finishedValve.quantity; // 10 (deducted in previous test step)

      // Attempt to schedule production exceeding copper sheets stock (required: 2 * 5 = 10 sheets, available: 8 sheets)
      final failJobErr = appState.scheduleProductionJob(
        recipeId: 'REC-VALVE',
        qtyToProduce: 5,
      );
      expect(failJobErr, contains('Insufficient raw components'));

      // Schedule successful production of 2 valves (required: 2 rolls steel, 20 units brass, 4 sheets copper)
      final successJobErr = appState.scheduleProductionJob(
        recipeId: 'REC-VALVE',
        qtyToProduce: 2,
      );
      expect(successJobErr, isNull);

      // Assert raw materials are deducted
      final updatedInventory = appState.inventoryForCurrentCompany;
      expect(updatedInventory.firstWhere((i) => i.sku == 'STEEL-03').quantity, equals(initialSteelQty - 2 * 1));
      expect(updatedInventory.firstWhere((i) => i.sku == 'BRASS-07').quantity, equals(initialBrassQty - 2 * 10));
      expect(updatedInventory.firstWhere((i) => i.sku == 'COPPER-09').quantity, equals(initialCopperQty - 2 * 2));

      // Assert finished valve assembly stock count is incremented by 2
      expect(updatedInventory.firstWhere((i) => i.sku == 'VALVE-01').quantity, equals(initialValveQty + 2));

      // Assert completed production job is saved
      final jobs = appState.jobsForCurrentCompany;
      expect(jobs.last.recipeId, equals('REC-VALVE'));
      expect(jobs.last.qtyToProduce, equals(2));
      expect(jobs.last.status, equals('Completed'));
    });

    test('4. Unified Workflow: Collaborative Expense Splits -> Finance Ledger Cash Outflows', () {
      appState.login(
        username: 'sales_user',
        password: 'salespassword',
        companyCode: 'DINE',
      );

      final initialLedgerCount = appState.ledgerTransactionsForCurrentCompany.length;

      // Log a shared travel expense: ₹3,500
      final logErr = appState.logExpense(
        description: 'Client tech spares transit fare',
        amount: 3500.0,
        category: 'Travel',
        isGroupExpense: true,
        sharedWith: ['admin', 'inventory_user'],
      );
      expect(logErr, isNull);

      // Assert expense list increments
      final dineExpenses = appState.expensesForCurrentCompany;
      expect(dineExpenses.last.description, equals('Client tech spares transit fare'));
      expect(dineExpenses.last.amount, equals(3500.0));
      expect(dineExpenses.last.isGroupExpense, isTrue);

      // Assert double-entry ledger is debited under Cash & Bank (ACC-101) representing capital outflow
      final updatedLedger = appState.ledgerTransactionsForCurrentCompany;
      expect(updatedLedger.length, equals(initialLedgerCount + 1));
      expect(updatedLedger.last.code, equals('ACC-101'));
      expect(updatedLedger.last.type, equals('Debit'));
      expect(updatedLedger.last.amount, equals(3500.0));
      expect(updatedLedger.last.description, contains('Expense Outflow: Client tech spares transit fare'));
    });

    test('5. Unified Workflow: HRM Timesheets Clocking & Payslip Approval -> Finance Ledger Wages Debit', () {
      appState.login(
        username: 'sales_user',
        password: 'salespassword',
        companyCode: 'DINE',
      );

      // 1. Clock In Shift
      final initialTimesheetCount = appState.timesheetsForCurrentCompany.length;
      appState.clockInUser();
      expect(appState.timesheetsForCurrentCompany.length, equals(initialTimesheetCount + 1));
      expect(appState.timesheetsForCurrentCompany.last.clockOut, isNull);

      // 2. Clock Out Shift
      appState.clockOutUser();
      expect(appState.timesheetsForCurrentCompany.last.clockOut, isNotNull);
      expect(appState.timesheetsForCurrentCompany.last.totalHours, isNonNegative);

      // Logout sales user and log back in as Company Admin to approve payouts
      appState.logout();
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      // Identify pending payslip 'pay1' for sales_user
      final payslips = appState.payslipsForCurrentCompany;
      final targetPayslip = payslips.firstWhere((p) => p.id == 'pay1');
      expect(targetPayslip.status, equals('Pending'));
      final payoutAmount = targetPayslip.grossPayout;

      // Approve & pay the salary slip
      final approveErr = appState.approvePayslip('pay1');
      expect(approveErr, isNull);

      // Assert Payslip status is marked as 'Paid'
      final updatedPayslips = appState.payslipsForCurrentCompany;
      expect(updatedPayslips.firstWhere((p) => p.id == 'pay1').status, equals('Paid'));

      // Assert double-entry wages ledger debit (ACC-303) is posted automatically in Finance
      final ledger = appState.ledgerTransactionsForCurrentCompany;
      final debitTx = ledger.lastWhere((t) => t.code == 'ACC-303');
      expect(debitTx.type, equals('Debit'));
      expect(debitTx.amount, equals(payoutAmount));
      expect(debitTx.description, contains('Approved & Paid salary to sales_user'));
    });
  });
}
