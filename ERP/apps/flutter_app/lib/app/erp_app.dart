import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/admin/presentation/super_admin_screen.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/auth/presentation/login_screen.dart';

final _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/super-admin',
      builder: (context, state) => const SuperAdminScreen(),
    ),
  ],
);

class ErpApp extends StatelessWidget {
  const ErpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Enterprise ERP',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        useMaterial3: true,
      ),
      routerConfig: _router,
    );
  }
}
