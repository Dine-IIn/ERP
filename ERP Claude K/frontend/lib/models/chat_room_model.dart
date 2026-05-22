class ChatRoomModel {
  final String id;
  final String name;
  final String companyId;
  final String type; // 'direct', 'group', 'department', 'expense'
  final String? department;
  final String? expenseId;
  final DateTime createdAt;

  ChatRoomModel({
    required this.id,
    required this.name,
    required this.companyId,
    required this.type,
    this.department,
    this.expenseId,
    required this.createdAt,
  });

  factory ChatRoomModel.fromJson(Map<String, dynamic> json) {
    return ChatRoomModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'group',
      department: json['department']?.toString(),
      expenseId: json['expense_id']?.toString(),
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'].toString()) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'company_id': companyId,
      'name': name,
      'type': type,
      'department': department,
      'expense_id': expenseId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
