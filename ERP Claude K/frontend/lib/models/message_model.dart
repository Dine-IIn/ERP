class MessageModel {
  final String id;
  final String roomId;
  final String userId;
  final String username;
  final String content;
  final List<String>? attachments;
  final Map<String, dynamic>? readBy; // userId -> timestamp
  final DateTime createdAt;

  MessageModel({
    required this.id,
    required this.roomId,
    required this.userId,
    required this.username,
    required this.content,
    this.attachments,
    this.readBy,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id']?.toString() ?? '',
      roomId: json['room_id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      attachments: (json['attachments'] as List?)?.map((e) => e.toString()).toList(),
      readBy: json['read_by'] as Map<String, dynamic>?,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'].toString()) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'room_id': roomId,
      'user_id': userId,
      'username': username,
      'content': content,
      'attachments': attachments,
      'read_by': readBy,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
