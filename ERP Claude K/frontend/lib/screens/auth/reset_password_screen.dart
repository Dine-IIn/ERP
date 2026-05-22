import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:provider/provider.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  Future<void> _submit(String email, String companyCode) async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final values = _formKey.currentState!.value;
      final otpCode = values['otp_code'] as String;
      final newPassword = values['new_password'] as String;
      final confirmPassword = values['confirm_password'] as String;

      if (newPassword != confirmPassword) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Passwords do not match'),
            backgroundColor: Color(AppColors.error),
          ),
        );
        return;
      }

      final success = await Provider.of<AuthProvider>(context, listen: false).resetPassword(
        email: email,
        companyCode: companyCode,
        otpCode: otpCode,
        newPassword: newPassword,
      );

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Password reset successful! Please sign in.'),
              backgroundColor: Color(AppColors.success),
            ),
          );
          Navigator.of(context).pushNamedAndRemoveUntil(
            AppRoutes.login,
            (route) => false,
          );
        } else {
          final error = Provider.of<AuthProvider>(context, listen: false).error;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error ?? 'Password reset failed'),
              backgroundColor: const Color(AppColors.error),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, String>?;
    final email = args?['email'] ?? '';
    final companyCode = args?['companyCode'] ?? '';

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
                                'Reset Password',
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
                        Text(
                          'An OTP code was sent to your email:\n$email\nEnter the code below along with your new password.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
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
                                name: 'otp_code',
                                decoration: const InputDecoration(
                                  labelText: AppStrings.otpCode,
                                  prefixIcon: Icon(Icons.security),
                                  hintText: 'Enter 6-digit OTP code',
                                ),
                                validator: FormBuilderValidators.compose([
                                  FormBuilderValidators.required(),
                                  FormBuilderValidators.numeric(),
                                  FormBuilderValidators.minLength(6),
                                  FormBuilderValidators.maxLength(6),
                                ]),
                                keyboardType: TextInputType.number,
                              ),
                              const SizedBox(height: 16),
                              FormBuilderTextField(
                                name: 'new_password',
                                obscureText: _obscurePassword,
                                decoration: InputDecoration(
                                  labelText: 'New Password',
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
                                obscureText: _obscureConfirmPassword,
                                decoration: InputDecoration(
                                  labelText: 'Confirm New Password',
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscureConfirmPassword ? Icons.visibility_off : Icons.visibility,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _obscureConfirmPassword = !_obscureConfirmPassword;
                                      });
                                    },
                                  ),
                                ),
                                validator: FormBuilderValidators.compose([
                                  FormBuilderValidators.required(),
                                  FormBuilderValidators.minLength(6),
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
                                          onPressed: () => _submit(email, companyCode),
                                          style: ElevatedButton.styleFrom(
                                            minimumSize: const Size.fromHeight(AppDimensions.buttonHeightM),
                                            backgroundColor: const Color(AppColors.primaryBlue),
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(AppDimensions.radiusM),
                                            ),
                                          ),
                                          child: const Text('Reset Password'),
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
