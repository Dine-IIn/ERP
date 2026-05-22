import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class SuperAdminDashboard extends StatefulWidget {
  const SuperAdminDashboard({super.key});

  @override
  State<SuperAdminDashboard> createState() => _SuperAdminDashboardState();
}

class _SuperAdminDashboardState extends State<SuperAdminDashboard> {
  void _logout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil(AppRoutes.splash, (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.userData ?? {};

    return Scaffold(
      body: Row(
        children: [
          // Left Sidebar for Super Admin
          if (isDesktop)
            Container(
              width: 260,
              color: const Color(0xFF1E1B4B), // Premium Indigo-dark for Super Admin
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    alignment: Alignment.centerLeft,
                    child: Row(
                      children: [
                        const Icon(Icons.admin_panel_settings, color: Color(AppColors.secondaryPurple), size: 32),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'SuperAdmin',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      children: [
                        _buildSidebarItem('Global Overview', Icons.analytics_outlined, true),
                        _buildSidebarItem('Company Tenants', Icons.business_outlined, false),
                        _buildSidebarItem('Subscriptions', Icons.credit_card_outlined, false),
                        _buildSidebarItem('API Gateways', Icons.api_outlined, false),
                        _buildSidebarItem('System Health', Icons.monitor_heart_outlined, false),
                        _buildSidebarItem('Settings', Icons.settings_outlined, false),
                      ],
                    ),
                  ),
                  // Bottom Profile info
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Colors.white10)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(AppColors.secondaryPurple),
                          foregroundColor: Colors.white,
                          radius: 18,
                          child: Text(
                            (user['username'] ?? 'S').toString().substring(0, 1).toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user['username'] ?? 'Super Admin',
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              const Text(
                                'Global System Owner',
                                style: TextStyle(color: Colors.white54, fontSize: 11),
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
          
          // Main Body
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                _buildHeader(context, isDesktop),
                // Main scrollable area
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Global Administration Panel',
                                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Multi-tenant orchestration, load balancing, subscription plans, and tenant audits.',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('Provision Tenant'),
                              onPressed: () {},
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(AppColors.secondaryPurple),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        
                        // KPI widgets
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final kpiWidth = (constraints.maxWidth - 48) / (constraints.maxWidth > 1000 ? 4 : 2);
                            return Wrap(
                              spacing: 16,
                              runSpacing: 16,
                              children: [
                                _buildKPICard('Total Companies', '12 Tenants', Icons.business, const Color(AppColors.info), kpiWidth),
                                _buildKPICard('Active Subscriptions', '\$42,850/mo', Icons.monetization_on, const Color(AppColors.success), kpiWidth),
                                _buildKPICard('Avg CPU Usage', '24.5%', Icons.dns, const Color(AppColors.warning), kpiWidth),
                                _buildKPICard('Network Uptime', '99.99%', Icons.cloud_done, const Color(AppColors.primaryBlue), kpiWidth),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 32),
                        
                        // Main contents
                        if (size.width > 1100)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 2,
                                child: _buildTenantsListTable(),
                              ),
                              const SizedBox(width: 24),
                              Expanded(
                                flex: 1,
                                child: _buildSystemStatusCard(),
                              ),
                            ],
                          )
                        else ...[
                          _buildTenantsListTable(),
                          const SizedBox(height: 24),
                          _buildSystemStatusCard(),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebarItem(String title, IconData icon, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(AppDimensions.radiusM),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? const Color(AppColors.secondaryPurple).withValues(alpha: 0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? const Color(AppColors.secondaryPurple) : Colors.white70,
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
                  onPressed: () {},
                ),
              const Text(
                'System Administration',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () {},
              ),
              const SizedBox(width: 12),
              IconButton(
                icon: const Icon(Icons.settings),
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
                icon: const Icon(Icons.security, size: 16),
                label: const Text('Audit Logs'),
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  foregroundColor: const Color(AppColors.secondaryPurple),
                  elevation: 0,
                  side: const BorderSide(color: Color(AppColors.secondaryPurple)),
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

  Widget _buildTenantsListTable() {
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
                  'Provisioned Corporate Tenants',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('View All Tenants'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('Company Code')),
                  DataColumn(label: Text('Company Name')),
                  DataColumn(label: Text('Status')),
                  DataColumn(label: Text('Subscribed Modules')),
                ],
                rows: const [
                  DataRow(cells: [
                    DataCell(Text('ACME-100')),
                    DataCell(Text('Acme Corporation')),
                    DataCell(Text('Active')),
                    DataCell(Text('CRM, Sales, Inventory, HRM')),
                  ]),
                  DataRow(cells: [
                    DataCell(Text('GLOBEX-2')),
                    DataCell(Text('Globex Industries')),
                    DataCell(Text('Active')),
                    DataCell(Text('CRM, Finance, Expenses')),
                  ]),
                  DataRow(cells: [
                    DataCell(Text('STARK-4')),
                    DataCell(Text('Stark Enterprises')),
                    DataCell(Text('Active')),
                    DataCell(Text('All Modules')),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSystemStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Database Server Node Health',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            _buildStatusItem('PostgreSQL Primary Cluster', 'Online', Colors.green),
            _buildStatusItem('Redis Cache Instance', 'Online', Colors.green),
            _buildStatusItem('Socket.io Signaling Node', 'Online', Colors.green),
            _buildStatusItem('S3 Backup Storage Node', 'Idle / Synced', Colors.blue),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusItem(String componentName, String status, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        children: [
          CircleAvatar(
            radius: 8,
            backgroundColor: color.withValues(alpha: 0.2),
            child: CircleAvatar(
              radius: 4,
              backgroundColor: color,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              componentName,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          Text(
            status,
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
