import 'package:flutter/material.dart';

class AppColors {
  // Theme Toggles
  static bool isDark(BuildContext context) => Theme.of(context).brightness == Brightness.dark;

  // Classic SAP Light Theme Colors (Corporate Blue, flat grey backgrounds)
  static const Color darkBg = Color(0xFF1E1E1E);
  static const Color darkSurface = Color(0xFF252525);
  static const Color darkCard = Color(0xFF2D2D2D);
  static const Color darkBorder = Color(0xFF3D3D3D);
  
  static const Color lightBg = Color(0xFFF4F6F9); // SAP Light Grey Background
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFCCCCCC); // SAP Neutral Grey Border

  // Accents (Harmonious Corporate SAP Palette)
  static const Color primary = Color(0xFF0A6ED1);      // Classic SAP Corporate Blue
  static const Color secondary = Color(0xFF58626E);    // SAP Slate/Cool Grey
  static const Color accent = Color(0xFF107F3E);       // SAP Success Green
  static const Color warning = Color(0xFFE9701E);      // SAP Warning Orange
  static const Color danger = Color(0xFFBB0000);       // SAP Error Red

  // Dynamic Accents that check active context theme
  static Color getPrimary(BuildContext context) => Theme.of(context).primaryColor;
  static Color getSecondary(BuildContext context) => Theme.of(context).colorScheme.secondary;

  // Linear Gradients: Using very flat, solid, professional shades for SAP
  static const Gradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0A6ED1), Color(0xFF0854A1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Gradient getPrimaryGradient(BuildContext context) {
    final p = Theme.of(context).primaryColor;
    return LinearGradient(
      colors: [p, p.withOpacity(0.9)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  static const Gradient accentGradient = LinearGradient(
    colors: [Color(0xFF107F3E), Color(0xFF0B592B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const Gradient secondaryGradient = LinearGradient(
    colors: [Color(0xFF58626E), Color(0xFF3D454E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Gradient getSecondaryGradient(BuildContext context) {
    final s = Theme.of(context).colorScheme.secondary;
    return LinearGradient(
      colors: [s, s.withOpacity(0.9)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  static const Gradient darkVibeGradient = LinearGradient(
    colors: [Color(0xFF1E1E1E), Color(0xFF252525)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // SAP Border Decoration: Flat background, sharp neutral border, no drop shadows, 4px corners
  static BoxDecoration sapBorderDecoration(BuildContext context, {double radius = 4, bool hasBorder = true}) {
    final dark = isDark(context);
    return BoxDecoration(
      color: dark ? const Color(0xFF2D2D2D) : Colors.white,
      borderRadius: BorderRadius.circular(radius),
      border: hasBorder 
          ? Border.all(
              color: dark ? const Color(0xFF3D3D3D) : const Color(0xFFCCCCCC),
              width: 1.5,
            )
          : null,
    );
  }

  // Backward compatibility alias: redirects transparent/glassmorphic styling to flat solid SAP borders!
  static BoxDecoration glassDecoration(BuildContext context, {double radius = 4, bool hasBorder = true}) {
    return sapBorderDecoration(context, radius: radius, hasBorder: hasBorder);
  }
}

