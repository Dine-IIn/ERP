import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:provider/provider.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormBuilderState>();

  Future<void> _submit() async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final values = _formKey.currentState!.value;
      final email = values['email'] as String;
      final companyCode = values['company_code'] as String;

      final success = await Provider.of<AuthProvider>(context, listen: false).forgotPassword(
        email: email,
        companyCode: companyCode,
      );

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('OTP sent successfully to your email'),
              backgroundColor: Color(AppColors.success),
            ),
          );
          Navigator.of(context).pushNamed(
            AppRoutes.resetPassword,
            arguments: {
              'email': email,
              'companyCode': companyCode,
            },
          );
        } else {
          final error = Provider.of<AuthProvider>(context, listen: false).error;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error ?? 'Failed to request reset OTP'),
              backgroundColor: const Color(AppColors.error),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [
                        const Color(0xFF0F172A),
                        const Color(0xFF1E1B4B),
                      ]
                    : [
                        const Color(0xFFEEF2F6),
                        const Color(0xFFE0E7FF),
                      ],
              ),
            ),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppDimensions.paddingL),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 450),
                child: Card(
                  elevation: 8,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppDimensions.radiusXL),
                  ),
                  color: isDark ? const Color(AppColors.cardDark) : const Color(AppColors.cardLight),
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.paddingXL),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Back Button & Title
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back),
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                            const Expanded(
                              child: Text(
                                'Forgot Password',
                                style: TextStyle(
                                  fontSize: AppDimensions.fontXXL,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                            const SizedBox(width: 48), // Spacer to balance back button
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Enter your registered email and your company code. We will send you a verification code to reset your password.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey,
                            fontSize: AppDimensions.fontM,
                          ),
                        ),
                        const SizedBox(height: 32),
                        FormBuilder(
                          key: _formKey,
                          child: Column(
                            children: [
                              FormBuilderTextField(
                                name: 'company_code',
                                decoration: const InputDecoration(
                                  labelText: AppStrings.companyCode,
                                  prefixIcon: Icon(Icons.business),
                                  hintText: 'e.g. COMP100',
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
                                  hintText: 'e.g. john.doe@company.com',
                                ),
                                validator: FormBuilderValidators.compose([
                                  FormBuilderValidators.required(),
                                  FormBuilderValidators.email(),
                                ]),
                              ),
                              const SizedBox(height: 32),
                              Consumer<AuthProvider>(
                                builder: (context, auth, child) {
                                  return auth.isLoading
                                      ? const Center(
                                          child: CircularProgressIndicator(),
                                        )
                                      : ElevatedButton(
                                          onPressed: _submit,
                                          style: ElevatedButton.styleFrom(
                                            minimumSize: const Size.fromHeight(AppDimensions.buttonHeightM),
                                            backgroundColor: const Color(AppColors.primaryBlue),
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(AppDimensions.radiusM),
                                            ),
                                          ),
                                          child: const Text('Send Reset OTP'),
                                        );
                                },
                              ),
                            ],
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
