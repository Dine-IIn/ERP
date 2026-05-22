import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:window_manager/window_manager.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/core/utils/storage_service.dart';
import 'package:enterprise_erp/core/routes/app_router.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';
import 'package:enterprise_erp/providers/theme_provider.dart';
import 'package:enterprise_erp/providers/user_provider.dart';
import 'package:enterprise_erp/providers/company_provider.dart';
import 'package:enterprise_erp/providers/chat_provider.dart';
import 'package:enterprise_erp/providers/expense_provider.dart';
import 'package:enterprise_erp/providers/dashboard_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize storage
  await StorageService().init();

  // Initialize Desktop Window Settings
  if (!kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
    await windowManager.ensureInitialized();
    WindowOptions windowOptions = const WindowOptions(
      size: Size(1280, 800),
      minimumSize: Size(960, 640),
      center: true,
      title: 'Enterprise ERP',
    );
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  // Initialize and load theme settings
  final themeProvider = ThemeProvider();
  await themeProvider.initialize();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => themeProvider),
        ChangeNotifierProvider(create: (_) => AuthProvider()..initialize()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(create: (_) => CompanyProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()..initializeSocketListeners()),
        ChangeNotifierProvider(create: (_) => ExpenseProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: _buildLightTheme(),
      darkTheme: _buildDarkTheme(),
      themeMode: themeProvider.themeMode,
      navigatorKey: AppRouter.navigatorKey,
      onGenerateRoute: AppRouter.generateRoute,
      initialRoute: AppRoutes.splash,
    );
  }

  ThemeData _buildLightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.light(
        primary: Color(AppColors.primaryBlue),
        secondary: Color(AppColors.secondaryPurple),
        error: Color(AppColors.error),
        surface: Color(AppColors.cardLight),
      ),
      scaffoldBackgroundColor: Color(AppColors.backgroundLight),
      textTheme: GoogleFonts.interTextTheme(),
      appBarTheme: AppBarTheme(
        backgroundColor: Color(AppColors.white),
        foregroundColor: Color(AppColors.gray900),
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          fontSize: AppDimensions.fontXL,
          fontWeight: FontWeight.w600,
          color: Color(AppColors.gray900),
        ),
      ),
      cardTheme: CardThemeData(
        color: Color(AppColors.cardLight),
        elevation: AppDimensions.cardElevation,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusL),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Color(AppColors.primaryBlue),
          foregroundColor: Color(AppColors.white),
          elevation: 0,
          minimumSize: const Size(double.infinity, AppDimensions.buttonHeightM),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: AppDimensions.fontL,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Color(AppColors.primaryBlue),
          minimumSize: const Size(double.infinity, AppDimensions.buttonHeightM),
          side: BorderSide(color: Color(AppColors.primaryBlue)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: AppDimensions.fontL,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Color(AppColors.gray50),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          borderSide: BorderSide(color: Color(AppColors.gray200)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          borderSide: BorderSide(color: Color(AppColors.gray200)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          borderSide: BorderSide(color: Color(AppColors.primaryBlue), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusM),
          borderSide: BorderSide(color: Color(AppColors.error)),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppDimensions.paddingM,
          vertical: AppDimensions.paddingM,
        ),
        hintStyle: TextStyle(color: Color(AppColors.gray400)),
      ),
    );
  }

  ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: Color(AppColors.primaryLight),
        secondary: Color(AppColors.secondaryPurple),
        error: Color(AppColors.error),
        surface: Color(AppColors.cardDark),
      ),
      scaffoldBackgroundColor: Color(AppColors.backgroundDark),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      appBarTheme: AppBarTheme(
        backgroundColor: Color(AppColors.cardDark),
        foregroundColor: Color(AppColors.white),
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: Color(AppColors.cardDark),
        elevation: AppDimensions.cardElevation,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusL),
        ),
      ),
    );
  }
}
