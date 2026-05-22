import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../theme/app_colors.dart';
import '../erp_dashboard.dart';
import 'login_screen.dart';

class OtpScreen extends StatefulWidget {
  final String username;
  const OtpScreen({super.key, required this.username});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpController = TextEditingController();
  String? _errorMessage;
  bool _isLoading = false;
  bool _otpSentToEmail = true; // User can choose to send via Email or Mobile

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _verifyOtp() {
    setState(() {
      _errorMessage = null;
      _isLoading = true;
    });

    final success = AppState().verifyOtp(widget.username, _otpController.text.trim());

    setState(() {
      _isLoading = false;
    });

    if (success) {
      // Auto login successful, navigate to Dashboard
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account verified successfully! Welcome to your ERP.'),
          backgroundColor: AppColors.accent,
        ),
      );
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const ERPDashboard()),
        (route) => false,
      );
    } else {
      setState(() {
        _errorMessage = 'Invalid OTP code. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);
    final simulatedOtp = AppState().getPendingOtpForUser(widget.username);

    return Scaffold(
      body: Container(
        decoration: dark ? const BoxDecoration(gradient: AppColors.darkVibeGradient) : null,
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 450),
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: AppColors.glassDecoration(context, radius: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Otp Icon
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.security_outlined,
                          size: 48,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Security Verification',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'We have sent a verification code to check your registration validity.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey[400], fontSize: 13),
                    ),
                    const SizedBox(height: 24),

                    // Choice of Channel
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: dark ? AppColors.darkSurface : Colors.grey[200],
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _otpSentToEmail = true),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _otpSentToEmail ? AppColors.primary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Email OTP',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: _otpSentToEmail ? Colors.white : (dark ? Colors.grey : Colors.black87),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _otpSentToEmail = false),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: !_otpSentToEmail ? AppColors.primary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Mobile SMS OTP',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: !_otpSentToEmail ? Colors.white : (dark ? Colors.grey : Colors.black87),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // SIMULATED GATEWAY CARD (WOW UI element for smooth testing)
                    if (simulatedOtp != null) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.accent.withOpacity(0.2), width: 1.5),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _otpSentToEmail ? Icons.email_outlined : Icons.sms_outlined,
                                  color: AppColors.accent,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _otpSentToEmail ? 'Mock Email Gateway' : 'Mock SMS Gateway',
                                  style: const TextStyle(
                                    color: AppColors.accent,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Verification Code: $simulatedOtp',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.danger.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: AppColors.danger, fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // OTP Input Fields
                    TextField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 6,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 6),
                      decoration: const InputDecoration(
                        hintText: '000000',
                        counterText: '',
                        prefixIcon: Icon(Icons.password),
                      ),
                    ),
                    const SizedBox(height: 24),

                    ElevatedButton(
                      onPressed: _isLoading ? null : _verifyOtp,
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
                          : const Text('Verify Account', style: TextStyle(fontSize: 16)),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (context) => const LoginScreen()),
                        );
                      },
                      child: const Text('Cancel & Return to Login', style: TextStyle(color: Colors.grey)),
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
