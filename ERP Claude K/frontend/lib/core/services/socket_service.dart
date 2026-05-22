import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/core/utils/storage_service.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  socket_io.Socket? _socket;
  final StorageService _storage = StorageService();
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  // Callbacks
  final Map<String, List<Function>> _eventListeners = {};

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) {
      debugPrint('Socket already connected');
      return;
    }

    try {
      final token = await _storage.getAuthToken();
      if (token == null) {
        debugPrint('No auth token found for socket connection');
        return;
      }

      _socket = socket_io.io(
        AppConfig.socketUrl,
        socket_io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setAuth({'token': token})
            .setExtraHeaders({'Authorization': 'Bearer $token'})
            .build(),
      );

      _socket!.onConnect((_) {
        debugPrint('✅ Socket connected');
        _isConnected = true;
        _notifyListeners('connected', null);
      });

      _socket!.onDisconnect((_) {
        debugPrint('❌ Socket disconnected');
        _isConnected = false;
        _notifyListeners('disconnected', null);
      });

      _socket!.onError((error) {
        debugPrint('Socket error: $error');
        _notifyListeners('error', error);
      });

      // Chat events
      _socket!.on('new_message', (data) {
        debugPrint('New message received: $data');
        _notifyListeners('new_message', data);
      });

      _socket!.on('user_typing', (data) {
        _notifyListeners('user_typing', data);
      });

      _socket!.on('message_read', (data) {
        _notifyListeners('message_read', data);
      });

      _socket!.on('user_status_changed', (data) {
        _notifyListeners('user_status_changed', data);
      });

      _socket!.on('rooms_joined', (data) {
        debugPrint('Rooms joined: $data');
        _notifyListeners('rooms_joined', data);
      });

      _socket!.on('new_expense', (data) {
        debugPrint('New expense: $data');
        _notifyListeners('new_expense', data);
      });

      // Video call events
      _socket!.on('incoming_call', (data) {
        _notifyListeners('incoming_call', data);
      });

      _socket!.on('call_answered', (data) {
        _notifyListeners('call_answered', data);
      });

      _socket!.on('call_ended', (data) {
        _notifyListeners('call_ended', data);
      });

      _socket!.on('ice_candidate', (data) {
        _notifyListeners('ice_candidate', data);
      });

      _socket!.connect();
    } catch (e) {
      debugPrint('Socket connection error: $e');
    }
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
      _isConnected = false;
      debugPrint('Socket disconnected manually');
    }
  }

  // Join chat rooms
  void joinRooms(List<String> roomIds) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join_rooms', roomIds);
      debugPrint('Joining rooms: $roomIds');
    }
  }

  // Leave chat room
  void leaveRoom(String roomId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('leave_room', roomId);
      debugPrint('Left room: $roomId');
    }
  }

  // Send typing indicator
  void sendTyping(String roomId, bool isTyping) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('typing', {'roomId': roomId, 'isTyping': isTyping});
    }
  }

  // Mark message as read
  void markAsRead(String messageId, String roomId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('mark_read', {'messageId': messageId, 'roomId': roomId});
    }
  }

  // Update online status
  void updateStatus(String status) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('update_status', status);
    }
  }

  // Video call signaling
  void callUser(String targetUserId, dynamic offer) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('call_user', {'targetUserId': targetUserId, 'offer': offer});
    }
  }

  void answerCall(String targetUserId, dynamic answer) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('answer_call', {'targetUserId': targetUserId, 'answer': answer});
    }
  }

  void sendIceCandidate(String targetUserId, dynamic candidate) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('ice_candidate', {'targetUserId': targetUserId, 'candidate': candidate});
    }
  }

  void endCall(String targetUserId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('end_call', {'targetUserId': targetUserId});
    }
  }

  // Event listener management
  void addEventListener(String event, Function callback) {
    if (!_eventListeners.containsKey(event)) {
      _eventListeners[event] = [];
    }
    _eventListeners[event]!.add(callback);
  }

  void removeEventListener(String event, Function callback) {
    if (_eventListeners.containsKey(event)) {
      _eventListeners[event]!.remove(callback);
    }
  }

  void removeAllListeners(String event) {
    _eventListeners.remove(event);
  }

  void _notifyListeners(String event, dynamic data) {
    if (_eventListeners.containsKey(event)) {
      for (var callback in _eventListeners[event]!) {
        callback(data);
      }
    }
  }
}
