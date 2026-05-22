import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../theme/app_colors.dart';
import '../erp_dashboard.dart';
import '../super_admin/super_admin_dashboard.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _companyCodeController = TextEditingController();
  
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _companyCodeController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    setState(() {
      _errorMessage = null;
      _isLoading = true;
    });

    final error = AppState().login(
      username: _usernameController.text.trim(),
      password: _passwordController.text,
      companyCode: _companyCodeController.text.trim().toUpperCase(),
    );

    setState(() {
      _isLoading = false;
    });

    if (error != null) {
      setState(() {
        _errorMessage = error;
      });
    } else {
      // Login successful, routing based on role
      final currentUser = AppState().currentUser;
      if (currentUser != null && currentUser.isSuperAdmin) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const SuperAdminDashboard()),
        );
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ERPDashboard()),
        );
      }
    }
  }

  void _useShortcut(String user, String pass, String code) {
    _usernameController.text = user;
    _passwordController.text = pass;
    _companyCodeController.text = code;
    _handleLogin();
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);

    return Scaffold(
      body: Container(
        decoration: dark ? const BoxDecoration(gradient: AppColors.darkVibeGradient) : null,
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 900),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Left Panel: Premium ERP Info (Visible on larger screens/desktop)
                  if (MediaQuery.of(context).size.width > 700) ...[
                    Expanded(
                      flex: 5,
                      child: Padding(
                        padding: const EdgeInsets.only(right: 32.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.star, color: AppColors.secondary, size: 16),
                                  SizedBox(width: 8),
                                  Text(
                                    'Enterprise Grade SaaS ERP',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'Scale Your Industry\nWith AntiGravity ERP',
                              style: TextStyle(
                                fontSize: 36,
                                fontWeight: FontWeight.bold,
                                height: 1.15,
                                letterSpacing: -1,
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'A single unified ecosystem built for manufacturing, retail, logistics, finance, and CRM. Secure, robust, multi-tenant separated, and fully customizable.',
                              style: TextStyle(color: Colors.grey, fontSize: 15, height: 1.4),
                            ),
                            const SizedBox(height: 32),
                            // Quick Highlights
                            _buildHighlightItem(Icons.security, 'Multi-Tenant Isolation'),
                            _buildHighlightItem(Icons.dashboard_customize, 'Role-Based Access Control'),
                            _buildHighlightItem(Icons.chat_bubble, 'General & Group Expense Chats'),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // Right Panel: Form
                  Expanded(
                    flex: 4,
                    child: Container(
                      padding: const EdgeInsets.all(32),
                      decoration: AppColors.glassDecoration(context, radius: 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                gradient: AppColors.primaryGradient,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(
                                Icons.all_inclusive,
                                size: 32,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Portal Login',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 20),

                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppColors.danger.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.danger.withOpacity(0.2)),
                              ),
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: AppColors.danger, fontSize: 13),
                                textAlign: TextAlign.center,
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          TextField(
                            controller: _companyCodeController,
                            decoration: const InputDecoration(
                              labelText: 'Company Code',
                              prefixIcon: Icon(Icons.domain),
                            ),
                            textCapitalization: TextCapitalization.characters,
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _usernameController,
                            decoration: const InputDecoration(
                              labelText: 'Username',
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : const Text('Access Dashboard', style: TextStyle(fontSize: 16)),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              const Text("New Company employee? ", style: TextStyle(color: Colors.grey, fontSize: 13)),
                              TextButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (context) => const SignupScreen()),
                                  );
                                },
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: const Text('Sign Up', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              ),
                            ],
                          ),

                          const Divider(height: 32),

                          // DEVELOPER SHORTCUTS (WOW FEATURE FOR SANDBOX TESTING)
                          const Text(
                            'Demo / Testing Sandbox Personas:',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.grey),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            alignment: WrapAlignment.center,
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _buildShortcutChip(
                                label: 'Super Admin',
                                color: AppColors.secondary,
                                onTap: () => _useShortcut('superadmin', 'supersecure123', 'SUPER'),
                              ),
                              _buildShortcutChip(
                                label: 'Company Admin',
                                color: AppColors.primary,
                                onTap: () => _useShortcut('admin', 'adminpassword', 'DINE'),
                              ),
                              _buildShortcutChip(
                                label: 'Sales Mgr',
                                color: AppColors.accent,
                                onTap: () => _useShortcut('sales_user', 'salespassword', 'DINE'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHighlightItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, color: AppColors.accent, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutChip({required String label, required Color color, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: 11,
          ),
        ),
      ),
    );
  }
}
