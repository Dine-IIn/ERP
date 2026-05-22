class UserModel {
  final String id;
  final String username;
  final String email;
  final String mobile;
  final String? employeeId;
  final String? department;
  final String roleId;
  final String companyId;
  final String userType; // 'super_admin' or 'company_user'
  final bool isVerified;
  final Map<String, dynamic>? profile;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    required this.mobile,
    this.employeeId,
    this.department,
    required this.roleId,
    required this.companyId,
    required this.userType,
    required this.isVerified,
    this.profile,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      mobile: json['mobile']?.toString() ?? '',
      employeeId: json['employee_id']?.toString(),
      department: json['department']?.toString(),
      roleId: json['role_id']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      userType: json['user_type']?.toString() ?? 'company_user',
      isVerified: json['is_verified'] as bool? ?? false,
      profile: json['profile'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'mobile': mobile,
      'employee_id': employeeId,
      'department': department,
      'role_id': roleId,
      'company_id': companyId,
      'user_type': userType,
      'is_verified': isVerified,
      'profile': profile,
    };
  }
}
