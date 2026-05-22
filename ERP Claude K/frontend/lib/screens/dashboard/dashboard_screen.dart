import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

import 'package:enterprise_erp/screens/dashboard/crm_screen.dart';
import 'package:enterprise_erp/screens/dashboard/sales_screen.dart';
import 'package:enterprise_erp/screens/dashboard/inventory_screen.dart';
import 'package:enterprise_erp/screens/dashboard/hrm_screen.dart';
import 'package:enterprise_erp/screens/dashboard/expense_screen.dart';
import 'package:enterprise_erp/screens/dashboard/settings_screen.dart';
import 'package:enterprise_erp/screens/chat/chat_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _selectedModule = AppStrings.dashboard;

  void _logout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil(AppRoutes.splash, (route) => false);
  }

  Widget _buildModuleContent(String module, Map user, Map company, Size size) {
    switch (module) {
      case AppStrings.dashboard:
        return _buildDashboardHome(user, company, size);
      case AppStrings.crm:
        return const CRMScreen();
      case AppStrings.sales:
        return const SalesScreen();
      case AppStrings.inventory:
        return const InventoryScreen();
      case AppStrings.hrm:
        return const HRMScreen();
      case AppStrings.chat:
        return const ChatScreen();
      case AppStrings.expenses:
        return ExpenseScreen(
          onNavigateToModule: (navModule) {
            setState(() {
              _selectedModule = navModule;
            });
          },
        );
      case AppStrings.settings:
        return const SettingsScreen();
      default:
        return _buildPlaceholderModule(module);
    }
  }

  Widget _buildDashboardHome(Map user, Map company, Size size) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Good day, ${user['username'] ?? 'Admin'}',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Here is what is happening across your modules today.',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          
          // KPI Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final kpiWidth = (constraints.maxWidth - 48) / (constraints.maxWidth > 1000 ? 4 : 2);
              return Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  _buildKPICard(
                    'Total Revenue',
                    '\$145,280.00',
                    Icons.attach_money,
                    const Color(AppColors.success),
                    kpiWidth,
                  ),
                  _buildKPICard(
                    'Active CRM Leads',
                    '412 Leads',
                    Icons.group_add,
                    const Color(AppColors.primaryBlue),
                    kpiWidth,
                  ),
                  _buildKPICard(
                    'Inventory Shortage',
                    '12 Items Low',
                    Icons.warning_amber_rounded,
                    const Color(AppColors.warning),
                    kpiWidth,
                  ),
                  _buildKPICard(
                    'Pending Approvals',
                    '8 Requests',
                    Icons.playlist_add_check,
                    const Color(AppColors.secondaryPurple),
                    kpiWidth,
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 32),
          
          // Grid Layout for main content (desktop 2 columns, mobile 1)
          if (size.width > 1100)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: _buildRecentActivityTable(),
                ),
                const SizedBox(width: 24),
                Expanded(
                  flex: 1,
                  child: _buildQuickActionsCard(),
                ),
              ],
            )
          else ...[
            _buildRecentActivityTable(),
            const SizedBox(height: 24),
            _buildQuickActionsCard(),
          ],
        ],
      ),
    );
  }

  Widget _buildPlaceholderModule(String module) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(AppColors.primaryBlue).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.construction,
                size: 64,
                color: Color(AppColors.primaryBlue),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              '$module Module',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            const Text(
              'This ERP sub-system is currently in provisioning state for this tenant.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 15),
            ),
            const SizedBox(height: 8),
            const Text(
              'Dynamic integrations and full database synchronizations are active.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 13, fontStyle: FontStyle.italic),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              icon: const Icon(Icons.arrow_back),
              label: const Text('Back to Dashboard Summary'),
              onPressed: () {
                setState(() {
                  _selectedModule = AppStrings.dashboard;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.userData ?? {};
    final company = auth.companyData ?? {};

    return Scaffold(
      body: Row(
        children: [
          // Sidebar side for Desktop
          if (isDesktop)
            Container(
              width: 260,
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF1E1E2E)
                    : const Color(0xFF0F172A),
              ),
              child: Column(
                children: [
                  // Brand Header
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    alignment: Alignment.centerLeft,
                    child: Row(
                      children: [
                        const Icon(Icons.lan, color: Color(AppColors.primaryBlue), size: 32),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            AppConfig.appName,
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Company info
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white10,
                        borderRadius: BorderRadius.circular(AppDimensions.radiusM),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.domain, color: Color(AppColors.primaryLight), size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  company['name'] ?? 'Loading Company...',
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  'Code: ${company['code'] ?? 'N/A'}',
                                  style: const TextStyle(
                                    color: Colors.white54,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Nav Items
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      children: [
                        _buildSidebarItem(AppStrings.dashboard, Icons.dashboard_outlined),
                        _buildSidebarItem(AppStrings.crm, Icons.contact_page_outlined),
                        _buildSidebarItem(AppStrings.sales, Icons.shopping_bag_outlined),
                        _buildSidebarItem(AppStrings.inventory, Icons.warehouse_outlined),
                        _buildSidebarItem(AppStrings.finance, Icons.account_balance_wallet_outlined),
                        _buildSidebarItem(AppStrings.hrm, Icons.people_outline),
                        _buildSidebarItem(AppStrings.chat, Icons.chat_bubble_outline),
                        _buildSidebarItem(AppStrings.expenses, Icons.receipt_long_outlined),
                        _buildSidebarItem(AppStrings.settings, Icons.settings_outlined),
                      ],
                    ),
                  ),
                  // User Profile & Sign Out
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Colors.white10)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(AppColors.primaryBlue),
                          foregroundColor: Colors.white,
                          radius: 18,
                          child: Text(
                            (user['username'] ?? 'U').toString().substring(0, 1).toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user['username'] ?? 'User Name',
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                user['email'] ?? 'user@erp.com',
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white54,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.logout, color: Colors.white70, size: 20),
                          onPressed: _logout,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          
          // Main Content Area
          Expanded(
            child: Container(
              color: Theme.of(context).scaffoldBackgroundColor,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Bar / Header
                  _buildHeader(context, isDesktop),
                  // Dynamic Content Body
                  Expanded(
                    child: _buildModuleContent(_selectedModule, user, company, size),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      drawer: !isDesktop
          ? Drawer(
              child: Container(
                color: const Color(0xFF0F172A),
                child: Column(
                  children: [
                    DrawerHeader(
                      child: Row(
                        children: [
                          const Icon(Icons.lan, color: Color(AppColors.primaryBlue), size: 32),
                          const SizedBox(width: 12),
                          Text(
                            AppConfig.appName,
                            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView(
                        children: [
                          _buildSidebarItem(AppStrings.dashboard, Icons.dashboard_outlined),
                          _buildSidebarItem(AppStrings.crm, Icons.contact_page_outlined),
                          _buildSidebarItem(AppStrings.sales, Icons.shopping_bag_outlined),
                          _buildSidebarItem(AppStrings.inventory, Icons.warehouse_outlined),
                          _buildSidebarItem(AppStrings.finance, Icons.account_balance_wallet_outlined),
                          _buildSidebarItem(AppStrings.hrm, Icons.people_outline),
                          _buildSidebarItem(AppStrings.chat, Icons.chat_bubble_outline),
                          _buildSidebarItem(AppStrings.expenses, Icons.receipt_long_outlined),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildSidebarItem(String title, IconData icon) {
    final isSelected = _selectedModule == title;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedModule = title;
          });
          if (Scaffold.maybeOf(context)?.isDrawerOpen == true) {
            Navigator.of(context).pop();
          }
        },
        borderRadius: BorderRadius.circular(AppDimensions.radiusM),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? const Color(AppColors.primaryBlue).withValues(alpha: 0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? const Color(AppColors.primaryBlue) : Colors.white70,
                size: 20,
              ),
              const SizedBox(width: 16),
              Text(
                title,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isDesktop) {
    return Container(
      height: 70,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        border: Border(bottom: BorderSide(color: Colors.grey.withValues(alpha: 0.15))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              if (!isDesktop)
                IconButton(
                  icon: const Icon(Icons.menu),
                  onPressed: () {
                    Scaffold.of(context).openDrawer();
                  },
                ),
              Text(
                _selectedModule,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none),
                onPressed: () {},
              ),
              const SizedBox(width: 12),
              IconButton(
                icon: const Icon(Icons.search),
                onPressed: () {},
              ),
              const SizedBox(width: 16),
              Container(
                width: 1,
                height: 24,
                color: Colors.grey.withValues(alpha: 0.3),
              ),
              const SizedBox(width: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Quick Action'),
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(120, 36),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKPICard(String label, String value, IconData icon, Color color, double width) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(AppDimensions.radiusL),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppDimensions.radiusM),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivityTable() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Transactions',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('ID')),
                  DataColumn(label: Text('Module')),
                  DataColumn(label: Text('Status')),
                  DataColumn(label: Text('Amount')),
                ],
                rows: const [
                  DataRow(cells: [
                    DataCell(Text('TX-9021')),
                    DataCell(Text('Sales Invoice')),
                    DataCell(Text('Approved')),
                    DataCell(Text('\$2,450.00')),
                  ]),
                  DataRow(cells: [
                    DataCell(Text('TX-9020')),
                    DataCell(Text('HR Expenses')),
                    DataCell(Text('Pending')),
                    DataCell(Text('\$410.00')),
                  ]),
                  DataRow(cells: [
                    DataCell(Text('TX-9019')),
                    DataCell(Text('Inventory Purchase')),
                    DataCell(Text('Approved')),
                    DataCell(Text('\$11,800.00')),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            _buildActionItem(Icons.add_shopping_cart, 'Create Sales Order', 'Sales Module'),
            _buildActionItem(Icons.inventory, 'Audit Stock Levels', 'Inventory'),
            _buildActionItem(Icons.person_add_alt_1_outlined, 'Onboard Employee', 'HRM'),
            _buildActionItem(Icons.attach_money, 'File Expense Claim', 'Finance'),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: const Color(AppColors.primaryBlue).withValues(alpha: 0.1),
            child: Icon(icon, color: const Color(AppColors.primaryBlue), size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text(subtitle, style: const TextStyle(color: Colors.grey, fontSize: 11)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
        ],
      ),
    );
  }
}
