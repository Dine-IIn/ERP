class CompanyModel {
  final String id;
  final String name;
  final String code;
  final String? subscriptionPlan;
  final bool isActive;
  final Map<String, dynamic>? settings;
  final Map<String, dynamic>? taxData;

  CompanyModel({
    required this.id,
    required this.name,
    required this.code,
    this.subscriptionPlan,
    required this.isActive,
    this.settings,
    this.taxData,
  });

  factory CompanyModel.fromJson(Map<String, dynamic> json) {
    return CompanyModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      subscriptionPlan: json['subscription_plan']?.toString() ?? 'basic',
      isActive: json['is_active'] as bool? ?? true,
      settings: json['settings'] as Map<String, dynamic>?,
      taxData: json['tax_data'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'code': code,
      'subscription_plan': subscriptionPlan,
      'is_active': isActive,
      'settings': settings,
      'tax_data': taxData,
    };
  }
}
