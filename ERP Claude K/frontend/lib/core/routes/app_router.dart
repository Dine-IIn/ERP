import 'package:flutter/material.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/core/utils/storage_service.dart';
import 'package:enterprise_erp/screens/splash_screen.dart';
import 'package:enterprise_erp/screens/auth/login_screen.dart';
import 'package:enterprise_erp/screens/auth/signup_screen.dart';
import 'package:enterprise_erp/screens/auth/otp_verification_screen.dart';
import 'package:enterprise_erp/screens/auth/super_admin_login_screen.dart';
import 'package:enterprise_erp/screens/auth/forgot_password_screen.dart';
import 'package:enterprise_erp/screens/auth/reset_password_screen.dart';
import 'package:enterprise_erp/screens/dashboard/dashboard_screen.dart';
import 'package:enterprise_erp/screens/super_admin/super_admin_dashboard.dart';

class AppRouter {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  
  static Route<dynamic> generateRoute(RouteSettings settings) {
    debugPrint('Navigating to: ${settings.name}');
    
    // Evaluate cached authentication credentials instantly via storage provider
    final token = StorageService().getString(AppConfig.authTokenKey);
    final isAuthenticated = token != null && token.isNotEmpty;
    
    switch (settings.name) {
      case AppRoutes.splash:
        return MaterialPageRoute(builder: (_) => const SplashScreen());
        
      case AppRoutes.login:
        if (isAuthenticated) {
          return MaterialPageRoute(builder: (_) => const DashboardScreen());
        }
        return MaterialPageRoute(builder: (_) => const LoginScreen());
        
      case AppRoutes.signup:
        return MaterialPageRoute(builder: (_) => const SignupScreen());
        
      case AppRoutes.otpVerification:
        return MaterialPageRoute(builder: (_) => const OTPVerificationScreen());
        
      case AppRoutes.superAdminLogin:
        if (isAuthenticated) {
          return MaterialPageRoute(builder: (_) => const SuperAdminDashboard());
        }
        return MaterialPageRoute(builder: (_) => const SuperAdminLoginScreen());

      case AppRoutes.forgotPassword:
        return MaterialPageRoute(builder: (_) => const ForgotPasswordScreen());

      case AppRoutes.resetPassword:
        return MaterialPageRoute(builder: (_) => const ResetPasswordScreen(), settings: settings);
        
      case AppRoutes.dashboard:
        if (!isAuthenticated) {
          return MaterialPageRoute(builder: (_) => const LoginScreen());
        }
        return MaterialPageRoute(builder: (_) => const DashboardScreen());
        
      case AppRoutes.superAdminDashboard:
        if (!isAuthenticated) {
          return MaterialPageRoute(builder: (_) => const SuperAdminLoginScreen());
        }
        return MaterialPageRoute(builder: (_) => const SuperAdminDashboard());
        
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('No route defined for ${settings.name}'),
            ),
          ),
        );
    }
  }
}
