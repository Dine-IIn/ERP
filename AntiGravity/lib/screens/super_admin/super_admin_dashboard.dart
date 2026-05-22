import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../models/company.dart';
import '../../models/erp_module_definition.dart';
import '../../theme/app_colors.dart';
import '../auth/login_screen.dart';

class SuperAdminDashboard extends StatefulWidget {
  const SuperAdminDashboard({super.key});

  @override
  State<SuperAdminDashboard> createState() => _SuperAdminDashboardState();
}

class _SuperAdminDashboardState extends State<SuperAdminDashboard> {
  Company? _selectedCompany;

  @override
  void initState() {
    super.initState();
    final apps = AppState().companies;
    if (apps.isNotEmpty) {
      _selectedCompany = apps.first;
    }
  }

  void _showAddCompanyDialog() {
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final mobileCtrl = TextEditingController();
    SubscriptionTier selectedTier = SubscriptionTier.standard;
    List<String> selectedModules = Company.getDefaultModulesForTier(SubscriptionTier.standard);

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Register New Company Tenant'),
          content: SizedBox(
            width: 600,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Company Name'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: codeCtrl,
                    decoration: const InputDecoration(labelText: 'Unique Company Code (e.g., TECH)'),
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: emailCtrl,
                    decoration: const InputDecoration(labelText: 'Corporate Email'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: mobileCtrl,
                    decoration: const InputDecoration(labelText: 'Mobile Contact'),
                  ),
                  const SizedBox(height: 16),
                  
                  // Subscription tier selector
                  DropdownButtonFormField<SubscriptionTier>(
                    initialValue: selectedTier,
                    decoration: const InputDecoration(labelText: 'Subscription Tier'),
                    items: SubscriptionTier.values.map((tier) {
                      return DropdownMenuItem(
                        value: tier,
                        child: Text(tier.toString().split('.').last.toUpperCase()),
                      );
                    }).toList(),
                    onChanged: (tier) {
                      if (tier != null) {
                        setDialogState(() {
                          selectedTier = tier;
                          selectedModules = Company.getDefaultModulesForTier(tier);
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // Module picker list
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Assign Modules & Core Features:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 200,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.withOpacity(0.3)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListView(
                      shrinkWrap: true,
                      children: ERPModulesList.modules.map((m) {
                        final isSelected = selectedModules.contains(m.id);
                        return CheckboxListTile(
                          title: Text(m.name, style: const TextStyle(fontSize: 13)),
                          subtitle: Text(m.category, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                          value: isSelected,
                          dense: true,
                          onChanged: (val) {
                            setDialogState(() {
                              if (val == true) {
                                if (!selectedModules.contains(m.id)) {
                                  selectedModules.add(m.id);
                                }
                              } else {
                                selectedModules.remove(m.id);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final err = AppState().createCompany(
                  name: nameCtrl.text.trim(),
                  code: codeCtrl.text.trim().toUpperCase(),
                  email: emailCtrl.text.trim(),
                  mobile: mobileCtrl.text.trim(),
                  tier: selectedTier,
                  modules: selectedModules,
                );

                if (err != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Company tenant successfully registered!'), backgroundColor: AppColors.accent),
                  );
                  setState(() {
                    _selectedCompany = AppState().companies.last;
                  });
                  Navigator.pop(context);
                }
              },
              child: const Text('Add Tenant'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddAdminDialog() {
    if (_selectedCompany == null) return;

    final userCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final mobCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Add Admin to ${_selectedCompany!.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: userCtrl,
              decoration: const InputDecoration(labelText: 'Admin Username'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: passCtrl,
              decoration: const InputDecoration(labelText: 'Admin Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: emailCtrl,
              decoration: const InputDecoration(labelText: 'Admin Corporate Email'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: mobCtrl,
              decoration: const InputDecoration(labelText: 'Admin Mobile Number'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final err = AppState().createCompanyAdmin(
                companyCode: _selectedCompany!.code,
                username: userCtrl.text.trim(),
                password: passCtrl.text,
                email: emailCtrl.text.trim(),
                mobile: mobCtrl.text.trim(),
              );

              if (err != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Company Admin created for ${_selectedCompany!.name}!'), backgroundColor: AppColors.accent),
                );
                Navigator.pop(context);
              }
            },
            child: const Text('Create Admin'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);
    final allCompanies = AppState().companies;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Super Admin Controller', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: dark ? AppColors.darkSurface : AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: () {
              AppState().logout();
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              );
            },
          ),
        ],
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Sidebar: Tenants List
          Expanded(
            flex: 3,
            child: Container(
              decoration: BoxDecoration(
                color: dark ? AppColors.darkSurface : Colors.grey[100],
                border: Border(right: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[300]!)),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Company Tenants',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_business, color: AppColors.primary),
                          onPressed: _showAddCompanyDialog,
                          tooltip: 'Add Tenant',
                        )
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView.builder(
                      itemCount: allCompanies.length,
                      itemBuilder: (context, idx) {
                        final comp = allCompanies[idx];
                        final isSelected = _selectedCompany?.code == comp.code;
                        return ListTile(
                          selected: isSelected,
                          selectedTileColor: AppColors.primary.withOpacity(0.1),
                          title: Text(comp.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('Code: ${comp.code} | Tier: ${comp.tierName}'),
                          leading: CircleAvatar(
                            backgroundColor: AppColors.primary,
                            child: Text(comp.code.take(2), style: const TextStyle(color: Colors.white)),
                          ),
                          onTap: () {
                            setState(() {
                              _selectedCompany = comp;
                            });
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Main Pane: Subscriptions, Admins, and Feature Toggles
          Expanded(
            flex: 7,
            child: _selectedCompany == null
                ? const Center(child: Text('Please select or add a company tenant to begin.'))
                : ListenableBuilder(
                    listenable: AppState(),
                    builder: (context, child) {
                      // Fetch fresh copy from State in case of updates
                      final comp = AppState().companies.firstWhere((c) => c.code == _selectedCompany!.code);
                      final companyAdmins = AppState().users.where((u) => u.companyCode == comp.code && u.isCompanyAdmin).toList();
                      
                      return SingleChildScrollView(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Company Detail Header Card
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: AppColors.glassDecoration(context),
                              child: Row(
                                children: [
                                  Container(
                                    width: 72,
                                    height: 72,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      gradient: AppColors.primaryGradient,
                                    ),
                                    child: Center(
                                      child: Text(
                                        comp.code.take(2),
                                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 24),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(comp.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 4),
                                        Text('Tenant Identity Code: ${comp.code} | Registered: ${comp.createdAt.toLocal().toString().split(' ').first}'),
                                        const SizedBox(height: 8),
                                        Wrap(
                                          spacing: 12,
                                          runSpacing: 8,
                                          crossAxisAlignment: WrapCrossAlignment.center,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                              decoration: BoxDecoration(
                                                gradient: comp.subscriptionTier == SubscriptionTier.enterprise
                                                    ? AppColors.secondaryGradient
                                                    : AppColors.primaryGradient,
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                'Tier: ${comp.tierName}',
                                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                              ),
                                            ),
                                            Text('Email: ${comp.email} | Mobile: ${comp.mobile}'),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Admins Section
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Company Administrators', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                ElevatedButton.icon(
                                  onPressed: _showAddAdminDialog,
                                  icon: const Icon(Icons.person_add, size: 18),
                                  label: const Text('Add Admin User'),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            if (companyAdmins.isEmpty)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.danger.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.warning, color: AppColors.danger),
                                    SizedBox(width: 12),
                                    Text('No administrator registered yet. Create one to enable organization setup!', style: TextStyle(fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              )
                            else
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: companyAdmins.length,
                                itemBuilder: (context, idx) {
                                  final adm = companyAdmins[idx];
                                  return Card(
                                    child: ListTile(
                                      leading: const Icon(Icons.admin_panel_settings, color: AppColors.primary),
                                      title: Text(adm.username, style: const TextStyle(fontWeight: FontWeight.bold)),
                                      subtitle: Text('Email: ${adm.email} | Mobile: ${adm.mobile}'),
                                      trailing: const Text('Active Session verified', style: TextStyle(color: AppColors.accent, fontSize: 12)),
                                    ),
                                  );
                                },
                              ),
                            
                            const SizedBox(height: 32),

                            // Subscription Module Toggles
                            const Text('Subscription Feature Gate Control', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            const Text('Directly assign/restrict access to any of the 20 main modules. This overrides tenant-wide settings.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                            const SizedBox(height: 16),

                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: MediaQuery.of(context).size.width > 1100 ? 3 : 2,
                                childAspectRatio: MediaQuery.of(context).size.width > 1100 ? 3.0 : 2.7,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                              ),
                              itemCount: ERPModulesList.modules.length,
                              itemBuilder: (context, index) {
                                final mod = ERPModulesList.modules[index];
                                final isGateActive = comp.activeModuleIds.contains(mod.id);
                                return InkWell(
                                  onTap: () {
                                    final newList = List<String>.from(comp.activeModuleIds);
                                    if (isGateActive) {
                                      newList.remove(mod.id);
                                    } else {
                                      newList.add(mod.id);
                                    }
                                    AppState().updateCompanySubscription(comp.code, SubscriptionTier.custom, newList);
                                  },
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 150),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isGateActive 
                                          ? AppColors.primary.withOpacity(0.08) 
                                          : (dark ? AppColors.darkCard : Colors.white),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isGateActive ? AppColors.primary : (dark ? AppColors.darkBorder : Colors.grey[300]!),
                                        width: 1.5,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(mod.icon, color: isGateActive ? AppColors.primary : Colors.grey, size: 24),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                mod.name,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 12,
                                                  color: isGateActive ? (dark ? Colors.white : Colors.black87) : Colors.grey,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              Text(
                                                mod.category,
                                                style: const TextStyle(fontSize: 9, color: Colors.grey),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Switch(
                                          value: isGateActive,
                                          activeThumbColor: AppColors.primary,
                                          onChanged: (val) {
                                            final newList = List<String>.from(comp.activeModuleIds);
                                            if (val) {
                                              if (!newList.contains(mod.id)) newList.add(mod.id);
                                            } else {
                                              newList.remove(mod.id);
                                            }
                                            AppState().updateCompanySubscription(comp.code, SubscriptionTier.custom, newList);
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

extension StringExtension on String {
  String take(int n) {
    if (length <= n) return this;
    return substring(0, n).toUpperCase();
  }
}
