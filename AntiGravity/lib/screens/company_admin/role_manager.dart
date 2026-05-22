import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../models/erp_module_definition.dart';
import '../../theme/app_colors.dart';

class RoleManagerScreen extends StatefulWidget {
  const RoleManagerScreen({super.key});

  @override
  State<RoleManagerScreen> createState() => _RoleManagerScreenState();
}

class _RoleManagerScreenState extends State<RoleManagerScreen> {
  final _roleNameController = TextEditingController();
  final _employeeUsernameController = TextEditingController();
  final _employeePasswordController = TextEditingController();
  final _employeeEmailController = TextEditingController();
  final _employeeMobileController = TextEditingController();
  
  final List<String> _selectedRoleModules = [];
  String? _selectedEmployeeRole;

  @override
  void dispose() {
    _roleNameController.dispose();
    _employeeUsernameController.dispose();
    _employeePasswordController.dispose();
    _employeeEmailController.dispose();
    _employeeMobileController.dispose();
    super.dispose();
  }

  void _createRole() {
    final name = _roleNameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a role name.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (_selectedRoleModules.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please assign at least one permitted module.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    AppState().createCustomRole(name, _selectedRoleModules);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Custom Role "$name" created successfully!'), backgroundColor: AppColors.accent),
    );
    setState(() {
      _roleNameController.clear();
      _selectedRoleModules.clear();
    });
  }

  void _createEmployee() {
    final user = _employeeUsernameController.text.trim();
    final pass = _employeePasswordController.text;
    final email = _employeeEmailController.text.trim();
    final mobile = _employeeMobileController.text.trim();

    if (user.isEmpty || pass.isEmpty || email.isEmpty || mobile.isEmpty || _selectedEmployeeRole == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All fields and role are required.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final err = AppState().createCompanyEmployee(
      username: user,
      password: pass,
      email: email,
      mobile: mobile,
      roleName: _selectedEmployeeRole!,
    );

    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Employee "$user" registered as $_selectedEmployeeRole!'), backgroundColor: AppColors.accent),
      );
      setState(() {
        _employeeUsernameController.clear();
        _employeePasswordController.clear();
        _employeeEmailController.clear();
        _employeeMobileController.clear();
        _selectedEmployeeRole = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);
    final comp = AppState().currentCompany;
    if (comp == null) return const Scaffold(body: Center(child: Text('Unauthorized access.')));

    // Extract modules unlocked by Super Admin for this company
    final companyActiveModules = ERPModulesList.modules.where((m) => comp.activeModuleIds.contains(m.id) && m.id != 'admin').toList();
    final customRoles = AppState().rolesForCurrentCompany;
    
    // Employee list in DINE
    final companyEmployees = AppState().users.where((u) => u.companyCode == comp.code && !u.isSuperAdmin).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Role & Employee Console', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: dark ? AppColors.darkSurface : AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left Column: Custom Roles Manager
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: AppColors.glassDecoration(context),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Define Company Roles', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        const Text('Design custom tags (e.g. Sales Executive) and assign module subsets.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _roleNameController,
                          decoration: const InputDecoration(
                            labelText: 'Role Title Name',
                            hintText: 'e.g. Quality Auditor',
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text('Granted Module Access List:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        Container(
                          height: 250,
                          decoration: BoxDecoration(
                            border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[300]!),
                            borderRadius: BorderRadius.circular(12),
                            color: dark ? AppColors.darkBg : Colors.grey[50],
                          ),
                          child: ListView.builder(
                            itemCount: companyActiveModules.length,
                            itemBuilder: (context, idx) {
                              final mod = companyActiveModules[idx];
                              final isChecked = _selectedRoleModules.contains(mod.id);
                              return CheckboxListTile(
                                title: Text(mod.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                subtitle: Text(mod.category, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                secondary: Icon(mod.icon, size: 20),
                                value: isChecked,
                                dense: true,
                                onChanged: (val) {
                                  setState(() {
                                    if (val == true) {
                                      _selectedRoleModules.add(mod.id);
                                    } else {
                                      _selectedRoleModules.remove(mod.id);
                                    }
                                  });
                                },
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _createRole,
                          icon: const Icon(Icons.shield_outlined, size: 18),
                          label: const Text('Save Custom Role'),
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size.fromHeight(50),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(width: 24),

                // Right Column: Add Employee Form
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: AppColors.glassDecoration(context),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Register Employee Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        const Text('Directly add active workers to roles. They can bypass OTP requirements.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _employeeUsernameController,
                          decoration: const InputDecoration(labelText: 'Employee Username'),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _employeePasswordController,
                          decoration: const InputDecoration(labelText: 'Login Password'),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _employeeEmailController,
                          decoration: const InputDecoration(labelText: 'Email Address'),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _employeeMobileController,
                          decoration: const InputDecoration(labelText: 'Mobile Number'),
                        ),
                        const SizedBox(height: 16),
                        
                        DropdownButtonFormField<String>(
                          initialValue: _selectedEmployeeRole,
                          decoration: const InputDecoration(labelText: 'Select Assigned Role'),
                          items: [
                            const DropdownMenuItem(value: 'admin', child: Text('Company Admin (Full Permissions)')),
                            ...customRoles.map((r) => DropdownMenuItem(value: r.name, child: Text(r.name))),
                          ],
                          onChanged: (role) {
                            setState(() {
                              _selectedEmployeeRole = role;
                            });
                          },
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _createEmployee,
                          icon: const Icon(Icons.person_add_outlined, size: 18),
                          label: const Text('Provision User Account'),
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size.fromHeight(50),
                            backgroundColor: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Employee Directory
            const Text('Corporate Directory', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ListenableBuilder(
              listenable: AppState(),
              builder: (context, child) {
                final list = AppState().users.where((u) => u.companyCode == comp.code && !u.isSuperAdmin).toList();
                return Container(
                  decoration: AppColors.glassDecoration(context),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: list.length,
                    separatorBuilder: (context, idx) => const Divider(height: 1),
                    itemBuilder: (context, idx) {
                      final employee = list[idx];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: employee.isCompanyAdmin ? AppColors.secondary : AppColors.primary,
                          child: Icon(employee.isCompanyAdmin ? Icons.admin_panel_settings : Icons.person, color: Colors.white, size: 20),
                        ),
                        title: Text(employee.username, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Role: ${employee.role} | Email: ${employee.email} | Mobile: ${employee.mobile}'),
                        trailing: Text(
                          employee.isVerified ? 'Verified Session' : 'Pending OTP Verification',
                          style: TextStyle(
                            color: employee.isVerified ? AppColors.accent : AppColors.warning,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
