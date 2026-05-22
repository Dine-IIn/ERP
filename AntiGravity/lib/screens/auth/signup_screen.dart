import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../theme/app_colors.dart';
import 'otp_screen.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailController = TextEditingController();
  final _mobileController = TextEditingController();
  final _companyCodeController = TextEditingController();
  
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _emailController.dispose();
    _mobileController.dispose();
    _companyCodeController.dispose();
    super.dispose();
  }

  void _handleSignup() {
    setState(() {
      _errorMessage = null;
      _isLoading = true;
    });

    final error = AppState().signup(
      username: _usernameController.text.trim(),
      password: _passwordController.text,
      email: _emailController.text.trim(),
      mobile: _mobileController.text.trim(),
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
      // Registration successful, open OTP screen
      final username = _usernameController.text.trim();
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => OtpScreen(username: username),
        ),
      );
    }
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
              constraints: const BoxConstraints(maxWidth: 500),
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: AppColors.glassDecoration(context, radius: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header Logo & Vibe
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(
                          Icons.business_center,
                          size: 40,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Create ERP Account',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'All 5 fields are compulsory for multi-tenant registration',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 24),
                    
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.danger.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.danger.withOpacity(0.3)),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: AppColors.danger, fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Input Form Fields
                    TextField(
                      controller: _companyCodeController,
                      decoration: const InputDecoration(
                        labelText: 'Company Code *',
                        prefixIcon: Icon(Icons.domain),
                        hintText: 'e.g. DINE',
                      ),
                      textCapitalization: TextCapitalization.characters,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _usernameController,
                      decoration: const InputDecoration(
                        labelText: 'Username *',
                        prefixIcon: Icon(Icons.person),
                        hintText: 'e.g. manav123',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email Address *',
                        prefixIcon: Icon(Icons.email),
                        hintText: 'e.g. client@company.com',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _mobileController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Mobile Number *',
                        prefixIcon: Icon(Icons.phone),
                        hintText: 'e.g. +91 99999 88888',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Password *',
                        prefixIcon: const Icon(Icons.lock),
                        suffixIcon: IconButton(
                          icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    ElevatedButton(
                      onPressed: _isLoading ? null : _handleSignup,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Verify & Register', style: TextStyle(fontSize: 16)),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text("Already have an account? ", style: TextStyle(color: Colors.grey)),
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Login', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
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
}
