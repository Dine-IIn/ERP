enum ChatType { general, expense }

class ChatGroup {
  final String id;
  final String name;
  final List<String> members; // Usernames in group
  final String companyCode;
  final String createdBy;
  final DateTime createdAt;
  final bool enableP2PTransfers;
  final bool isDefaultGroup;

  ChatGroup({
    required this.id,
    required this.name,
    required this.members,
    required this.companyCode,
    required this.createdBy,
    required this.createdAt,
    this.enableP2PTransfers = true,
    this.isDefaultGroup = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'members': members,
        'companyCode': companyCode,
        'createdBy': createdBy,
        'createdAt': createdAt.toIso8601String(),
        'enableP2PTransfers': enableP2PTransfers,
        'isDefaultGroup': isDefaultGroup,
      };

  factory ChatGroup.fromJson(Map<String, dynamic> json) => ChatGroup(
        id: json['id'],
        name: json['name'],
        members: List<String>.from(json['members']),
        companyCode: json['companyCode'],
        createdBy: json['createdBy'],
        createdAt: DateTime.parse(json['createdAt']),
        enableP2PTransfers: json['enableP2PTransfers'] ?? true,
        isDefaultGroup: json['isDefaultGroup'] ?? false,
      );
}

class GroupTransfer {
  final String id;
  final String groupId;
  final String fromUser; // sender username
  final String toUser;   // recipient username
  final double amount;
  final DateTime timestamp;
  final String companyCode;

  GroupTransfer({
    required this.id,
    required this.groupId,
    required this.fromUser,
    required this.toUser,
    required this.amount,
    required this.timestamp,
    required this.companyCode,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'groupId': groupId,
        'fromUser': fromUser,
        'toUser': toUser,
        'amount': amount,
        'timestamp': timestamp.toIso8601String(),
        'companyCode': companyCode,
      };

  factory GroupTransfer.fromJson(Map<String, dynamic> json) => GroupTransfer(
        id: json['id'],
        groupId: json['groupId'],
        fromUser: json['fromUser'],
        toUser: json['toUser'],
        amount: (json['amount'] as num).toDouble(),
        timestamp: DateTime.parse(json['timestamp']),
        companyCode: json['companyCode'],
      );
}

class ChatMessage {
  final String id;
  final String sender; // username
  final String content;
  final DateTime timestamp;
  final String companyCode;
  final ChatType chatType;
  final String? linkedExpenseId; // References Expense.id if this is an expense log event
  final String? groupId; // Links to ChatGroup.id if this belongs to a specific group

  ChatMessage({
    required this.id,
    required this.sender,
    required this.content,
    required this.timestamp,
    required this.companyCode,
    this.chatType = ChatType.general,
    this.linkedExpenseId,
    this.groupId,
  });

  bool get isExpenseLog => linkedExpenseId != null;

  Map<String, dynamic> toJson() => {
        'id': id,
        'sender': sender,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        'companyCode': companyCode,
        'chatType': chatType.toString(),
        'linkedExpenseId': linkedExpenseId,
        'groupId': groupId,
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    // Determine ChatType from string
    final typeStr = json['chatType'] ?? 'ChatType.general';
    final chatType = typeStr == 'ChatType.expense' ? ChatType.expense : ChatType.general;

    return ChatMessage(
      id: json['id'],
      sender: json['sender'],
      content: json['content'],
      timestamp: DateTime.parse(json['timestamp']),
      companyCode: json['companyCode'],
      chatType: chatType,
      linkedExpenseId: json['linkedExpenseId'],
      groupId: json['groupId'],
    );
  }
}
