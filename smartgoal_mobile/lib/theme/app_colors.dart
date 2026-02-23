import 'package:flutter/material.dart';

/// SmartGoal app colors matching MERN client (_layout.scss)
class AppColors {
  AppColors._();

  // Form / right panel
  static const Color formBackground = Color(0xFFF8FAFC);
  static const Color formCardBg = Colors.white;
  static const Color formCardBorder = Color(0xFFF1F5F9);
  static const Color formCardShadow = Color(0x14000000);

  // Primary brand
  static const Color primary = Color(0xFF161DA3);
  static const Color primaryLight = Color(0xFF4F46E5);
  static const Color primaryDark = Color(0xFF1E40AF);
  static const Color primaryDarkHover = Color(0xFF3730A3);

  // Visual panel (left)
  static const Color visualStart = Color(0xFF1E293B);
  static const Color visualEnd = Color(0xFF334155);
  static const Color accent = Color(0xFF60A5FA);
  static const Color muted = Color(0xFFCBD5E1);
  static const Color badgeBg = Color(0x1AFFFFFF);
  static const Color badgeBorder = Color(0x33FFFFFF);
  static const Color badgeText = Color(0xFFE2E8F0);
  static const Color dot = Color(0xFF161DA3);

  // Inputs
  static const Color inputBorder = Color(0xFFE2E8F0);
  static const Color inputFocusBorder = primary;
  static const Color inputFocusShadow = Color(0x26161DA3);

  // Text
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textMuted = Color(0xFF64748B);
  static const Color textLabel = Color(0xFF1E293B);

  // Buttons
  static const Color googleBtnBg = Colors.white;
  static const Color googleBtnBorder = Color(0xFFE2E8F0);
  static const Color googleBtnText = Color(0xFF475569);

  // Validation
  static const Color success = Color(0xFF22C55E);
  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFEAB308);
}
