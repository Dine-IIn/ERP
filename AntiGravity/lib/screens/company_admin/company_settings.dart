import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../theme/app_colors.dart';

class CompanySettingsScreen extends StatefulWidget {
  const CompanySettingsScreen({super.key});

  @override
  State<CompanySettingsScreen> createState() => _CompanySettingsScreenState();
}

class _CompanySettingsScreenState extends State<CompanySettingsScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  final _gstCtrl = TextEditingController();
  final _primaryColorCtrl = TextEditingController();
  final _secondaryColorCtrl = TextEditingController();
  
  String _selectedCurrency = 'INR (₹)';
  String _selectedTimezone = 'UTC+05:30 (India)';
  final String _selectedLanguage = 'English (US)';
  ExpenseVisibilitySetting _selectedExpenseSetting = ExpenseVisibilitySetting.showAllExpenses;

  @override
  void initState() {
    super.initState();
    final comp = AppState().currentCompany;
    if (comp != null) {
      _nameCtrl.text = comp.name;
      _emailCtrl.text = comp.email;
      _mobileCtrl.text = comp.mobile;
      _gstCtrl.text = '27AAACD1234F1ZP (Active)'; // Default placeholder for seeder
      _selectedExpenseSetting = AppState().getExpenseVisibilitySetting(comp.code);
      _primaryColorCtrl.text = comp.primaryColorHex ?? '0xFF6366F1';
      _secondaryColorCtrl.text = comp.secondaryColorHex ?? '0xFFEC4899';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _mobileCtrl.dispose();
    _gstCtrl.dispose();
    _primaryColorCtrl.dispose();
    _secondaryColorCtrl.dispose();
    super.dispose();
  }

  bool _isValidHexColor(String value) {
    final regExp = RegExp(r'^0x[fF]{2}[0-9a-fA-F]{6}$');
    return regExp.hasMatch(value);
  }

  Widget _buildPresetButton(String label, String primary, String secondary) {
    return ActionChip(
      label: Text(label),
      backgroundColor: Color(int.parse(primary)).withOpacity(0.15),
      side: BorderSide(color: Color(int.parse(primary)).withOpacity(0.6), width: 1.5),
      onPressed: () {
        setState(() {
          _primaryColorCtrl.text = primary;
          _secondaryColorCtrl.text = secondary;
        });
        AppState().updateCompanyColors(primary, secondary);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Theme dynamically swapped to $label preset!'),
            backgroundColor: Color(int.parse(primary)),
            duration: const Duration(seconds: 2),
          ),
        );
      },
    );
  }

  void _saveSettings() {
    final comp = AppState().currentCompany;
    if (comp == null) return;

    final primaryHex = _primaryColorCtrl.text.trim();
    final secondaryHex = _secondaryColorCtrl.text.trim();

    if (!_isValidHexColor(primaryHex) || !_isValidHexColor(secondaryHex)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid Hex format! Colors must start with "0xFF" and have 8 hex digits. (e.g. 0xFF6366F1)'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    // Apply colors to state
    AppState().updateCompanyColors(primaryHex, secondaryHex);

    // Apply Expense visibility policy
    AppState().setExpenseVisibilitySetting(comp.code, _selectedExpenseSetting);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Company settings, theme overrides, and expense policies successfully updated!'),
        backgroundColor: AppColors.accent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);
    final comp = AppState().currentCompany;
    if (comp == null) return const Scaffold(body: Center(child: Text('Access Denied.')));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Company Profile & Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: dark ? AppColors.darkSurface : AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 800),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Company Header
              Container(
                padding: const EdgeInsets.all(24),
                decoration: AppColors.glassDecoration(context),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.primary,
                      child: Text(comp.code, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(comp.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('Corporate Code: ${comp.code} | License Active'),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Settings Form
              Container(
                padding: const EdgeInsets.all(24),
                decoration: AppColors.glassDecoration(context),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Corporate Profile Metadata', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(labelText: 'Company Registered Name', prefixIcon: Icon(Icons.business)),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _emailCtrl,
                            decoration: const InputDecoration(labelText: 'Billing Email Address', prefixIcon: Icon(Icons.email)),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextField(
                            controller: _mobileCtrl,
                            decoration: const InputDecoration(labelText: 'Contact Phone Number', prefixIcon: Icon(Icons.phone)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _gstCtrl,
                      decoration: const InputDecoration(labelText: 'Corporate GST / VAT Registration Number', prefixIcon: Icon(Icons.receipt_long)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Localizations & Region Settings
              Container(
                padding: const EdgeInsets.all(24),
                decoration: AppColors.glassDecoration(context),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Regional & Currency Settings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _selectedCurrency,
                            decoration: const InputDecoration(labelText: 'Base System Currency'),
                            items: ['INR (₹)', 'USD (\$)', 'EUR (€)', 'GBP (£)'].map((c) {
                              return DropdownMenuItem(value: c, child: Text(c));
                            }).toList(),
                            onChanged: (val) => setState(() => _selectedCurrency = val!),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _selectedTimezone,
                            decoration: const InputDecoration(labelText: 'Default Company Timezone'),
                            items: ['UTC+05:30 (India)', 'UTC-05:00 (EST)', 'UTC+00:00 (GMT)', 'UTC+08:00 (Singapore)'].map((c) {
                              return DropdownMenuItem(value: c, child: Text(c));
                            }).toList(),
                            onChanged: (val) => setState(() => _selectedTimezone = val!),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // EXPENSE CHAT GATING POLICY (WOW Admin Setting)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: AppColors.glassDecoration(context),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.lock_person, color: AppColors.secondary),
                        const SizedBox(width: 12),
                        const Text('Expense Visibility Controls', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Configure employee-level data isolation policies for the collaborative Expense Chat. Admins and super-admins are unaffected.',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    RadioListTile<ExpenseVisibilitySetting>(
                      title: const Text('Show All Corporate Expenses', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('All employees can see, discuss, and evaluate every expense logged in the system.', style: TextStyle(fontSize: 12)),
                      value: ExpenseVisibilitySetting.showAllExpenses,
                      groupValue: _selectedExpenseSetting,
                      activeColor: AppColors.primary,
                      onChanged: (val) => setState(() => _selectedExpenseSetting = val!),
                    ),
                    RadioListTile<ExpenseVisibilitySetting>(
                      title: const Text('Show Only Personal / Own Expenses', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('Strict privacy. Employees only see their own entries. The Expense Chat is completely isolated.', style: TextStyle(fontSize: 12)),
                      value: ExpenseVisibilitySetting.showOnlyOwnExpenses,
                      groupValue: _selectedExpenseSetting,
                      activeColor: AppColors.primary,
                      onChanged: (val) => setState(() => _selectedExpenseSetting = val!),
                    ),
                    RadioListTile<ExpenseVisibilitySetting>(
                      title: const Text('Show Shared Department & Group Expenses', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('Hybrid visibility. Employees see personal records plus group expense splits they belong to.', style: TextStyle(fontSize: 12)),
                      value: ExpenseVisibilitySetting.showDepartmentExpenses,
                      groupValue: _selectedExpenseSetting,
                      activeColor: AppColors.primary,
                      onChanged: (val) => setState(() => _selectedExpenseSetting = val!),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // WHITE-LABEL BRANDING CUSTOMIZER (Premium UI Panel)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: AppColors.glassDecoration(context),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.palette_outlined, color: AppColors.primary),
                        SizedBox(width: 12),
                        Text('White-Label Workspace Customizer', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Choose a curated theme preset (comparable to SAP Blue or STERP Charcoal) or specify custom primary/secondary hexadecimal color tokens to instantly personalize the entire enterprise suite.',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 20),

                    // Curated Preset Buttons Row
                    const Text('Curated Workspace Presets:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _buildPresetButton('SAP Blue Suite', '0xFF0A6ED1', '0xFF4FA8FF'),
                        _buildPresetButton('STERP Manufacturing', '0xFF2A2E33', '0xFFFF5E00'),
                        _buildPresetButton('Emerald Accent', '0xFF10B981', '0xFF06B6D4'),
                        _buildPresetButton('Indigo Default', '0xFF6366F1', '0xFFEC4899'),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Custom Hex Inputs
                    const Text('Custom Hex Color Tokens (ARGB / 0xFFFFFFFF):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _primaryColorCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Primary Workspace Hex',
                              prefixIcon: Icon(Icons.color_lens),
                              hintText: '0xFF6366F1',
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextField(
                            controller: _secondaryColorCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Secondary Workspace Hex',
                              prefixIcon: Icon(Icons.color_lens_outlined),
                              hintText: '0xFFEC4899',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Save Action Button
              ElevatedButton.icon(
                onPressed: _saveSettings,
                icon: const Icon(Icons.save),
                label: const Text('Save Configuration'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(55),
                  backgroundColor: AppColors.accent,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
