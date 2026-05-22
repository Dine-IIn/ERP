import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/theme_provider.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _profileFormKey = GlobalKey<FormState>();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final user = auth.userData ?? {};
      _firstNameController.text = user['first_name']?.toString() ?? '';
      _lastNameController.text = user['last_name']?.toString() ?? '';
      _phoneController.text = user['mobile']?.toString() ?? '';
    });
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.userData ?? {};
    final company = authProvider.companyData ?? {};

    return Container(
      padding: const EdgeInsets.all(24.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              'System Settings',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Configure workspace layout models, profile definitions, and active multi-company details.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 32),

            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Column 1: Core options
                Expanded(
                  child: Column(
                    children: [
                      // Card 1: Appearance
                      _buildAppearanceCard(themeProvider),
                      const SizedBox(height: 24),
                      // Card 2: Company Profile
                      _buildCompanyInfoCard(company),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                // Column 2: Profile settings
                Expanded(
                  child: Column(
                    children: [
                      _buildUserProfileCard(user),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppearanceCard(ThemeProvider themeProvider) {
    final isDark = themeProvider.themeMode == ThemeMode.dark;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Appearance / System Theme',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Toggle between sleek enterprise dark mode and high-contrast light mode templates.',
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
            const Divider(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isDark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
                      color: const Color(AppColors.primaryBlue),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      'Dark Mode active',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                Switch(
                  value: isDark,
                  onChanged: (value) {
                    themeProvider.toggleTheme(value);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompanyInfoCard(Map<String, dynamic> company) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Multi-Tenant SaaS Company Data',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'View registered multi-tenant settings and corporate identifiers.',
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
            const Divider(height: 32),
            _buildDetailRow('Company Name', company['name'] ?? 'N/A'),
            _buildDetailRow('SaaS Company Code', company['code'] ?? 'N/A'),
            _buildDetailRow('Plan Level', (company['subscription_plan'] ?? 'premium').toString().toUpperCase()),
            _buildDetailRow('Status Key', (company['is_active'] ?? true) ? 'ACTIVE' : 'INACTIVE'),
          ],
        ),
      ),
    );
  }

  Widget _buildUserProfileCard(Map<String, dynamic> user) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _profileFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Personal Employee Profile',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Update designation tags, phone records, and login identifiers.',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const Divider(height: 32),
              TextFormField(
                controller: _firstNameController,
                decoration: const InputDecoration(
                  labelText: 'First Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _lastNameController,
                decoration: const InputDecoration(
                  labelText: 'Last Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Mobile Number',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                icon: const Icon(Icons.save_outlined, size: 18),
                label: const Text('Save Profile Details'),
                onPressed: () {
                  if (_profileFormKey.currentState!.validate()) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Employee profile cached and updated!')),
                    );
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}
