import 'package:flutter/material.dart';
import 'models/company.dart';
import 'models/user.dart';
import 'models/expense.dart';
import 'models/chat.dart';
import 'models/erp_module_definition.dart';
import 'models/lead.dart';
import 'models/inventory_item.dart';
import 'models/ledger_transaction.dart';
import 'models/production.dart';
import 'models/hrm.dart';

enum ExpenseVisibilitySetting {
  showAllExpenses,       // Everyone can see all company expenses
  showOnlyOwnExpenses,   // Employees can only see their own expenses
  showDepartmentExpenses // Employees can see expenses of their own department / group
}

class AppState extends ChangeNotifier {
  // Singleton Pattern
  static final AppState _instance = AppState._internal();
  factory AppState() => _instance;
  AppState._internal() {
    _seedInitialData();
  }

  // Active User Sessions
  ERPUser? _currentUser;
  Company? _currentCompany;

  ERPUser? get currentUser => _currentUser;
  Company? get currentCompany => _currentCompany;

  // Database Registers
  final List<Company> _companies = [];
  final List<ERPUser> _users = [];
  final List<UserRole> _roles = [];
  final List<ChatMessage> _messages = [];
  final List<Expense> _expenses = [];
  final List<ChatGroup> _chatGroups = [];
  final List<GroupTransfer> _groupTransfers = [];
  
  // High-Fidelity Unified Business Process Registers
  final List<Lead> _leads = [];
  final List<InventoryItem> _inventory = [];
  final List<LedgerTransaction> _ledgerTransactions = [];
  final List<BOMRecipe> _recipes = [];
  final List<ProductionJob> _jobs = [];
  final List<TimesheetEntry> _timesheets = [];
  final List<Payslip> _payslips = [];
  final List<MasterProductionOrder> _masterProductionOrders = [];

  // Dashboard Customization preferences
  final Map<String, List<String>> _userDashboardLayouts = {};
  final Map<String, Set<String>> _userHiddenModules = {};

  // Expense Chat Configuration (Company Admin controlled)
  final Map<String, ExpenseVisibilitySetting> _expenseSettings = {};

  // OTP Verification Registry: Map<username, Map<otp, expiration>>
  final Map<String, String> _pendingOtps = {};
  final Map<String, ERPUser> _pendingRegistrations = {};

  // Getters
  List<Company> get companies => List.unmodifiable(_companies);
  List<ERPUser> get users => List.unmodifiable(_users);
  List<ChatGroup> get chatGroups => List.unmodifiable(_chatGroups);
  List<GroupTransfer> get groupTransfers => List.unmodifiable(_groupTransfers);
  List<MasterProductionOrder> get masterProductionOrders => List.unmodifiable(_masterProductionOrders);

  List<MasterProductionOrder> get masterProductionOrdersForCurrentCompany {
    if (_currentUser == null) return [];
    return _masterProductionOrders.where((o) => o.companyCode == _currentUser!.companyCode).toList();
  }
  
  List<ChatGroup> get chatGroupsForCurrentCompany {
    if (_currentUser == null) return [];
    return _chatGroups.where((g) => g.companyCode == _currentUser!.companyCode).toList();
  }

  List<GroupTransfer> getGroupTransfers(String groupId) {
    if (_currentUser == null) return [];
    return _groupTransfers.where((t) => t.groupId == groupId && t.companyCode == _currentUser!.companyCode).toList();
  }

  List<Expense> getGroupExpenses(String groupId) {
    if (_currentUser == null) return [];
    return _expenses.where((e) => e.groupId == groupId && e.companyCode == _currentUser!.companyCode).toList();
  }

  List<ChatMessage> getMessagesForGroup(String groupId) {
    if (_currentUser == null) return [];
    return _messages.where((m) => m.groupId == groupId && m.companyCode == _currentUser!.companyCode).toList();
  }

  // Split Settlement Ledger Math
  Map<String, Map<String, double>> calculateGroupTotals(String groupId) {
    final group = _chatGroups.firstWhere(
      (g) => g.id == groupId,
      orElse: () => ChatGroup(
        id: '',
        name: '',
        members: [],
        companyCode: '',
        createdBy: '',
        createdAt: DateTime.now(),
      ),
    );

    final Map<String, double> spent = {};
    final Map<String, double> received = {};
    final Map<String, double> sent = {};
    final Map<String, double> net = {};

    for (final member in group.members) {
      spent[member] = 0.0;
      received[member] = 0.0;
      sent[member] = 0.0;
      net[member] = 0.0;
    }

    // Spent is calculated by summing expenses logged in this group
    final groupExpenses = _expenses.where((e) => e.groupId == groupId).toList();
    for (final exp in groupExpenses) {
      final user = exp.loggedBy;
      if (spent.containsKey(user)) {
        spent[user] = (spent[user] ?? 0.0) + exp.amount;
      }
    }

    // Sent/Received is calculated by summing P2P transfers recorded in this group
    final transfers = _groupTransfers.where((t) => t.groupId == groupId).toList();
    for (final t in transfers) {
      final from = t.fromUser;
      final to = t.toUser;
      if (sent.containsKey(from)) {
        sent[from] = (sent[from] ?? 0.0) + t.amount;
      }
      if (received.containsKey(to)) {
        received[to] = (received[to] ?? 0.0) + t.amount;
      }
    }

    // Net Spending = Spent - Received + Sent
    for (final member in group.members) {
      net[member] = (spent[member] ?? 0.0) - (received[member] ?? 0.0) + (sent[member] ?? 0.0);
    }

    return {
      'spent': spent,
      'received': received,
      'sent': sent,
      'net': net,
    };
  }

  void createChatGroup(String name, List<String> members, {bool enableP2PTransfers = true, bool isDefaultGroup = false}) {
    if (_currentUser == null) return;
    final group = ChatGroup(
      id: isDefaultGroup ? '${_currentUser!.companyCode.toLowerCase()}_general' : 'group_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      members: members,
      companyCode: _currentUser!.companyCode,
      createdBy: _currentUser!.username,
      createdAt: DateTime.now(),
      enableP2PTransfers: enableP2PTransfers,
      isDefaultGroup: isDefaultGroup,
    );
    _chatGroups.add(group);
    notifyListeners();
  }

  void logGroupTransfer(String groupId, String fromUser, String toUser, double amount) {
    if (_currentUser == null) return;
    final transfer = GroupTransfer(
      id: 'trans_${DateTime.now().millisecondsSinceEpoch}',
      groupId: groupId,
      fromUser: fromUser,
      toUser: toUser,
      amount: amount,
      timestamp: DateTime.now(),
      companyCode: _currentUser!.companyCode,
    );
    _groupTransfers.add(transfer);

    // Auto-post notification into the Chat Group
    final msg = '$fromUser sent Rs. ${amount.toStringAsFixed(2)} to $toUser (Settlement)';
    final newMsg = ChatMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      sender: fromUser,
      content: msg,
      timestamp: DateTime.now(),
      companyCode: _currentUser!.companyCode,
      chatType: ChatType.expense,
      groupId: groupId,
    );
    _messages.add(newMsg);

    notifyListeners();
  }
  
  List<Lead> get leadsForCurrentCompany {
    if (_currentUser == null) return [];
    return _leads.where((l) => l.companyCode == _currentUser!.companyCode).toList();
  }

  List<InventoryItem> get inventoryForCurrentCompany {
    if (_currentUser == null) return [];
    return _inventory.where((i) => i.companyCode == _currentUser!.companyCode).toList();
  }

  List<LedgerTransaction> get ledgerTransactionsForCurrentCompany {
    if (_currentUser == null) return [];
    return _ledgerTransactions.where((t) => t.companyCode == _currentUser!.companyCode).toList();
  }

  List<BOMRecipe> get recipesForCurrentCompany {
    if (_currentUser == null) return [];
    return _recipes.where((r) => r.companyCode == _currentUser!.companyCode).toList();
  }

  List<ProductionJob> get jobsForCurrentCompany {
    if (_currentUser == null) return [];
    return _jobs.where((j) => j.companyCode == _currentUser!.companyCode).toList();
  }

  List<TimesheetEntry> get timesheetsForCurrentCompany {
    if (_currentUser == null) return [];
    return _timesheets.where((t) => t.companyCode == _currentUser!.companyCode).toList();
  }

  List<Payslip> get payslipsForCurrentCompany {
    if (_currentUser == null) return [];
    return _payslips.where((p) => p.companyCode == _currentUser!.companyCode).toList();
  }

  List<ERPUser> get usersForCurrentCompany {
    if (_currentUser == null) return [];
    return _users.where((u) => u.companyCode == _currentUser!.companyCode).toList();
  }

  List<UserRole> get rolesForCurrentCompany => 
      _roles.where((r) => r.companyCode == _currentUser?.companyCode).toList();

  List<ChatMessage> get messagesForCurrentCompany {
    if (_currentUser == null) return [];
    return _messages
        .where((m) => m.companyCode == _currentUser!.companyCode)
        .toList();
  }

  List<Expense> get expensesForCurrentCompany {
    if (_currentUser == null) return [];
    final code = _currentUser!.companyCode;
    final allCompanyExpenses = _expenses.where((e) => e.companyCode == code).toList();

    // Gating depending on Admin Setting
    final setting = getExpenseVisibilitySetting(code);
    if (_currentUser!.isCompanyAdmin || _currentUser!.isSuperAdmin) {
      return allCompanyExpenses;
    }

    switch (setting) {
      case ExpenseVisibilitySetting.showAllExpenses:
        return allCompanyExpenses;
      case ExpenseVisibilitySetting.showOnlyOwnExpenses:
        return allCompanyExpenses.where((e) => e.loggedBy == _currentUser!.username).toList();
      case ExpenseVisibilitySetting.showDepartmentExpenses:
        // Simulated: group split or shared is visible, plus personal
        return allCompanyExpenses.where((e) => 
            e.loggedBy == _currentUser!.username || 
            e.isGroupExpense ||
            e.sharedWith.contains(_currentUser!.username)
        ).toList();
    }
  }

  ExpenseVisibilitySetting getExpenseVisibilitySetting(String companyCode) {
    return _expenseSettings[companyCode] ?? ExpenseVisibilitySetting.showAllExpenses;
  }

  void setExpenseVisibilitySetting(String companyCode, ExpenseVisibilitySetting setting) {
    _expenseSettings[companyCode] = setting;
    notifyListeners();
  }

  // Pre-seed sample companies and users for high-fidelity interactive sandboxes
  void _seedInitialData() {
    // 1. Seed Super Admin
    _users.add(ERPUser(
      username: 'superadmin',
      password: 'supersecure123',
      email: 'owner@dineiin.com',
      mobile: '+919999988888',
      companyCode: 'SUPER',
      role: 'superadmin',
      permittedModuleIds: const [],
      isVerified: true,
    ));

    // 2. Seed First Tenant: Dine-In Technologies
    final dineInModules = Company.getDefaultModulesForTier(SubscriptionTier.enterprise);
    final dineIn = Company(
      name: 'Dine-In/ERP Technologies',
      code: 'DINE',
      email: 'contact@dineiin.com',
      mobile: '+918888877777',
      subscriptionTier: SubscriptionTier.enterprise,
      activeModuleIds: dineInModules,
    );
    _companies.add(dineIn);
    _expenseSettings['DINE'] = ExpenseVisibilitySetting.showAllExpenses;

    // Dine-In Admin
    _users.add(ERPUser(
      username: 'admin',
      password: 'adminpassword',
      email: 'admin@dineiin.com',
      mobile: '+918888812345',
      companyCode: 'DINE',
      role: 'admin',
      permittedModuleIds: dineInModules,
      isVerified: true,
    ));

    // Dine-In Custom Roles
    _roles.addAll([
      UserRole(name: 'Sales Manager', companyCode: 'DINE', permittedModuleIds: ['crm', 'sales', 'communication', 'analytics']),
      UserRole(name: 'Inventory Clerk', companyCode: 'DINE', permittedModuleIds: ['inventory', 'purchase', 'communication']),
      UserRole(name: 'Production Supervisor', companyCode: 'DINE', permittedModuleIds: ['manufacturing', 'qms', 'maintenance']),
    ]);

    // Dine-In Employees
    _users.addAll([
      ERPUser(
        username: 'sales_user',
        password: 'salespassword',
        email: 'sales@dineiin.com',
        mobile: '+917777712345',
        companyCode: 'DINE',
        role: 'Sales Manager',
        permittedModuleIds: ['crm', 'sales', 'communication', 'analytics'],
        isVerified: true,
      ),
      ERPUser(
        username: 'inventory_user',
        password: 'inventorypassword',
        email: 'store@dineiin.com',
        mobile: '+917777754321',
        companyCode: 'DINE',
        role: 'Inventory Clerk',
        permittedModuleIds: ['inventory', 'purchase', 'communication'],
        isVerified: true,
      ),
    ]);

    // Seed Default General Chat Group for DINE
    _chatGroups.add(ChatGroup(
      id: 'dine_general',
      name: 'General Channel',
      members: ['admin', 'sales_user', 'inventory_user'],
      companyCode: 'DINE',
      createdBy: 'admin',
      createdAt: DateTime.now().subtract(const Duration(days: 10)),
      enableP2PTransfers: true,
      isDefaultGroup: true,
    ));

    // Seed General Chats for DINE
    _messages.addAll([
      ChatMessage(
        id: 'msg1',
        sender: 'admin',
        content: 'Welcome to the Dine-In ERP portal! All systems are operational.',
        timestamp: DateTime.now().subtract(const Duration(hours: 4)),
        companyCode: 'DINE',
        chatType: ChatType.general,
        groupId: 'dine_general',
      ),
      ChatMessage(
        id: 'msg2',
        sender: 'sales_user',
        content: 'Hi Team! I just verified the CRM client pipeline list, and we logged three new hot leads today!',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        companyCode: 'DINE',
        chatType: ChatType.general,
        groupId: 'dine_general',
      ),
    ]);

    // Seed Initial Expenses for DINE
    final exp1 = Expense(
      id: 'exp1',
      description: 'Factory Raw Steel batch restocking',
      amount: 14500.0,
      category: 'Raw Material',
      companyCode: 'DINE',
      loggedBy: 'inventory_user',
      date: DateTime.now().subtract(const Duration(days: 3)),
      groupId: 'dine_general',
    );
    final exp2 = Expense(
      id: 'exp2',
      description: 'Sales Team client dinner & presentation',
      amount: 1250.0,
      category: 'Food',
      companyCode: 'DINE',
      loggedBy: 'sales_user',
      date: DateTime.now().subtract(const Duration(days: 1)),
      isGroupExpense: true,
      sharedWith: ['admin', 'sales_user'],
      groupId: 'dine_general',
    );
    _expenses.addAll([exp1, exp2]);

    _messages.addAll([
      ChatMessage(
        id: 'msg_exp1',
        sender: 'inventory_user',
        content: 'Logged raw materials expense: Rs. 14,500 for Steel Restocking.',
        timestamp: DateTime.now().subtract(const Duration(days: 3)),
        companyCode: 'DINE',
        chatType: ChatType.expense,
        linkedExpenseId: 'exp1',
        groupId: 'dine_general',
      ),
      ChatMessage(
        id: 'msg_exp2',
        sender: 'sales_user',
        content: 'Logged group dining expense: Rs. 1,250 split among Sales Dept.',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        companyCode: 'DINE',
        chatType: ChatType.expense,
        linkedExpenseId: 'exp2',
        groupId: 'dine_general',
      ),
    ]);

    // Seed high-fidelity modules data
    _leads.addAll([
      Lead(id: 'lead1', name: 'Acme Industrial Pipes', company: 'Acme Corp', dealValue: 85000.0, source: 'Website Inquiry', status: 'Hot', companyCode: 'DINE'),
      Lead(id: 'lead2', name: 'Global Infra Valves', company: 'Global Infra', dealValue: 120000.0, source: 'WhatsApp Import', status: 'Warm', companyCode: 'DINE'),
      Lead(id: 'lead3', name: 'Nexus Tech Spares', company: 'Nexus Inc', dealValue: 45000.0, source: 'Direct Outreach', status: 'Won', companyCode: 'DINE'),
    ]);

    _inventory.addAll([
      InventoryItem(sku: 'VALVE-01', name: 'Pressure Relief Valve', quantity: 15, capacity: 100, location: 'Zone A - Rack 02', status: 'OK', unitPrice: 2400.0, companyCode: 'DINE'),
      InventoryItem(sku: 'STEEL-03', name: 'Industrial Hot Rolled Steel Roll', quantity: 82, capacity: 500, location: 'Zone B - Rack 11', status: 'OK', unitPrice: 8500.0, companyCode: 'DINE'),
      InventoryItem(sku: 'BRASS-07', name: 'Heavy Brass Fitting', quantity: 450, capacity: 2000, location: 'Zone C - Drawer 05', status: 'OK', unitPrice: 150.0, companyCode: 'DINE'),
      InventoryItem(sku: 'COPPER-09', name: 'Standard Copper Wiring Sheet', quantity: 8, capacity: 200, location: 'Zone C - Rack 04', status: 'LOW', unitPrice: 420.0, companyCode: 'DINE'),
    ]);

    _ledgerTransactions.addAll([
      LedgerTransaction(id: 'tx1', code: 'ACC-101', account: 'Cash & Bank', type: 'Debit', amount: 500000.0, date: DateTime.now().subtract(const Duration(days: 5)), description: 'Opening Capital Balance', companyCode: 'DINE'),
      LedgerTransaction(id: 'tx2', code: 'ACC-303', account: 'Payroll Expense', type: 'Debit', amount: 45000.0, date: DateTime.now().subtract(const Duration(days: 2)), description: 'Pre-paid Wages', companyCode: 'DINE'),
      LedgerTransaction(id: 'tx3', code: 'ACC-202', account: 'Sales Revenue', type: 'Credit', amount: 85000.0, date: DateTime.now().subtract(const Duration(days: 1)), description: 'Pre-sale Spares Order', companyCode: 'DINE'),
    ]);

    _recipes.add(BOMRecipe(
      id: 'REC-VALVE',
      name: 'Standard Pressure Valve Assembly',
      finishedSku: 'VALVE-01',
      components: [
        BOMComponent(rawMaterialSku: 'STEEL-03', qtyRequired: 1, unit: 'Rolls'),
        BOMComponent(rawMaterialSku: 'BRASS-07', qtyRequired: 10, unit: 'Units'),
        BOMComponent(rawMaterialSku: 'COPPER-09', qtyRequired: 2, unit: 'Sheets'),
      ],
      companyCode: 'DINE',
    ));

    _jobs.add(ProductionJob(
      id: 'job1',
      recipeId: 'REC-VALVE',
      recipeName: 'Standard Pressure Valve Assembly',
      qtyToProduce: 5,
      status: 'Completed',
      date: DateTime.now().subtract(const Duration(days: 2)),
      companyCode: 'DINE',
    ));

    final start = DateTime.now();
    final batchQuantities = [3, 3, 4];
    final List<ProductionBatchRun> seededBatches = [];
    for (int i = 0; i < batchQuantities.length; i++) {
      final qty = batchQuantities[i];
      final scheduledDate = start.add(Duration(days: i * 10));
      
      final List<BatchComponentProcurement> components = [
        BatchComponentProcurement(rawMaterialSku: 'STEEL-03', qtyRequired: 1 * qty, qtyProcured: 0, estimatedCost: 8500.0 * (1 * qty), procurementStatus: 'Required'),
        BatchComponentProcurement(rawMaterialSku: 'BRASS-07', qtyRequired: 10 * qty, qtyProcured: 0, estimatedCost: 150.0 * (10 * qty), procurementStatus: 'Required'),
        BatchComponentProcurement(rawMaterialSku: 'COPPER-09', qtyRequired: 2 * qty, qtyProcured: 0, estimatedCost: 420.0 * (2 * qty), procurementStatus: 'Required'),
      ];
      
      seededBatches.add(ProductionBatchRun(
        id: 'batch_seed_${i}_${DateTime.now().millisecondsSinceEpoch}',
        batchNumber: 'B-0${i + 1}',
        batchQuantity: qty,
        scheduledStartDate: scheduledDate,
        status: 'Draft',
        componentsProcured: components,
      ));
    }

    _masterProductionOrders.add(MasterProductionOrder(
      id: 'mpo_seed',
      salesOrderCode: 'SO-101',
      recipeId: 'REC-VALVE',
      recipeName: 'Standard Pressure Valve Assembly',
      totalQuantity: 10,
      orderDate: DateTime.now(),
      targetDeliveryDate: DateTime.now().add(const Duration(days: 30)),
      status: 'Active',
      batches: seededBatches,
      companyCode: 'DINE',
    ));

    _timesheets.addAll([
      TimesheetEntry(id: 'ts1', username: 'sales_user', clockIn: DateTime.now().subtract(const Duration(hours: 32)), clockOut: DateTime.now().subtract(const Duration(hours: 24)), companyCode: 'DINE'),
      TimesheetEntry(id: 'ts2', username: 'inventory_user', clockIn: DateTime.now().subtract(const Duration(hours: 2)), clockOut: null, companyCode: 'DINE'),
    ]);

    _payslips.addAll([
      Payslip(id: 'pay1', username: 'sales_user', period: 'May 2026', totalHours: 160.0, hourlyRate: 250.0, bonus: 5000.0, deductions: 2000.0, status: 'Pending', date: DateTime.now(), companyCode: 'DINE'),
      Payslip(id: 'pay2', username: 'inventory_user', period: 'May 2026', totalHours: 150.0, hourlyRate: 220.0, bonus: 2000.0, deductions: 1500.0, status: 'Approved', date: DateTime.now(), companyCode: 'DINE'),
    ]);

    // 3. Seed Second Tenant: Future Corp
    final futureModules = Company.getDefaultModulesForTier(SubscriptionTier.standard);
    final futureCorp = Company(
      name: 'Future Corp Solutions',
      code: 'FUTURE',
      email: 'hello@future.io',
      mobile: '+919999911111',
      subscriptionTier: SubscriptionTier.standard,
      activeModuleIds: futureModules,
    );
    _companies.add(futureCorp);
    _expenseSettings['FUTURE'] = ExpenseVisibilitySetting.showOnlyOwnExpenses;

    _users.add(ERPUser(
      username: 'future_admin',
      password: 'futurepassword',
      email: 'admin@future.io',
      mobile: '+919999922222',
      companyCode: 'FUTURE',
      role: 'admin',
      permittedModuleIds: futureModules,
      isVerified: true,
    ));

    // Seed Default General Chat Group for FUTURE
    _chatGroups.add(ChatGroup(
      id: 'future_general',
      name: 'General Channel',
      members: ['future_admin'],
      companyCode: 'FUTURE',
      createdBy: 'future_admin',
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      enableP2PTransfers: true,
      isDefaultGroup: true,
    ));
  }

  // --- AUTHENTICATION METHODS ---

  String? signup({
    required String username,
    required String password,
    required String email,
    required String mobile,
    required String companyCode,
  }) {
    // Validations
    if (username.isEmpty || password.isEmpty || email.isEmpty || mobile.isEmpty || companyCode.isEmpty) {
      return 'All fields are compulsory.';
    }

    // Check if company exists
    final companyIndex = _companies.indexWhere((c) => c.code.toUpperCase() == companyCode.toUpperCase());
    if (companyIndex == -1) {
      return 'Company code does not exist. Contact your Super Admin.';
    }

    // Check if user already exists
    final exists = _users.any((u) => u.username.toLowerCase() == username.toLowerCase() && u.companyCode.toUpperCase() == companyCode.toUpperCase());
    if (exists) {
      return 'Username already registered under this company.';
    }

    final targetCompany = _companies[companyIndex];

    // Create pending user registration
    final newUser = ERPUser(
      username: username,
      password: password,
      email: email,
      mobile: mobile,
      companyCode: targetCompany.code,
      role: 'Employee', // Standard default role
      permittedModuleIds: List.from(targetCompany.activeModuleIds)..remove('admin'), // Remove admin permissions
      isVerified: false,
    );

    // Generate a 6-digit OTP code
    final otp = (100000 + (900000 * (DateTime.now().millisecondsSinceEpoch % 1000) / 1000)).toInt().toString();
    _pendingOtps[username] = otp;
    _pendingRegistrations[username] = newUser;

    // In a production system this calls SMS/Email gateways. We simulate it.
    debugPrint('SIMULATED OTP SENT TO MAIL/MOBILE FOR $username: $otp');
    return null; // Success, triggers OTP verification screen
  }

  // Fetch pending OTP for display/validation simulation
  String? getPendingOtpForUser(String username) {
    return _pendingOtps[username];
  }

  bool verifyOtp(String username, String otpCode) {
    if (_pendingOtps[username] == otpCode) {
      final newUser = _pendingRegistrations[username];
      if (newUser != null) {
        final verifiedUser = newUser.copyWith(isVerified: true);
        _users.add(verifiedUser);
        _pendingOtps.remove(username);
        _pendingRegistrations.remove(username);

        // Auto login
        _currentUser = verifiedUser;
        _currentCompany = _companies.firstWhere((c) => c.code == verifiedUser.companyCode);
        notifyListeners();
        return true;
      }
    }
    return false;
  }

  String? login({
    required String username,
    required String password,
    required String companyCode,
  }) {
    if (username.isEmpty || password.isEmpty || companyCode.isEmpty) {
      return 'All fields are compulsory.';
    }

    // Super Admin check overrides company codes
    if (username == 'superadmin' && password == 'supersecure123') {
      _currentUser = _users.firstWhere((u) => u.username == 'superadmin');
      _currentCompany = null;
      notifyListeners();
      return null;
    }

    final matched = _users.where((u) => 
      u.username.toLowerCase() == username.toLowerCase() && 
      u.password == password && 
      u.companyCode.toUpperCase() == companyCode.toUpperCase()
    ).toList();

    if (matched.isEmpty) {
      return 'Invalid credentials or company code.';
    }

    final user = matched.first;
    if (!user.isVerified) {
      return 'User is registered but not verified. Please re-register or contact admin.';
    }

    _currentUser = user;
    _currentCompany = _companies.firstWhere((c) => c.code == user.companyCode);
    notifyListeners();
    return null; // Login Success
  }

  void logout() {
    _currentUser = null;
    _currentCompany = null;
    notifyListeners();
  }

  // --- SUPER ADMIN CAPABILITIES ---

  String? createCompany({
    required String name,
    required String code,
    required String email,
    required String mobile,
    required SubscriptionTier tier,
    required List<String> modules,
  }) {
    if (name.isEmpty || code.isEmpty || email.isEmpty || mobile.isEmpty) {
      return 'All fields are required.';
    }

    final codeUpper = code.toUpperCase();
    if (_companies.any((c) => c.code == codeUpper)) {
      return 'A company with code "$codeUpper" already exists.';
    }

    final newCompany = Company(
      name: name,
      code: codeUpper,
      email: email,
      mobile: mobile,
      subscriptionTier: tier,
      activeModuleIds: modules,
    );

    _companies.add(newCompany);
    _expenseSettings[codeUpper] = ExpenseVisibilitySetting.showAllExpenses;
    notifyListeners();
    return null;
  }

  String? createCompanyAdmin({
    required String companyCode,
    required String username,
    required String password,
    required String email,
    required String mobile,
  }) {
    final codeUpper = companyCode.toUpperCase();
    final company = _companies.firstWhere((c) => c.code == codeUpper);
    
    // Check user conflicts
    if (_users.any((u) => u.username.toLowerCase() == username.toLowerCase() && u.companyCode == codeUpper)) {
      return 'Username already exists in this company.';
    }

    final adminUser = ERPUser(
      username: username,
      password: password,
      email: email,
      mobile: mobile,
      companyCode: codeUpper,
      role: 'admin',
      permittedModuleIds: company.activeModuleIds,
      isVerified: true, // Super admin pre-verifies the admin
    );

    _users.add(adminUser);
    notifyListeners();
    return null;
  }

  void updateCompanySubscription(String companyCode, SubscriptionTier tier, List<String> modules) {
    final idx = _companies.indexWhere((c) => c.code == companyCode);
    if (idx != -1) {
      final updatedCompany = _companies[idx].copyWith(
        subscriptionTier: tier,
        activeModuleIds: modules,
      );
      _companies[idx] = updatedCompany;

      // Automatically sync active sessions if we updated the company currently logged in
      if (_currentCompany?.code == companyCode) {
        _currentCompany = updatedCompany;
      }

      // Update admin permissions to match new subscription limits
      for (int i = 0; i < _users.length; i++) {
        if (_users[i].companyCode == companyCode) {
          if (_users[i].isCompanyAdmin) {
            _users[i] = _users[i].copyWith(permittedModuleIds: modules);
          } else {
            // Trim standard employee permissions to fit within the new restricted module set
            final employeePerms = _users[i].permittedModuleIds.where((p) => modules.contains(p)).toList();
            _users[i] = _users[i].copyWith(permittedModuleIds: employeePerms);
          }
        }
      }

      notifyListeners();
    }
  }

  // --- COMPANY ADMIN CAPABILITIES ---

  void createCustomRole(String roleName, List<String> modules) {
    if (_currentUser == null || !_currentUser!.isCompanyAdmin) return;
    
    final code = _currentUser!.companyCode;
    // Check if role already exists
    _roles.removeWhere((r) => r.name.toLowerCase() == roleName.toLowerCase() && r.companyCode == code);
    
    _roles.add(UserRole(
      name: roleName,
      companyCode: code,
      permittedModuleIds: modules,
    ));
    notifyListeners();
  }

  String? createCompanyEmployee({
    required String username,
    required String password,
    required String email,
    required String mobile,
    required String roleName,
  }) {
    if (_currentUser == null || !_currentUser!.isCompanyAdmin) return 'Unauthorized action.';
    final code = _currentUser!.companyCode;

    if (_users.any((u) => u.username.toLowerCase() == username.toLowerCase() && u.companyCode == code)) {
      return 'Username already exists.';
    }

    // Resolve permissions from role
    List<String> userPerms = [];
    if (roleName == 'admin') {
      userPerms = _currentCompany!.activeModuleIds;
    } else {
      final roleIdx = _roles.indexWhere((r) => r.name == roleName && r.companyCode == code);
      if (roleIdx != -1) {
        userPerms = _roles[roleIdx].permittedModuleIds;
      } else {
        userPerms = ['communication']; // Minimum fallback
      }
    }

    _users.add(ERPUser(
      username: username,
      password: password,
      email: email,
      mobile: mobile,
      companyCode: code,
      role: roleName,
      permittedModuleIds: userPerms,
      isVerified: true, // Pre-verified by Company Admin
    ));
    
    notifyListeners();
    return null;
  }

  // --- MESSAGING & CHAT ACTIONS ---

  void sendChatMessage(String content, ChatType type, {String? linkedExpenseId, String? groupId}) {
    if (_currentUser == null) return;

    final newMsg = ChatMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      sender: _currentUser!.username,
      content: content,
      timestamp: DateTime.now(),
      companyCode: _currentUser!.companyCode,
      chatType: type,
      linkedExpenseId: linkedExpenseId,
      groupId: groupId,
    );

    _messages.add(newMsg);
    notifyListeners();
  }

  // --- EXPENSE ACTIONS ---

  String? logExpense({
    required String description,
    required double amount,
    required String category,
    bool isGroupExpense = false,
    List<String> sharedWith = const [],
    String? groupId,
  }) {
    if (_currentUser == null) return 'No logged in user session.';
    if (description.isEmpty || amount <= 0) return 'Please provide a description and valid amount.';

    final expId = 'exp_${DateTime.now().millisecondsSinceEpoch}';
    final newExpense = Expense(
      id: expId,
      description: description,
      amount: amount,
      category: category,
      companyCode: _currentUser!.companyCode,
      loggedBy: _currentUser!.username,
      date: DateTime.now(),
      isGroupExpense: isGroupExpense,
      sharedWith: sharedWith,
      groupId: groupId,
    );

    _expenses.add(newExpense);

    // Auto-post double-entry debit ledger transaction representing expense payout
    final txId = 'tx_${DateTime.now().millisecondsSinceEpoch}';
    final newTx = LedgerTransaction(
      id: txId,
      code: 'ACC-101',
      account: 'Cash & Bank',
      type: 'Debit',
      amount: amount,
      date: DateTime.now(),
      description: 'Expense Outflow: $description ($category)',
      companyCode: _currentUser!.companyCode,
    );
    _ledgerTransactions.add(newTx);

    // Auto-post notification into the Expense Chat
    String chatMsg = 'Logged expense: "$description" of Rs. ${amount.toStringAsFixed(2)} under $category.';
    if (isGroupExpense && sharedWith.isNotEmpty) {
      chatMsg += ' Split shared with: ${sharedWith.join(", ")}';
    }
    sendChatMessage(chatMsg, ChatType.expense, linkedExpenseId: expId, groupId: groupId);

    notifyListeners();
    return null;
  }

  // --- CRM LEAD CONVERSION TO INVOICE, STOCK DEDUCTION, & REVENUE CREDITS ---
  String? convertLeadToSale({
    required String leadId,
    required String inventorySku,
    required int quantity,
  }) {
    if (_currentUser == null) return 'Unauthorized action.';
    final code = _currentUser!.companyCode;

    // 1. Locate CRM Lead
    final leadIdx = _leads.indexWhere((l) => l.id == leadId && l.companyCode == code);
    if (leadIdx == -1) return 'CRM Lead not found.';
    final lead = _leads[leadIdx];

    // 2. Locate Inventory SKU
    final itemIdx = _inventory.indexWhere((i) => i.sku == inventorySku && i.companyCode == code);
    if (itemIdx == -1) return 'Selected warehouse stock item SKU not found.';
    final item = _inventory[itemIdx];

    // 3. Stock Sufficiency Check
    if (item.quantity < quantity) {
      return 'Insufficient warehouse stock level (Available: ${item.quantity}).';
    }

    // 4. Perform stock deduction
    final updatedQty = item.quantity - quantity;
    final updatedStatus = updatedQty < (item.capacity * 0.1) ? 'LOW' : 'OK';
    _inventory[itemIdx] = item.copyWith(
      quantity: updatedQty,
      status: updatedStatus,
    );

    // 5. Update CRM status to 'Won'
    final saleAmount = quantity * item.unitPrice;
    _leads[leadIdx] = lead.copyWith(
      status: 'Won',
      dealValue: saleAmount,
    );

    // 6. Record Credit Ledger Transaction in Accounting (ACC-202 Revenue Credits)
    final txId = 'tx_${DateTime.now().millisecondsSinceEpoch}';
    final newTx = LedgerTransaction(
      id: txId,
      code: 'ACC-202',
      account: 'Sales Revenue',
      type: 'Credit',
      amount: saleAmount,
      date: DateTime.now(),
      description: 'Invoice generated from Won Lead: ${lead.name} (Sold $quantity units of ${item.name})',
      companyCode: code,
    );
    _ledgerTransactions.add(newTx);

    // 7. General Chat Notification
    sendChatMessage(
      'Invoice generated! Lead "${lead.name}" converted to Won. Sold $quantity units of "${item.name}" (SKU: $inventorySku) for a total value of Rs. ${saleAmount.toStringAsFixed(2)}. Stock count deducted and Revenue credit posted to Finance Ledger.',
      ChatType.general,
    );

    notifyListeners();
    return null;
  }

  // --- MANUFACTURING BOM BILL OF MATERIALS CONSUMPTION & PRODUCTION RUNS ---
  String? scheduleProductionJob({
    required String recipeId,
    required int qtyToProduce,
  }) {
    if (_currentUser == null) return 'Unauthorized action.';
    final code = _currentUser!.companyCode;

    // 1. Locate Recipe
    final recIdx = _recipes.indexWhere((r) => r.id == recipeId && r.companyCode == code);
    if (recIdx == -1) return 'Manufacturing BOM Recipe not found.';
    final recipe = _recipes[recIdx];

    // 2. Perform Stock Level Sufficiency Inspections
    for (final comp in recipe.components) {
      final compIdx = _inventory.indexWhere((i) => i.sku == comp.rawMaterialSku && i.companyCode == code);
      if (compIdx == -1) {
        return 'Raw component stock item for SKU "${comp.rawMaterialSku}" not found in Warehouse.';
      }
      final requiredQty = comp.qtyRequired * qtyToProduce;
      if (_inventory[compIdx].quantity < requiredQty) {
        return 'Insufficient raw components! "${_inventory[compIdx].name}" (SKU: ${comp.rawMaterialSku}) stock is low. Required: $requiredQty, Available: ${_inventory[compIdx].quantity}.';
      }
    }

    // 3. Deduct BOM Raw Component Stocks
    for (final comp in recipe.components) {
      final compIdx = _inventory.indexWhere((i) => i.sku == comp.rawMaterialSku && i.companyCode == code);
      final item = _inventory[compIdx];
      final newQty = item.quantity - (comp.qtyRequired * qtyToProduce);
      _inventory[compIdx] = item.copyWith(
        quantity: newQty,
        status: newQty < (item.capacity * 0.1) ? 'LOW' : 'OK',
      );
    }

    // 4. Increment Manufactured Finished Product Stock
    final finishedIdx = _inventory.indexWhere((i) => i.sku == recipe.finishedSku && i.companyCode == code);
    if (finishedIdx != -1) {
      final finishedItem = _inventory[finishedIdx];
      final newQty = finishedItem.quantity + qtyToProduce;
      _inventory[finishedIdx] = finishedItem.copyWith(
        quantity: newQty,
        status: newQty < (finishedItem.capacity * 0.1) ? 'LOW' : 'OK',
      );
    } else {
      // Create new Finished stock registry
      _inventory.add(InventoryItem(
        sku: recipe.finishedSku,
        name: '${recipe.name.replaceAll(' Recipe', '').replaceAll(' Assembly', '')} Product',
        quantity: qtyToProduce,
        capacity: 200,
        location: 'Zone A - Product Bay',
        status: 'OK',
        unitPrice: 5000.0, // Default finished price estimate
        companyCode: code,
      ));
    }

    // 5. Append Completed Production Job
    final jobId = 'job_${DateTime.now().millisecondsSinceEpoch}';
    final job = ProductionJob(
      id: jobId,
      recipeId: recipe.id,
      recipeName: recipe.name,
      qtyToProduce: qtyToProduce,
      status: 'Completed',
      date: DateTime.now(),
      companyCode: code,
    );
    _jobs.add(job);

    // 6. General Chat Update Notification
    sendChatMessage(
      'Manufacturing run completed successfully! Produced $qtyToProduce units of finished "${recipe.name}". Raw material components consumed from warehouse inventories.',
      ChatType.general,
    );

    notifyListeners();
    return null;
  }

  // --- HRM PAYROLL TIMESHEETS PAYSLIPS & DEBITS ---
  String? approvePayslip(String payslipId) {
    if (_currentUser == null) return 'Unauthorized action.';
    final code = _currentUser!.companyCode;

    // 1. Locate Payslip
    final payIdx = _payslips.indexWhere((p) => p.id == payslipId && p.companyCode == code);
    if (payIdx == -1) return 'Employee payslip not found.';
    final payslip = _payslips[payIdx];

    if (payslip.status == 'Paid') return 'This payslip has already been paid.';

    // 2. Mark as Paid
    _payslips[payIdx] = payslip.copyWith(status: 'Paid');

    // 3. Post debit transaction into Finance general ledger (ACC-303 Payroll Wages Debits)
    final txId = 'tx_${DateTime.now().millisecondsSinceEpoch}';
    final newTx = LedgerTransaction(
      id: txId,
      code: 'ACC-303',
      account: 'Payroll Expense',
      type: 'Debit',
      amount: payslip.grossPayout,
      date: DateTime.now(),
      description: 'Employee Salary Payout: Approved & Paid salary to ${payslip.username} for ${payslip.period}',
      companyCode: code,
    );
    _ledgerTransactions.add(newTx);

    // 4. Chat Feed Notification
    sendChatMessage(
      'Salary payout approved! Paid total salary amount of Rs. ${payslip.grossPayout.toStringAsFixed(2)} to employee ${payslip.username} for billing period ${payslip.period}. General ledger debit posted.',
      ChatType.general,
    );

    notifyListeners();
    return null;
  }

  // --- WHITE-LABEL CUSTOM THEME UPDATER ---
  void updateCompanyColors(String primaryHex, String secondaryHex) {
    if (_currentUser == null) return;
    final code = _currentUser!.companyCode;

    final idx = _companies.indexWhere((c) => c.code == code);
    if (idx != -1) {
      final updated = _companies[idx].copyWith(
        primaryColorHex: primaryHex,
        secondaryColorHex: secondaryHex,
      );
      _companies[idx] = updated;

      // Also sync current company session
      if (_currentCompany?.code == code) {
        _currentCompany = updated;
      }
      notifyListeners();
    }
  }

  // --- INTERACTIVE SANDBOX WORKFLOW ADDERS ---
  void addNewLead(String name, String company, double dealValue, String source, String status) {
    if (_currentUser == null) return;
    _leads.add(Lead(
      id: 'lead_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      company: company,
      dealValue: dealValue,
      source: source,
      status: status,
      companyCode: _currentUser!.companyCode,
    ));
    notifyListeners();
  }

  void updateLeadStatus(String leadId, String newStatus) {
    final idx = _leads.indexWhere((l) => l.id == leadId);
    if (idx != -1) {
      _leads[idx] = _leads[idx].copyWith(status: newStatus);
      notifyListeners();
    }
  }

  void addNewInventoryItem(String sku, String name, int quantity, int capacity, String location, double unitPrice) {
    if (_currentUser == null) return;
    _inventory.add(InventoryItem(
      sku: sku,
      name: name,
      quantity: quantity,
      capacity: capacity,
      location: location,
      status: quantity < (capacity * 0.1) ? 'LOW' : 'OK',
      unitPrice: unitPrice,
      companyCode: _currentUser!.companyCode,
    ));
    notifyListeners();
  }

  void addManualLedgerTransaction(String code, String account, String type, double amount, String description) {
    if (_currentUser == null) return;
    _ledgerTransactions.add(LedgerTransaction(
      id: 'tx_${DateTime.now().millisecondsSinceEpoch}',
      code: code,
      account: account,
      type: type,
      amount: amount,
      date: DateTime.now(),
      description: description,
      companyCode: _currentUser!.companyCode,
    ));
    notifyListeners();
  }

  void addNewBOMRecipe(String name, String finishedSku, List<BOMComponent> components) {
    if (_currentUser == null) return;
    _recipes.add(BOMRecipe(
      id: 'REC_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      finishedSku: finishedSku,
      components: components,
      companyCode: _currentUser!.companyCode,
    ));
    notifyListeners();
  }

  void clockInUser() {
    if (_currentUser == null) return;
    final entry = TimesheetEntry(
      id: 'ts_${DateTime.now().millisecondsSinceEpoch}',
      username: _currentUser!.username,
      clockIn: DateTime.now(),
      companyCode: _currentUser!.companyCode,
    );
    _timesheets.add(entry);
    notifyListeners();
  }

  void clockOutUser() {
    if (_currentUser == null) return;
    final idx = _timesheets.indexWhere((t) => t.username == _currentUser!.username && t.clockOut == null);
    if (idx != -1) {
      _timesheets[idx] = _timesheets[idx].copyWith(clockOut: DateTime.now());
      notifyListeners();
    }
  }

  void addNewPayslip({
    required String username,
    required String period,
    required double totalHours,
    required double hourlyRate,
    required double bonus,
    required double deductions,
  }) {
    if (_currentUser == null) return;
    final payslip = Payslip(
      id: 'pay_${DateTime.now().millisecondsSinceEpoch}',
      username: username,
      period: period,
      totalHours: totalHours,
      hourlyRate: hourlyRate,
      bonus: bonus,
      deductions: deductions,
      status: 'Pending',
      date: DateTime.now(),
      companyCode: _currentUser!.companyCode,
    );
    _payslips.add(payslip);
    notifyListeners();
  }

  // Dashboard layout customization
  List<String> getDashboardLayoutForUser(String username, List<String> availableModules) {
    final layout = _userDashboardLayouts[username];
    if (layout == null) {
      return availableModules;
    }
    final filtered = layout.where((id) => availableModules.contains(id)).toList();
    for (final m in availableModules) {
      if (!filtered.contains(m)) {
        filtered.add(m);
      }
    }
    return filtered;
  }

  Set<String> getHiddenModulesForUser(String username) {
    return _userHiddenModules[username] ?? {};
  }

  void updateDashboardLayoutForUser(String username, List<String> layout, Set<String> hidden) {
    _userDashboardLayouts[username] = layout;
    _userHiddenModules[username] = hidden;
    notifyListeners();
  }

  // Phased Batch MRP State Controllers
  void createMasterProductionOrder({
    required String salesOrderCode,
    required String recipeId,
    required int totalQuantity,
    required List<int> batchQuantities,
    required int monthsPlanned,
  }) {
    if (_currentUser == null) return;
    
    final recipe = _recipes.firstWhere((r) => r.id == recipeId);
    
    final List<ProductionBatchRun> batches = [];
    final start = DateTime.now();
    for (int i = 0; i < batchQuantities.length; i++) {
      final qty = batchQuantities[i];
      final daysOffset = (i * (30 * monthsPlanned) / batchQuantities.length).round();
      final scheduledDate = start.add(Duration(days: daysOffset));
      
      final List<BatchComponentProcurement> components = [];
      for (final comp in recipe.components) {
        final rawItem = _inventory.firstWhere((item) => item.sku == comp.rawMaterialSku);
        components.add(BatchComponentProcurement(
          rawMaterialSku: comp.rawMaterialSku,
          qtyRequired: comp.qtyRequired * qty,
          qtyProcured: 0,
          estimatedCost: rawItem.unitPrice * (comp.qtyRequired * qty),
          procurementStatus: 'Required',
        ));
      }
      
      batches.add(ProductionBatchRun(
        id: 'batch_${recipeId}_${i}_${DateTime.now().millisecondsSinceEpoch}',
        batchNumber: 'B-0${i + 1}',
        batchQuantity: qty,
        scheduledStartDate: scheduledDate,
        status: 'Draft',
        componentsProcured: components,
      ));
    }
    
    final order = MasterProductionOrder(
      id: 'mpo_${DateTime.now().millisecondsSinceEpoch}',
      salesOrderCode: salesOrderCode,
      recipeId: recipeId,
      recipeName: recipe.name,
      totalQuantity: totalQuantity,
      orderDate: DateTime.now(),
      targetDeliveryDate: DateTime.now().add(Duration(days: 30 * monthsPlanned)),
      status: 'Active',
      batches: batches,
      companyCode: _currentUser!.companyCode,
    );
    
    _masterProductionOrders.add(order);
    notifyListeners();
  }

  String? runMRPForBatch(String orderId, int batchIndex) {
    if (_currentUser == null) return 'No active session';
    final orderIdx = _masterProductionOrders.indexWhere((o) => o.id == orderId);
    if (orderIdx == -1) return 'Order not found';
    
    final order = _masterProductionOrders[orderIdx];
    final batch = order.batches[batchIndex];
    
    batch.status = 'MRP Planned';
    notifyListeners();
    return null;
  }

  String? generateRequisitionAndProcureBatch(String orderId, int batchIndex) {
    if (_currentUser == null) return 'No active session';
    final orderIdx = _masterProductionOrders.indexWhere((o) => o.id == orderId);
    if (orderIdx == -1) return 'Order not found';
    
    final order = _masterProductionOrders[orderIdx];
    final batch = order.batches[batchIndex];
    
    double totalBatchCost = 0.0;
    
    for (final comp in batch.componentsProcured) {
      final warehouseIdx = _inventory.indexWhere((item) => item.sku == comp.rawMaterialSku && item.companyCode == _currentUser!.companyCode);
      if (warehouseIdx == -1) continue;
      
      final needed = comp.qtyRequired;
      _inventory[warehouseIdx] = _inventory[warehouseIdx].copyWith(
        quantity: _inventory[warehouseIdx].quantity + needed,
      );
      
      comp.qtyProcured = needed;
      comp.procurementStatus = 'In Stock';
      totalBatchCost += comp.estimatedCost;
    }
    
    final ledgerTx = LedgerTransaction(
      id: 'tx_mrp_${DateTime.now().millisecondsSinceEpoch}',
      code: 'ACC-101',
      account: 'Cash & Bank',
      type: 'Debit',
      amount: totalBatchCost,
      date: DateTime.now(),
      description: 'MRP Procurement outflow for Batch ${batch.batchNumber} (${order.salesOrderCode})',
      companyCode: _currentUser!.companyCode,
    );
    _ledgerTransactions.add(ledgerTx);
    
    final expense = Expense(
      id: 'exp_mrp_${DateTime.now().millisecondsSinceEpoch}',
      description: 'MRP restock: Batch ${batch.batchNumber} of order ${order.salesOrderCode}',
      amount: totalBatchCost,
      category: 'Raw Material',
      companyCode: _currentUser!.companyCode,
      loggedBy: _currentUser!.username,
      date: DateTime.now(),
      isGroupExpense: false,
    );
    _expenses.add(expense);
    
    batch.status = 'PO Placed';
    notifyListeners();
    return null;
  }

  String? executeBatchProductionRun(String orderId, int batchIndex) {
    if (_currentUser == null) return 'No active session';
    final orderIdx = _masterProductionOrders.indexWhere((o) => o.id == orderId);
    if (orderIdx == -1) return 'Order not found';
    
    final order = _masterProductionOrders[orderIdx];
    final batch = order.batches[batchIndex];
    
    for (final comp in batch.componentsProcured) {
      final warehouseIdx = _inventory.indexWhere((item) => item.sku == comp.rawMaterialSku && item.companyCode == _currentUser!.companyCode);
      if (warehouseIdx == -1 || _inventory[warehouseIdx].quantity < comp.qtyRequired) {
        return 'Insufficient components in stock for batch ${batch.batchNumber}. Please run MRP and place a Batch PR first.';
      }
    }
    
    for (final comp in batch.componentsProcured) {
      final warehouseIdx = _inventory.indexWhere((item) => item.sku == comp.rawMaterialSku && item.companyCode == _currentUser!.companyCode);
      _inventory[warehouseIdx] = _inventory[warehouseIdx].copyWith(
        quantity: _inventory[warehouseIdx].quantity - comp.qtyRequired,
      );
    }
    
    final recipe = _recipes.firstWhere((r) => r.id == order.recipeId);
    final finishedSkuIdx = _inventory.indexWhere((item) => item.sku == recipe.finishedSku && item.companyCode == _currentUser!.companyCode);
    if (finishedSkuIdx != -1) {
      _inventory[finishedSkuIdx] = _inventory[finishedSkuIdx].copyWith(
        quantity: _inventory[finishedSkuIdx].quantity + batch.batchQuantity,
      );
    }
    
    batch.status = 'Completed';
    
    if (order.batches.every((b) => b.status == 'Completed')) {
      order.status = 'Completed';
    }
    
    _jobs.add(ProductionJob(
      id: 'job_mrp_${DateTime.now().millisecondsSinceEpoch}',
      recipeId: order.recipeId,
      recipeName: order.recipeName,
      qtyToProduce: batch.batchQuantity,
      status: 'Completed',
      date: DateTime.now(),
      companyCode: _currentUser!.companyCode,
    ));
    
    notifyListeners();
    return null;
  }
}
