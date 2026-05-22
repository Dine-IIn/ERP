import 'package:flutter_test/flutter_test.dart';
import 'package:antigravity_erp/app_state.dart';

void main() {
  group('Phased Master Production Schedule & Batch MRP Scheduler Tests', () {
    late AppState appState;

    setUp(() {
      appState = AppState();
      appState.logout();
    });

    test('1. Verify Seeded Master Production Order & Staged Batch Split Structure', () {
      // 1. Log in as Dine-In admin
      final loginErr = appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );
      expect(loginErr, isNull);
      
      // 2. Fetch seeded MPOs
      final orders = appState.masterProductionOrdersForCurrentCompany;
      expect(orders.length, greaterThanOrEqualTo(1));
      
      final mpo = orders.firstWhere((o) => o.id == 'mpo_seed');
      expect(mpo.salesOrderCode, equals('SO-101'));
      expect(mpo.totalQuantity, equals(10));
      expect(mpo.batches.length, equals(3));
      
      // Assert batch splits are exactly 3, 3, and 4
      expect(mpo.batches[0].batchQuantity, equals(3));
      expect(mpo.batches[0].batchNumber, equals('B-01'));
      expect(mpo.batches[0].status, equals('Draft'));

      expect(mpo.batches[1].batchQuantity, equals(3));
      expect(mpo.batches[1].batchNumber, equals('B-02'));
      expect(mpo.batches[1].status, equals('Draft'));

      expect(mpo.batches[2].batchQuantity, equals(4));
      expect(mpo.batches[2].batchNumber, equals('B-03'));
      expect(mpo.batches[2].status, equals('Draft'));
    });

    test('2. Execute Phased MRP Stock Check, Staged Procurement, and Batch Assembly Run', () {
      // 1. Log in as Dine-In admin
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      final orders = appState.masterProductionOrdersForCurrentCompany;
      final mpo = orders.firstWhere((o) => o.id == 'mpo_seed');

      // Record baseline finished inventory & cash outflow counts
      final initialValves = appState.inventoryForCurrentCompany.firstWhere((i) => i.sku == 'VALVE-01').quantity;
      final initialTransactionsCount = appState.ledgerTransactionsForCurrentCompany.length;

      // STEP 1: Run Stock Check for Batch 1 (Qty 3)
      final mrpErr = appState.runMRPForBatch('mpo_seed', 0);
      expect(mrpErr, isNull);
      expect(mpo.batches[0].status, equals('MRP Planned'));

      // STEP 2: Procure missing raw components specifically for Batch 1
      final procureErr = appState.generateRequisitionAndProcureBatch('mpo_seed', 0);
      expect(procureErr, isNull);
      expect(mpo.batches[0].status, equals('PO Placed'));

      // Assert cash ledger transaction was logged
      final currentTransactions = appState.ledgerTransactionsForCurrentCompany;
      expect(currentTransactions.length, equals(initialTransactionsCount + 1)); // 1 for ledger staged procurement outflow
      final mpoTransaction = currentTransactions.firstWhere((t) => t.description.contains('MRP Procurement outflow for Batch B-01'));
      expect(mpoTransaction.type, equals('Debit'));
      expect(mpoTransaction.amount, greaterThan(0.0));

      // STEP 3: Execute Batch 1 Production assembly
      final executeErr = appState.executeBatchProductionRun('mpo_seed', 0);
      expect(executeErr, isNull);
      expect(mpo.batches[0].status, equals('Completed'));

      // Assert finished valves stock increased by exactly 3 (Batch 1 quantity)
      final currentValves = appState.inventoryForCurrentCompany.firstWhere((i) => i.sku == 'VALVE-01').quantity;
      expect(currentValves, equals(initialValves + 3));

      // Assert remaining batches (Batch 2 and Batch 3) are untouched in Draft state
      expect(mpo.batches[1].status, equals('Draft'));
      expect(mpo.batches[2].status, equals('Draft'));
      expect(mpo.status, equals('Active')); // Order is not fully completed yet
    });

    test('3. Test Dashboard Layout Customizer Registry & Visibility Gating State Controllers', () {
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      final availableModules = ['crm', 'finance', 'inventory', 'manufacturing', 'hrm'];
      
      // Default layout resolver
      final defaultLayout = appState.getDashboardLayoutForUser('admin', availableModules);
      expect(defaultLayout, equals(availableModules));

      // Update workspace layout: reorder inventory to top, hide hrm module
      final customLayoutOrder = ['inventory', 'crm', 'finance', 'manufacturing', 'hrm'];
      final hiddenSet = {'hrm'};

      appState.updateDashboardLayoutForUser('admin', customLayoutOrder, hiddenSet);

      // Verify custom values are stored and resolved reactively
      final resolvedLayout = appState.getDashboardLayoutForUser('admin', availableModules);
      expect(resolvedLayout, equals(customLayoutOrder));

      final resolvedHidden = appState.getHiddenModulesForUser('admin');
      expect(resolvedHidden, contains('hrm'));
      expect(resolvedHidden.length, equals(1));
    });
  });
}
