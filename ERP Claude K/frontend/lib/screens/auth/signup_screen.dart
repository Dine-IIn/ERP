import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  bool _obscurePassword = true;

  void _submit() async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final values = _formKey.currentState!.value;
      if (values['password'] != values['confirm_password']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Passwords do not match'),
            backgroundColor: Color(AppColors.error),
          ),
        );
        return;
      }

      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      final data = await authProvider.requestSignup(
        username: values['username'],
        email: values['email'],
        mobile: values['mobile'],
        password: values['password'],
        companyCode: values['company_code'],
        verificationMethod: values['verification_method'] ?? 'email',
      );

      if (!mounted) return;

      if (data != null && data['signup_token'] != null) {
        Navigator.of(context).pushReplacementNamed(
          AppRoutes.otpVerification,
          arguments: {
            'signup_token': data['signup_token'],
            'verification_method': values['verification_method'] ?? 'email',
          },
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'Signup failed'),
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
                    colors: [Color(AppColors.primaryDark), Color(AppColors.secondaryPurple)],
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
                          Icons.domain_add,
                          size: 80,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Join our ERP Network',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Create a secure organization account or request authorization to access existing companies with multi-tenant data isolation and role-based access control.',
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
                        Center(
                          child: Icon(
                            Icons.contact_mail,
                            size: 48,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Create Account',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Sign up and begin using our modular ERP tools',
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
                                name: 'email',
                                decoration: const InputDecoration(
                                  labelText: AppStrings.email,
                                  prefixIcon: Icon(Icons.email),
                                ),
                                validator: FormBuilderValidators.compose([
                                  FormBuilderValidators.required(),
                                  FormBuilderValidators.email(),
                                ]),
                              ),
                              const SizedBox(height: 16),
                              FormBuilderTextField(
                                name: 'mobile',
                                decoration: const InputDecoration(
                                  labelText: AppStrings.mobile,
                                  prefixIcon: Icon(Icons.phone),
                                  hintText: '+1234567890',
                                ),
                                validator: FormBuilderValidators.compose([
                                  FormBuilderValidators.required(),
                                ]),
                              ),
                              const SizedBox(height: 16),
                              FormBuilderDropdown<String>(
                                name: 'verification_method',
                                initialValue: 'email',
                                decoration: const InputDecoration(
                                  labelText: 'Verification Method',
                                  prefixIcon: Icon(Icons.security),
                                ),
                                items: const [
                                  DropdownMenuItem(value: 'email', child: Text('Email Verification')),
                                  DropdownMenuItem(value: 'sms', child: Text('SMS Verification')),
                                ],
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
                              const SizedBox(height: 16),
                              FormBuilderTextField(
                                name: 'confirm_password',
                                obscureText: _obscurePassword,
                                decoration: const InputDecoration(
                                  labelText: AppStrings.confirmPassword,
                                  prefixIcon: Icon(Icons.lock_outline),
                                ),
                                validator: FormBuilderValidators.compose([
                                  FormBuilderValidators.required(),
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
                                          child: const Text(AppStrings.signUp),
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
                            child: const Text('Already have an account? Sign In'),
                          ),
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
