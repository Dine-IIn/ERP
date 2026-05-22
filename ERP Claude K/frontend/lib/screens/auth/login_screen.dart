import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  bool _obscurePassword = true;

  void _submit() async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final values = _formKey.currentState!.value;
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      final success = await authProvider.login(
        username: values['username'],
        password: values['password'],
        companyCode: values['company_code'],
      );

      if (!mounted) return;

      if (success) {
        Navigator.of(context).pushReplacementNamed(AppRoutes.dashboard);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'Authentication failed'),
            backgroundColor: const Color(AppColors.error),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 800;

    return Scaffold(
      body: Row(
        children: [
          // Left Banner side for Desktop
          if (isDesktop)
            Expanded(
              flex: 5,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(AppColors.primaryDark), Color(AppColors.primaryBlue)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(48.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.business_center,
                          size: 80,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Welcome to ${AppConfig.appName}',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Manage your sales, inventory, CRM, HR and finance seamlessly in one unified cloud system built for enterprises.',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Colors.white70,
                                fontWeight: FontWeight.normal,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          // Right Form side
          Expanded(
            flex: 4,
            child: Container(
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(AppColors.backgroundDark)
                  : Colors.white,
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(32.0),
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Logo
                        Center(
                          child: Icon(
                            Icons.lan,
                            size: 48,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Account Sign In',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Enter your credentials to access your ERP portal',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: const Color(AppColors.gray500),
                              ),
                        ),
                        const SizedBox(height: 32),
                        FormBuilder(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              FormBuilderTextField(
                                name: 'company_code',
                                decoration: const InputDecoration(
                                  labelText: AppStrings.companyCode,
                                  prefixIcon: Icon(Icons.domain),
                                  hintText: 'e.g. COMP100',
                                ),
                                validator: FormBuilderValidators.compose([
                                  FormBuilderValidators.required(),
                                ]),
                              ),
                              const SizedBox(height: 16),
                              FormBuilderTextField(
                                name: 'username',
                                decoration: const InputDecoration(
                                  labelText: AppStrings.username,
                                  prefixIcon: Icon(Icons.person),
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
                              const SizedBox(height: 8),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () {
                                    Navigator.of(context).pushNamed(AppRoutes.forgotPassword);
                                  },
                                  child: const Text(AppStrings.forgotPassword),
                                ),
                              ),
                              const SizedBox(height: 16),
                              Consumer<AuthProvider>(
                                builder: (context, auth, child) {
                                  return auth.isLoading
                                      ? const Center(
                                          child: CircularProgressIndicator(),
                                        )
                                      : ElevatedButton(
                                          onPressed: _submit,
                                          child: const Text(AppStrings.signIn),
                                        );
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).pushNamed(AppRoutes.signup);
                              },
                              child: const Text(AppStrings.signUp),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).pushNamed(AppRoutes.superAdminLogin);
                              },
                              child: const Text('Super Admin'),
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
        ],
      ),
    );
  }
}
