import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../models/erp_module_definition.dart';
import '../../models/user.dart';
import '../../theme/app_colors.dart';
import 'auth/login_screen.dart';
import 'chat/chat_hub.dart';
import 'company_admin/role_manager.dart';
import 'company_admin/company_settings.dart';
import 'modules/crm_module.dart';
import 'modules/finance_module.dart';
import 'modules/inventory_module.dart';
import 'modules/manufacturing_module.dart';
import 'modules/hrm_module.dart';
import 'modules/generic_module.dart';

class ERPDashboard extends StatefulWidget {
  const ERPDashboard({super.key});

  @override
  State<ERPDashboard> createState() => _ERPDashboardState();
}

class _ERPDashboardState extends State<ERPDashboard> {
  bool _isDarkMode = true;

  @override
  Widget build(BuildContext context) {
    final state = AppState();
    final user = state.currentUser;
    final comp = state.currentCompany;

    if (user == null || comp == null) {
      return const LoginScreen();
    }

    // Filter permitted modules: must exist in BOTH the company active modules (subscription) AND the user permitted modules (roles)
    final basePermittedModules = ERPModulesList.modules.where((mod) {
      if (user.isCompanyAdmin) {
        return comp.activeModuleIds.contains(mod.id);
      }
      return comp.activeModuleIds.contains(mod.id) && user.permittedModuleIds.contains(mod.id);
    }).toList();

    final orderedIds = state.getDashboardLayoutForUser(user.username, basePermittedModules.map((m) => m.id).toList());
    final hiddenIds = state.getHiddenModulesForUser(user.username);

    final permittedModules = orderedIds
        .where((id) => !hiddenIds.contains(id))
        .map((id) => basePermittedModules.firstWhere((m) => m.id == id))
        .toList();

    final dark = _isDarkMode;

    return Theme(
      data: dark ? ThemeData.dark() : ThemeData.light(),
      child: Scaffold(
        backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
        appBar: AppBar(
          backgroundColor: dark ? AppColors.darkSurface : AppColors.primary,
          foregroundColor: Colors.white,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.blur_on, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(comp.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text(
                    'Multi-Tenant Code: ${comp.code} • Tier: ${comp.tierName}',
                    style: const TextStyle(fontSize: 11, color: Colors.white70),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            // Dark Mode Toggle
            IconButton(
              icon: Icon(_isDarkMode ? Icons.light_mode : Icons.dark_mode),
              tooltip: 'Theme Toggle',
              onPressed: () => setState(() => _isDarkMode = !_isDarkMode),
            ),
            
            // Chat Hub Button
            IconButton(
              icon: const Badge(
                label: Text('2'),
                child: Icon(Icons.chat_bubble_outline),
              ),
              tooltip: 'Communication & Expense Chats',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ChatHubScreen()),
                );
              },
            ),

            if (user.isCompanyAdmin) ...[
              IconButton(
                icon: const Icon(Icons.people_outline),
                tooltip: 'Role & User Manager',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const RoleManagerScreen()),
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.settings_outlined),
                tooltip: 'Company Settings',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const CompanySettingsScreen()),
                  );
                },
              ),
            ],

            const VerticalDivider(color: Colors.white24, indent: 12, endIndent: 12),

            // Logout
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Log Out',
              onPressed: () {
                AppState().logout();
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: ListenableBuilder(
          listenable: AppState(),
          builder: (context, child) {
            // Re-fetch to react to live changes
            final currentExpenses = AppState().expensesForCurrentCompany;
            final totalExpenseAmount = currentExpenses.fold<double>(0, (sum, item) => sum + item.amount);

            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // MAIN BODY
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Dynamic Welcome Header
                        _buildUserHero(context, user, dark),
                        const SizedBox(height: 24),

                        // Interactive Quick Metric Panel
                        _buildDashboardMetrics(context, totalExpenseAmount, currentExpenses.length, permittedModules.length, dark),
                        const SizedBox(height: 28),

                        // Section Title
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'ERP Permitted Module Directory',
                                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: -0.5),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Access restricted depending on your organization subscription and assigned role settings.',
                                    style: TextStyle(color: dark ? Colors.grey : Colors.grey[600], fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            ElevatedButton.icon(
                              onPressed: () => _showCustomizeDashboardDialog(context, user.username, basePermittedModules),
                              icon: const Icon(Icons.settings_suggest_outlined, size: 16),
                              label: const Text('Customize Layout'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.getPrimary(context),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Grid of permitted ERP modules
                        LayoutBuilder(
                          builder: (context, constraints) {
                            int crossAxisCount = 4;
                            if (constraints.maxWidth < 600) {
                              crossAxisCount = 1;
                            } else if (constraints.maxWidth < 950) {
                              crossAxisCount = 2;
                            } else if (constraints.maxWidth < 1300) {
                              crossAxisCount = 3;
                            }

                            return GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: crossAxisCount,
                                crossAxisSpacing: 16,
                                mainAxisSpacing: 16,
                                childAspectRatio: 2.2,
                              ),
                              itemCount: permittedModules.length,
                              itemBuilder: (context, index) {
                                final mod = permittedModules[index];
                                return _buildModuleCard(context, mod, dark);
                              },
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildUserHero(BuildContext context, ERPUser user, bool dark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Colors.white.withOpacity(0.2),
            child: Text(
              user.username[0].toUpperCase(),
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome Back, ${user.username}!',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  'Current Role Profile: ${user.role} | Department Level: Internal Administration',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                Icon(Icons.verified_user, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Text(
                  'Secure Session',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardMetrics(BuildContext context, double totalExpense, int expenseCount, int modulesCount, bool dark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        int columns = constraints.maxWidth < 600 ? 1 : 3;
        return GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: columns,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 3.5,
          children: [
            _buildMetricTile(
              context: context,
              title: 'Tracked Expenses (Month)',
              value: '₹ ${totalExpense.toStringAsFixed(2)}',
              subtitle: 'Active expense items log: $expenseCount',
              icon: Icons.monetization_on,
              color: AppColors.secondary,
              dark: dark,
            ),
            _buildMetricTile(
              context: context,
              title: 'Activated Modules',
              value: '$modulesCount / 20',
              subtitle: 'Gated by subscription tier licenses',
              icon: Icons.apps,
              color: AppColors.primary,
              dark: dark,
            ),
            _buildMetricTile(
              context: context,
              title: 'System Activity Logs',
              value: 'Normal / Healthy',
              subtitle: 'Double isolated tenant security',
              icon: Icons.shield_rounded,
              color: AppColors.accent,
              dark: dark,
            ),
          ],
        );
      },
    );
  }

  Widget _buildMetricTile({
    required BuildContext context,
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required bool dark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: dark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: dark ? Colors.transparent : Colors.grey.withOpacity(0.04),
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
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 10, color: dark ? Colors.grey : Colors.grey[600])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModuleCard(BuildContext context, ERPModule mod, bool dark) {
    return InkWell(
      onTap: () {
        // Dynamic route resolver for specific beautiful module panels
        Widget destination;
        switch (mod.id) {
          case 'crm':
            destination = const CRMModuleScreen();
            break;
          case 'finance':
            destination = const FinanceModuleScreen();
            break;
          case 'inventory':
            destination = const InventoryModuleScreen();
            break;
          case 'manufacturing':
            destination = const ManufacturingModuleScreen();
            break;
          case 'hrm':
            destination = const HRMModuleScreen();
            break;
          default:
            destination = GenericModuleScreen(module: mod);
        }

        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => destination),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: dark ? AppColors.darkCard : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(mod.icon, color: AppColors.primary, size: 28),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    mod.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, height: 1.2),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Expanded(
                    child: Text(
                      mod.description,
                      style: TextStyle(fontSize: 10, color: dark ? Colors.grey : Colors.grey[600], height: 1.3),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.group, color: Colors.grey, size: 10),
                      const SizedBox(width: 4),
                      Text(
                        mod.targetUsers.join(', '),
                        style: const TextStyle(color: Colors.grey, fontSize: 9),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Align(
              alignment: Alignment.center,
              child: Icon(Icons.chevron_right, color: Colors.grey, size: 20),
            ),
          ],
        ),
      ),
    );
  }

  void _showCustomizeDashboardDialog(BuildContext context, String username, List<ERPModule> baseModules) {
    final state = AppState();
    final initialLayout = state.getDashboardLayoutForUser(username, baseModules.map((m) => m.id).toList());
    final initialHidden = state.getHiddenModulesForUser(username);

    // Dialog local state
    List<String> tempLayout = List.from(initialLayout);
    Set<String> tempHidden = Set.from(initialHidden);

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final dark = _isDarkMode;
            return AlertDialog(
              backgroundColor: dark ? AppColors.darkSurface : Colors.white,
              title: Row(
                children: [
                  Icon(Icons.dashboard_customize, color: AppColors.getPrimary(context)),
                  const SizedBox(width: 12),
                  const Text('Configure SAP Workspace Tiles', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              content: SizedBox(
                width: 500,
                height: 400,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Toggle checkbox to hide/show module cards and use Up/Down buttons to reorder your workspace grid.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: ListView.builder(
                        itemCount: tempLayout.length,
                        itemBuilder: (context, index) {
                          final modId = tempLayout[index];
                          final mod = baseModules.firstWhere(
                            (m) => m.id == modId,
                            orElse: () => ERPModule(
                              id: modId,
                              name: modId.toUpperCase(),
                              description: '',
                              icon: Icons.extension,
                              targetUsers: const [],
                              category: 'Custom',
                              features: const [],
                            ),
                          );
                          final isVisible = !tempHidden.contains(modId);

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: dark ? Colors.white.withOpacity(0.03) : Colors.grey[50],
                              border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Checkbox(
                                  value: isVisible,
                                  onChanged: (val) {
                                    setDialogState(() {
                                      if (val == true) {
                                        tempHidden.remove(modId);
                                      } else {
                                        tempHidden.add(modId);
                                      }
                                    });
                                  },
                                ),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: AppColors.getPrimary(context).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Icon(mod.icon, color: AppColors.getPrimary(context), size: 16),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    mod.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.arrow_upward, size: 16),
                                  onPressed: index > 0
                                      ? () {
                                          setDialogState(() {
                                            final item = tempLayout.removeAt(index);
                                            tempLayout.insert(index - 1, item);
                                          });
                                        }
                                      : null,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.arrow_downward, size: 16),
                                  onPressed: index < tempLayout.length - 1
                                      ? () {
                                          setDialogState(() {
                                            final item = tempLayout.removeAt(index);
                                            tempLayout.insert(index + 1, item);
                                          });
                                        }
                                      : null,
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    AppState().updateDashboardLayoutForUser(username, tempLayout, tempHidden);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Dashboard layout configuration saved successfully.'),
                        backgroundColor: AppColors.accent,
                      ),
                    );
                  },
                  icon: const Icon(Icons.check_circle),
                  label: const Text('Save Settings'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.getPrimary(context),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
