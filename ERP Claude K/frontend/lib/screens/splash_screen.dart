import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );
    _controller.forward();
    _navigateToNext();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _navigateToNext() async {
    // Wait for the animation and authentication check
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;
    
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    if (authProvider.isAuthenticated) {
      if (authProvider.isSuperAdmin) {
        Navigator.of(context).pushReplacementNamed(AppRoutes.superAdminDashboard);
      } else {
        Navigator.of(context).pushReplacementNamed(AppRoutes.dashboard);
      }
    } else {
      Navigator.of(context).pushReplacementNamed(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(AppColors.backgroundDark), Color(0xFF1E1B4B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ScaleTransition(
                scale: _animation,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: const Color(AppColors.primaryBlue).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(AppColors.primaryBlue).withValues(alpha: 0.3),
                      width: 2,
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.lan,
                      size: 60,
                      color: Color(AppColors.primaryBlue),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                AppConfig.appName,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enterprise-grade Management Solution',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(AppColors.gray400),
                    ),
              ),
              const SizedBox(height: 48),
              const SpinKitCubeGrid(
                color: Color(AppColors.primaryBlue),
                size: 40.0,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
