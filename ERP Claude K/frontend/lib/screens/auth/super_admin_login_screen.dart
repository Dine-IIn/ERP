import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class SuperAdminLoginScreen extends StatefulWidget {
  const SuperAdminLoginScreen({super.key});

  @override
  State<SuperAdminLoginScreen> createState() => _SuperAdminLoginScreenState();
}

class _SuperAdminLoginScreenState extends State<SuperAdminLoginScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  bool _obscurePassword = true;

  void _submit() async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final values = _formKey.currentState!.value;
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      final success = await authProvider.superAdminLogin(
        username: values['username'],
        password: values['password'],
      );

      if (!mounted) return;

      if (success) {
        Navigator.of(context).pushReplacementNamed(AppRoutes.superAdminDashboard);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'Super admin authentication failed'),
            backgroundColor: const Color(AppColors.error),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Super Admin Portal'),
        backgroundColor: Colors.transparent,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(AppDimensions.radiusL),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Center(
                  child: Icon(
                    Icons.admin_panel_settings,
                    size: 64,
                    color: Color(AppColors.secondaryPurple),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Super Admin Login',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Access global tenant settings, billing, companies, and database maintenance tools.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: const Color(AppColors.gray500),
                      ),
                ),
                const SizedBox(height: 32),
                FormBuilder(
                  key: _formKey,
                  child: Column(
                    children: [
                      FormBuilderTextField(
                        name: 'username',
                        decoration: const InputDecoration(
                          labelText: 'Super Admin Username',
                          prefixIcon: Icon(Icons.security),
                        ),
                        validator: FormBuilderValidators.compose([
                          FormBuilderValidators.required(),
                        ]),
                      ),
                      const SizedBox(height: 16),
                      FormBuilderTextField(
                        name: 'password',
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: AppStrings.password,
                          prefixIcon: const Icon(Icons.lock),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                        ),
                        validator: FormBuilderValidators.compose([
                          FormBuilderValidators.required(),
                          FormBuilderValidators.minLength(6),
                        ]),
                      ),
                      const SizedBox(height: 24),
                      Consumer<AuthProvider>(
                        builder: (context, auth, child) {
                          return auth.isLoading
                              ? const Center(
                                  child: CircularProgressIndicator(),
                                )
                              : ElevatedButton(
                                  onPressed: _submit,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(AppColors.secondaryPurple),
                                  ),
                                  child: const Text('Login As Super Admin'),
                                );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: TextButton(
                    onPressed: () {
                      Navigator.of(context).pushReplacementNamed(AppRoutes.login);
                    },
                    child: const Text('Back to Regular Login'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
