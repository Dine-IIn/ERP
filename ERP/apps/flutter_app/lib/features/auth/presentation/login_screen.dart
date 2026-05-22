import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _userController = TextEditingController(text: 'superadmin');
  final _passwordController = TextEditingController(text: 'admin123');
  bool _obscurePassword = true;
  String _role = 'Super Admin';

  static const _roles = ['Super Admin', 'Company Owner', 'ERP User'];

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7F9),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: const BorderSide(color: Color(0xFFE3E7EF)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.account_balance_outlined, size: 34),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Enterprise ERP',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Sign in to the platform. Super Admin manages companies, features, roles, and tenant access.',
                      style: TextStyle(color: Color(0xFF667085)),
                    ),
                    const SizedBox(height: 22),
                    DropdownMenu<String>(
                      initialSelection: _role,
                      label: const Text('Login as'),
                      expandedInsets: EdgeInsets.zero,
                      dropdownMenuEntries: _roles
                          .map((role) =>
                              DropdownMenuEntry(value: role, label: role))
                          .toList(),
                      onSelected: (value) => setState(() {
                        _role = value ?? _role;
                        if (_role == 'Super Admin') {
                          _userController.text = 'superadmin';
                          _passwordController.text = 'admin123';
                        } else if (_role == 'Company Owner') {
                          _userController.text = 'owner@alloyworks.in';
                          _passwordController.text = 'owner123';
                        } else {
                          _userController.text = 'operator@alloyworks.in';
                          _passwordController.text = 'user123';
                        }
                      }),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _userController,
                      decoration: const InputDecoration(
                        labelText: 'Email or username',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                              ? 'Enter a username or email.'
                              : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        border: const OutlineInputBorder(),
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword
                              ? 'Show password'
                              : 'Hide password',
                          onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword),
                          icon: Icon(_obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined),
                        ),
                      ),
                      validator: (value) => value == null || value.length < 6
                          ? 'Password must be at least 6 characters.'
                          : null,
                    ),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      onPressed: _signIn,
                      icon: const Icon(Icons.login_outlined),
                      label: const Text('Sign in'),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Demo credentials: superadmin/admin123, owner@alloyworks.in/owner123, operator@alloyworks.in/user123',
                      style: TextStyle(color: Color(0xFF667085)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _signIn() {
    if (!_formKey.currentState!.validate()) return;

    final user = _userController.text.trim().toLowerCase();
    final password = _passwordController.text;
    final isSuperAdmin = user == 'superadmin' && password == 'admin123';
    final isOwner = user == 'owner@alloyworks.in' && password == 'owner123';
    final isUser = user == 'operator@alloyworks.in' && password == 'user123';

    if ((_role == 'Super Admin' && isSuperAdmin) ||
        (_role == 'Company Owner' && isOwner) ||
        (_role == 'ERP User' && isUser)) {
      context.go(_role == 'Super Admin' ? '/super-admin' : '/dashboard');
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Invalid credentials for selected role.')),
    );
  }
}
