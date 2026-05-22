import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class OTPVerificationScreen extends StatefulWidget {
  const OTPVerificationScreen({super.key});

  @override
  State<OTPVerificationScreen> createState() => _OTPVerificationScreenState();
}

class _OTPVerificationScreenState extends State<OTPVerificationScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  String? _signupToken;
  String? _verificationMethod;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Retrieve arguments sent from signup screen
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null) {
      _signupToken = args['signup_token'];
      _verificationMethod = args['verification_method'];
    }
  }

  void _submit() async {
    if (_signupToken == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error: Missing signup token. Please register again.'),
          backgroundColor: Color(AppColors.error),
        ),
      );
      return;
    }

    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final values = _formKey.currentState!.value;
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      final success = await authProvider.verifySignup(
        signupToken: _signupToken!,
        otpCode: values['otp_code'],
        verificationMethod: _verificationMethod ?? 'email',
      );

      if (!mounted) return;

      if (success) {
        Navigator.of(context).pushNamedAndRemoveUntil(
          AppRoutes.dashboard,
          (route) => false,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'OTP Verification failed'),
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
        title: const Text('Security Verification'),
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
                    Icons.security,
                    size: 64,
                    color: Color(AppColors.primaryBlue),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Verify Your Identity',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  _verificationMethod == 'sms'
                      ? 'An OTP (One-Time Password) code has been sent to your mobile phone via SMS. Please enter it below.'
                      : 'An OTP (One-Time Password) code has been sent to your email address. Please check your inbox.',
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
                        name: 'otp_code',
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              letterSpacing: 8,
                              fontWeight: FontWeight.bold,
                            ),
                        decoration: const InputDecoration(
                          labelText: '6-Digit Verification Code',
                          prefixIcon: Icon(Icons.password),
                          hintText: '000000',
                        ),
                        validator: FormBuilderValidators.compose([
                          FormBuilderValidators.required(),
                          FormBuilderValidators.numeric(),
                          FormBuilderValidators.minLength(6),
                          FormBuilderValidators.maxLength(6),
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
                                  child: const Text('Verify & Finish'),
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
                    child: const Text('Cancel and back to login'),
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
