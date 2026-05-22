import 'package:flutter/material.dart';
import 'screens/auth/login_screen.dart';
import 'theme/app_theme.dart';
import 'app_state.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AntiGravityERPApp());
}

class AntiGravityERPApp extends StatelessWidget {
  const AntiGravityERPApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppState(),
      builder: (context, _) {
        final state = AppState();
        final company = state.currentCompany;
        
        Color? primary;
        Color? secondary;
        if (company != null && company.primaryColorHex != null) {
          try {
            primary = Color(int.parse(company.primaryColorHex!));
          } catch (_) {}
        }
        if (company != null && company.secondaryColorHex != null) {
          try {
            secondary = Color(int.parse(company.secondaryColorHex!));
          } catch (_) {}
        }

        return MaterialApp(
          title: 'AntiGravity ERP Suite',
          debugShowCheckedModeBanner: false,
          themeMode: ThemeMode.light, // Defaulting to light theme for professional corporate SAP Portal look
          theme: AppTheme.buildTheme(isDark: false, primary: primary, secondary: secondary),
          darkTheme: AppTheme.buildTheme(isDark: true, primary: primary, secondary: secondary),
          home: const LoginScreen(),
        );
      },
    );
  }
}

