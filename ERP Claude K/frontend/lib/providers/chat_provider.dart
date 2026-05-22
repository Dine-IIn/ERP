import 'package:flutter/foundation.dart';
import 'package:enterprise_erp/models/chat_room_model.dart';
import 'package:enterprise_erp/models/message_model.dart';
import 'package:enterprise_erp/core/services/api_service.dart';
import 'package:enterprise_erp/core/services/socket_service.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';

class ChatProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  final SocketService _socket = SocketService();

  List<ChatRoomModel> _rooms = [];
  final Map<String, List<MessageModel>> _roomMessages = {};
  bool _isLoading = false;
  String? _error;
  String? _activeRoomId;
  String? _typingUserName;

  List<ChatRoomModel> get rooms => _rooms;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get activeRoomId => _activeRoomId;
  String? get typingUserName => _typingUserName;

  List<MessageModel> getActiveMessages() {
    if (_activeRoomId == null) return [];
    return _roomMessages[_activeRoomId] ?? [];
  }

  // Set active room and fetch history
  Future<void> setActiveRoom(String roomId) async {
    _activeRoomId = roomId;
    _typingUserName = null;
    notifyListeners();

    _socket.joinRooms([roomId]);
    await fetchMessages(roomId);
  }

  // Connect to Socket.IO and register listeners
  void initializeSocketListeners() {
    _socket.addEventListener('new_message', (data) {
      if (data != null) {
        final message = MessageModel.fromJson(data);
        final list = _roomMessages[message.roomId] ?? [];
        // Prevent duplicate local messages
        if (!list.any((m) => m.id == message.id)) {
          list.add(message);
          _roomMessages[message.roomId] = list;
          notifyListeners();
        }
      }
    });

    _socket.addEventListener('user_typing', (data) {
      if (data != null && data['roomId'] == _activeRoomId) {
        final isTyping = data['isTyping'] as bool? ?? false;
        final username = data['username']?.toString();
        if (isTyping) {
          _typingUserName = username;
        } else {
          _typingUserName = null;
        }
        notifyListeners();
      }
    });
  }

  // Load chat rooms
  Future<void> fetchRooms() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.get(AppConfig.chatRooms);
      if (response.success && response.data != null) {
        final list = response.data as List;
        _rooms = list.map((json) => ChatRoomModel.fromJson(json)).toList();
      } else {
        _error = response.message ?? 'Failed to load chat rooms';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Load messages for a room
  Future<void> fetchMessages(String roomId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.get('${AppConfig.chatMessages}?room_id=$roomId');
      if (response.success && response.data != null) {
        final list = response.data as List;
        _roomMessages[roomId] = list.map((json) => MessageModel.fromJson(json)).toList();
      } else {
        _error = response.message ?? 'Failed to load messages';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Send message
  Future<bool> sendMessage(String content, {List<String>? attachments}) async {
    if (_activeRoomId == null) return false;

    try {
      final response = await _api.post(
        AppConfig.chatMessages,
        {
          'room_id': _activeRoomId,
          'content': content,
          if (attachments != null) 'attachments': attachments,
        },
      );

      if (response.success && response.data != null) {
        final message = MessageModel.fromJson(response.data);
        final list = _roomMessages[_activeRoomId] ?? [];
        if (!list.any((m) => m.id == message.id)) {
          list.add(message);
          _roomMessages[_activeRoomId!] = list;
          notifyListeners();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Send typing indicator
  void sendTyping(bool isTyping) {
    if (_activeRoomId != null) {
      _socket.sendTyping(_activeRoomId!, isTyping);
    }
  }
}
