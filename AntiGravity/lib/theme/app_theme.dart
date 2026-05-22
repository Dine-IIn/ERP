import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get lightTheme => buildTheme(isDark: false);
  static ThemeData get darkTheme => buildTheme(isDark: true);

  static ThemeData buildTheme({required bool isDark, Color? primary, Color? secondary}) {
    final basePrimary = primary ?? AppColors.primary;
    final baseSecondary = secondary ?? AppColors.secondary;

    if (isDark) {
      return ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.darkBg,
        primaryColor: basePrimary,
        cardColor: AppColors.darkCard,
        dividerColor: AppColors.darkBorder,
        colorScheme: ColorScheme.dark(
          primary: basePrimary,
          secondary: baseSecondary,
          surface: AppColors.darkSurface,
          error: AppColors.danger,
        ),
        fontFamily: 'Roboto',
        cardTheme: CardThemeData(
          color: AppColors.darkCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
            side: const BorderSide(color: AppColors.darkBorder, width: 1.2),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.darkSurface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: AppColors.darkBorder, width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: AppColors.darkBorder, width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: BorderSide(color: basePrimary, width: 2),
          ),
          hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: basePrimary,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
        ),
      );
    } else {
      return ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.lightBg,
        primaryColor: basePrimary,
        cardColor: AppColors.lightCard,
        dividerColor: AppColors.lightBorder,
        colorScheme: ColorScheme.light(
          primary: basePrimary,
          secondary: baseSecondary,
          surface: AppColors.lightSurface,
          error: AppColors.danger,
        ),
        fontFamily: 'Roboto', // Custom fallback if Google Fonts is not present
        cardTheme: CardThemeData(
          color: AppColors.lightCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
            side: const BorderSide(color: AppColors.lightBorder, width: 1.2),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: AppColors.lightBorder, width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: AppColors.lightBorder, width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: BorderSide(color: basePrimary, width: 2),
          ),
          hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: basePrimary,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
        ),
      );
    }
  }
}

