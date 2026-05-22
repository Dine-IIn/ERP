import 'package:flutter_test/flutter_test.dart';
import 'package:antigravity_erp/app_state.dart';

void main() {
  group('Splitwise Chat Settlement Engine & Ledger Isolation Tests', () {
    late AppState appState;

    setUp(() {
      appState = AppState();
      appState.logout();
    });

    test('1. Create Custom Chat Group and Add Company Members', () {
      // Log in as DINE admin
      final loginErr = appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );
      expect(loginErr, isNull);

      final initialGroupsCount = appState.chatGroupsForCurrentCompany.length;

      // Create a custom chat group
      appState.createChatGroup(
        'DINE Lunch Buddies',
        ['admin', 'sales_user', 'inventory_user'],
        enableP2PTransfers: true,
      );

      final currentGroups = appState.chatGroupsForCurrentCompany;
      expect(currentGroups.length, equals(initialGroupsCount + 1));
      
      final newGroup = currentGroups.firstWhere((g) => g.name == 'DINE Lunch Buddies');
      expect(newGroup.members, containsAll(['admin', 'sales_user', 'inventory_user']));
      expect(newGroup.enableP2PTransfers, isTrue);
      expect(newGroup.companyCode, equals('DINE'));
      expect(newGroup.createdBy, equals('admin'));
    });

    test('2. Log Group-Specific Expenses & Update Net Balances', () {
      // Log in as DINE admin
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      // Create a new isolated chat group
      appState.createChatGroup(
        'Project Alpha Settlement',
        ['admin', 'sales_user'],
        enableP2PTransfers: true,
      );

      final group = appState.chatGroupsForCurrentCompany.firstWhere((g) => g.name == 'Project Alpha Settlement');
      final groupId = group.id;

      // Check initial splitwise calculation balance
      var totals = appState.calculateGroupTotals(groupId);
      expect(totals['spent']!['admin'], equals(0.0));
      expect(totals['spent']!['sales_user'], equals(0.0));
      expect(totals['net']!['admin'], equals(0.0));
      expect(totals['net']!['sales_user'], equals(0.0));

      // Admin logs an expense of Rs. 150 for 'AWS Cloud Servers' in this group
      final err1 = appState.logExpense(
        description: 'AWS Cloud Servers',
        amount: 150.0,
        category: 'Hardware',
        isGroupExpense: true,
        groupId: groupId,
      );
      expect(err1, isNull);

      // Recalculate totals
      totals = appState.calculateGroupTotals(groupId);
      expect(totals['spent']!['admin'], equals(150.0));
      expect(totals['spent']!['sales_user'], equals(0.0));
      
      // Since no transfers have occurred: Net = Spent - Received + Sent
      // Admin: 150 - 0 + 0 = 150
      // Sales User: 0 - 0 + 0 = 0
      expect(totals['net']!['admin'], equals(150.0));
      expect(totals['net']!['sales_user'], equals(0.0));

      // Sales user logs an expense of Rs. 50 for 'Office Spares' in this group
      // First log in as sales_user
      appState.logout();
      appState.login(
        username: 'sales_user',
        password: 'salespassword',
        companyCode: 'DINE',
      );

      final err2 = appState.logExpense(
        description: 'Office Spares',
        amount: 50.0,
        category: 'Other',
        isGroupExpense: true,
        groupId: groupId,
      );
      expect(err2, isNull);

      // Recalculate totals
      totals = appState.calculateGroupTotals(groupId);
      expect(totals['spent']!['admin'], equals(150.0));
      expect(totals['spent']!['sales_user'], equals(50.0));
      expect(totals['net']!['admin'], equals(150.0));
      expect(totals['net']!['sales_user'], equals(50.0));
    });

    test('3. Record P2P Group Transfers & Verify Splitwise Settlement Math', () {
      // Log in as DINE admin
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      // Create a new isolated chat group
      appState.createChatGroup(
        'Travel Expenses Group',
        ['admin', 'sales_user'],
        enableP2PTransfers: true,
      );

      final group = appState.chatGroupsForCurrentCompany.firstWhere((g) => g.name == 'Travel Expenses Group');
      final groupId = group.id;

      // 1. Admin logs a group expense of Rs. 100
      appState.logExpense(
        description: 'Travel Petrol Fare',
        amount: 100.0,
        category: 'Travel',
        isGroupExpense: true,
        groupId: groupId,
      );

      // Check state:
      // Admin: Spent = 100, Net = 100
      // Sales User: Spent = 0, Net = 0
      var totals = appState.calculateGroupTotals(groupId);
      expect(totals['spent']!['admin'], equals(100.0));
      expect(totals['net']!['admin'], equals(100.0));
      expect(totals['spent']!['sales_user'], equals(0.0));
      expect(totals['net']!['sales_user'], equals(0.0));

      // 2. Sales User transfers Rs. 100 to Admin to settle up (reimburse Admin's spending)
      appState.logout();
      appState.login(
        username: 'sales_user',
        password: 'salespassword',
        companyCode: 'DINE',
      );

      appState.logGroupTransfer(groupId, 'sales_user', 'admin', 100.0);

      // 3. Verify math equation holds:
      // Net Spending_X = (Total Spent by X) - (Total Received by X) + (Total Sent by X)
      //
      // Admin: Spent = 100, Received = 100, Sent = 0
      // Admin Net = 100 - 100 + 0 = 0.0
      //
      // Sales User: Spent = 0, Received = 0, Sent = 100
      // Sales User Net = 0 - 0 + 100 = 100.0
      totals = appState.calculateGroupTotals(groupId);
      
      expect(totals['spent']!['admin'], equals(100.0));
      expect(totals['received']!['admin'], equals(100.0));
      expect(totals['sent']!['admin'], equals(0.0));
      expect(totals['net']!['admin'], equals(0.0)); // A's net spending becomes 0!

      expect(totals['spent']!['sales_user'], equals(0.0));
      expect(totals['received']!['sales_user'], equals(0.0));
      expect(totals['sent']!['sales_user'], equals(100.0));
      expect(totals['net']!['sales_user'], equals(100.0)); // B's net spending becomes 100!
    });

    test('4. Group Chats and Transfers Isolation across Tenant Boundary Gating', () {
      // 1. Log in as DINE admin and create DINE-specific group
      appState.login(
        username: 'admin',
        password: 'adminpassword',
        companyCode: 'DINE',
      );

      appState.createChatGroup(
        'DINE Secret Core Strategy',
        ['admin', 'sales_user'],
        enableP2PTransfers: true,
      );

      final dineGroup = appState.chatGroupsForCurrentCompany.firstWhere((g) => g.name == 'DINE Secret Core Strategy');
      final dineGroupId = dineGroup.id;

      appState.logExpense(
        description: 'Secret R&D Spares',
        amount: 5000.0,
        category: 'Hardware',
        isGroupExpense: true,
        groupId: dineGroupId,
      );

      appState.logGroupTransfer(dineGroupId, 'sales_user', 'admin', 2500.0);

      // Verify that general messages under DINE secret group can be loaded
      final dineMsgs = appState.getMessagesForGroup(dineGroupId);
      expect(dineMsgs.isNotEmpty, isTrue);

      // 2. Log out and log in as FUTURE company admin
      appState.logout();
      appState.login(
        username: 'future_admin',
        password: 'futurepassword',
        companyCode: 'FUTURE',
      );

      // Assert that DINE-specific group is completely invisible
      final futureGroups = appState.chatGroupsForCurrentCompany;
      expect(futureGroups.any((g) => g.id == dineGroupId), isFalse);

      // Assert that group expenses and transfers cannot be accessed under FUTURE context
      final leakedExpenses = appState.getGroupExpenses(dineGroupId);
      expect(leakedExpenses, isEmpty);

      final leakedTransfers = appState.getGroupTransfers(dineGroupId);
      expect(leakedTransfers, isEmpty);

      final leakedMsgs = appState.getMessagesForGroup(dineGroupId);
      expect(leakedMsgs, isEmpty);
    });
  });
}
