class Expense {
  final String id;
  final String description;
  final double amount;
  final String category; // Travel, Food, Hardware, Raw Material, Machinery, Other
  final String companyCode;
  final String loggedBy; // username of user
  final DateTime date;
  final bool isGroupExpense;
  final List<String> sharedWith; // usernames to split with (empty if individual)
  final String? groupId; // Link to ChatGroup.id if this is a group expense

  Expense({
    required this.id,
    required this.description,
    required this.amount,
    required this.category,
    required this.companyCode,
    required this.loggedBy,
    required this.date,
    this.isGroupExpense = false,
    this.sharedWith = const [],
    this.groupId,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'description': description,
        'amount': amount,
        'category': category,
        'companyCode': companyCode,
        'loggedBy': loggedBy,
        'date': date.toIso8601String(),
        'isGroupExpense': isGroupExpense,
        'sharedWith': sharedWith,
        'groupId': groupId,
      };

  factory Expense.fromJson(Map<String, dynamic> json) => Expense(
        id: json['id'],
        description: json['description'],
        amount: (json['amount'] as num).toDouble(),
        category: json['category'],
        companyCode: json['companyCode'],
        loggedBy: json['loggedBy'],
        date: DateTime.parse(json['date']),
        isGroupExpense: json['isGroupExpense'] ?? false,
        sharedWith: List<String>.from(json['sharedWith'] ?? []),
        groupId: json['groupId'],
      );
}
