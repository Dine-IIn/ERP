enum SubscriptionTier { standard, professional, enterprise, custom }

class Company {
  final String name;
  final String code; // e.g. "DINE"
  final String email;
  final String mobile;
  final SubscriptionTier subscriptionTier;
  final List<String> activeModuleIds; // Gated modules
  final DateTime createdAt;
  final String? primaryColorHex;
  final String? secondaryColorHex;

  Company({
    required this.name,
    required this.code,
    required this.email,
    required this.mobile,
    this.subscriptionTier = SubscriptionTier.standard,
    required this.activeModuleIds,
    DateTime? createdAt,
    this.primaryColorHex,
    this.secondaryColorHex,
  }) : createdAt = createdAt ?? DateTime.now();

  String get tierName {
    switch (subscriptionTier) {
      case SubscriptionTier.standard:
        return 'Standard';
      case SubscriptionTier.professional:
        return 'Professional';
      case SubscriptionTier.enterprise:
        return 'Enterprise';
      case SubscriptionTier.custom:
        return 'Custom / Enterprise+';
    }
  }

  // Generate default modules for a subscription tier
  static List<String> getDefaultModulesForTier(SubscriptionTier tier) {
    switch (tier) {
      case SubscriptionTier.standard:
        return ['admin', 'communication', 'sales', 'crm'];
      case SubscriptionTier.professional:
        return ['admin', 'communication', 'sales', 'crm', 'purchase', 'inventory', 'finance', 'hrm', 'project'];
      case SubscriptionTier.enterprise:
      case SubscriptionTier.custom:
        return [
          'admin', 'crm', 'sales', 'purchase', 'inventory', 'manufacturing', 
          'finance', 'hrm', 'project', 'scm', 'qms', 'maintenance', 'pos', 
          'ecommerce', 'analytics', 'communication', 'ai', 'security', 'mobile', 'industry'
        ];
    }
  }

  Company copyWith({
    String? name,
    String? email,
    String? mobile,
    SubscriptionTier? subscriptionTier,
    List<String>? activeModuleIds,
    String? primaryColorHex,
    String? secondaryColorHex,
  }) {
    return Company(
      name: name ?? this.name,
      code: code,
      email: email ?? this.email,
      mobile: mobile ?? this.mobile,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      activeModuleIds: activeModuleIds ?? this.activeModuleIds,
      createdAt: createdAt,
      primaryColorHex: primaryColorHex ?? this.primaryColorHex,
      secondaryColorHex: secondaryColorHex ?? this.secondaryColorHex,
    );
  }
}

