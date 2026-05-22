class RoleModel {
  final String id;
  final String name;
  final String companyId;
  final Map<String, dynamic> permissions; // JSON permission matrix

  RoleModel({
    required this.id,
    required this.name,
    required this.companyId,
    required this.permissions,
  });

  factory RoleModel.fromJson(Map<String, dynamic> json) {
    return RoleModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      permissions: json['permissions'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'company_id': companyId,
      'permissions': permissions,
    };
  }
}
