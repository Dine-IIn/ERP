class ExpenseModel {
  final String id;
  final String companyId;
  final String userId;
  final double amount;
  final String category;
  final String description;
  final String status; // 'pending', 'approved', 'rejected'
  final String? approvedBy;
  final Map<String, dynamic>? splitDetails;
  final List<String>? tags;
  final DateTime createdAt;

  ExpenseModel({
    required this.id,
    required this.companyId,
    required this.userId,
    required this.amount,
    required this.category,
    required this.description,
    required this.status,
    this.approvedBy,
    this.splitDetails,
    this.tags,
    required this.createdAt,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['id']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      category: json['category']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      approvedBy: json['approved_by']?.toString(),
      splitDetails: json['split_details'] as Map<String, dynamic>?,
      tags: (json['tags'] as List?)?.map((e) => e.toString()).toList(),
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'].toString()) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'company_id': companyId,
      'user_id': userId,
      'amount': amount,
      'category': category,
      'description': description,
      'status': status,
      'approved_by': approvedBy,
      'split_details': splitDetails,
      'tags': tags,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
