class UserRole {
  final String name; // e.g., "Sales Lead", "Inventory Officer"
  final String companyCode;
  final List<String> permittedModuleIds; // Sub-array of company's active modules

  UserRole({
    required this.name,
    required this.companyCode,
    required this.permittedModuleIds,
  });
}

class ERPUser {
  final String username;
  final String email;
  final String mobile;
  final String password;
  final String companyCode;
  final String role; // 'superadmin', 'admin', or any custom UserRole.name
  final List<String> permittedModuleIds; // Active modules accessible to this user
  final bool isVerified;
  final DateTime createdAt;

  ERPUser({
    required this.username,
    required this.email,
    required this.mobile,
    required this.password,
    required this.companyCode,
    required this.role,
    required this.permittedModuleIds,
    this.isVerified = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  bool get isSuperAdmin => role == 'superadmin';
  bool get isCompanyAdmin => role == 'admin';

  ERPUser copyWith({
    String? email,
    String? mobile,
    String? password,
    String? role,
    List<String>? permittedModuleIds,
    bool? isVerified,
  }) {
    return ERPUser(
      username: username,
      email: email ?? this.email,
      mobile: mobile ?? this.mobile,
      password: password ?? this.password,
      companyCode: companyCode,
      role: role ?? this.role,
      permittedModuleIds: permittedModuleIds ?? this.permittedModuleIds,
      isVerified: isVerified ?? this.isVerified,
      createdAt: createdAt,
    );
  }
}
