import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/chat_provider.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';
import 'package:enterprise_erp/models/chat_room_model.dart';
import 'package:enterprise_erp/models/message_model.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  Timer? _typingTimer;
  bool _isTyping = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      chatProvider.fetchRooms();
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _typingTimer?.cancel();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _onTextChanged(String text) {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    
    if (text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      chatProvider.sendTyping(true);
    }

    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 2), () {
      if (_isTyping) {
        _isTyping = false;
        chatProvider.sendTyping(false);
      }
    });
  }

  void _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    _messageController.clear();
    
    // Reset typing state
    _typingTimer?.cancel();
    if (_isTyping) {
      _isTyping = false;
      chatProvider.sendTyping(false);
    }

    final success = await chatProvider.sendMessage(text);
    if (success) {
      Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
    }
  }

  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour.toString().padLeft(2, '0');
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final chatProvider = Provider.of<ChatProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final currentUser = authProvider.userData ?? {};
    final currentUserId = currentUser['id']?.toString() ?? '';

    // Scroll to bottom when new messages arrive
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (chatProvider.getActiveMessages().isNotEmpty) {
        _scrollToBottom();
      }
    });

    final filteredRooms = chatProvider.rooms.where((room) {
      return room.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          room.type.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
      ),
      child: Row(
        children: [
          // Sidebar / Room List
          Container(
            width: 320,
            decoration: BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.white10
                      : Colors.black12,
                ),
              ),
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF131324)
                  : const Color(0xFFF1F5F9),
            ),
            child: Column(
              children: [
                // Search Input
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: TextField(
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                    decoration: InputDecoration(
                      hintText: 'Search conversations...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      fillColor: Theme.of(context).brightness == Brightness.dark
                          ? const Color(0xFF1E1E2F)
                          : Colors.white,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                // Room List Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'CHANNELS & CHATS',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? Colors.white38
                              : Colors.black45,
                          letterSpacing: 1.1,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_comment_outlined, size: 18),
                        onPressed: () {
                          // Room creation action if needed
                        },
                      ),
                    ],
                  ),
                ),
                // Rooms list
                Expanded(
                  child: chatProvider.isLoading && chatProvider.rooms.isEmpty
                      ? const Center(child: CircularProgressIndicator())
                      : filteredRooms.isEmpty
                          ? Center(
                              child: Text(
                                'No rooms found',
                                style: TextStyle(
                                  color: Theme.of(context).brightness == Brightness.dark
                                      ? Colors.white38
                                      : Colors.black45,
                                ),
                              ),
                            )
                          : ListView.builder(
                              itemCount: filteredRooms.length,
                              itemBuilder: (context, index) {
                                final room = filteredRooms[index];
                                final isActive = chatProvider.activeRoomId == room.id;
                                return _buildRoomListItem(room, isActive, chatProvider);
                              },
                            ),
                ),
              ],
            ),
          ),

          // Message Pane / Workspace
          Expanded(
            child: chatProvider.activeRoomId == null
                ? _buildEmptyState(context)
                : Column(
                    children: [
                      // Active Room Header
                      _buildRoomHeader(context, chatProvider),
                      
                      // Message Stream list
                      Expanded(
                        child: chatProvider.isLoading && chatProvider.getActiveMessages().isEmpty
                            ? const Center(child: CircularProgressIndicator())
                            : ListView.builder(
                                controller: _scrollController,
                                padding: const EdgeInsets.all(24),
                                itemCount: chatProvider.getActiveMessages().length,
                                itemBuilder: (context, index) {
                                  final message = chatProvider.getActiveMessages()[index];
                                  final isMe = message.userId == currentUserId;
                                  return _buildMessageBubble(context, message, isMe);
                                },
                              ),
                      ),
                      
                      // Typing indicator status text
                      if (chatProvider.typingUserName != null)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
                            child: Row(
                              children: [
                                const SizedBox(
                                  width: 12,
                                  height: 12,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Color(AppColors.primaryBlue),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${chatProvider.typingUserName} is typing...',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.grey,
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      
                      // Message Input Composer
                      _buildMessageComposer(context),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoomListItem(ChatRoomModel room, bool isActive, ChatProvider chatProvider) {
    IconData getIconForRoomType() {
      switch (room.type) {
        case 'direct':
          return Icons.person_outline;
        case 'department':
          return Icons.groups_outlined;
        case 'expense':
          return Icons.receipt_long_outlined;
        default:
          return Icons.tag;
      }
    }

    Color getColorForRoomType() {
      switch (room.type) {
        case 'expense':
          return const Color(AppColors.success);
        case 'department':
          return const Color(AppColors.secondaryPurple);
        case 'direct':
          return const Color(AppColors.info);
        default:
          return const Color(AppColors.primaryBlue);
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
      child: InkWell(
        onTap: () => chatProvider.setActiveRoom(room.id),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: isActive
                ? const Color(AppColors.primaryBlue).withValues(alpha: 0.15)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: getColorForRoomType().withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  getIconForRoomType(),
                  color: getColorForRoomType(),
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      room.name,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                        color: isActive
                            ? (Theme.of(context).brightness == Brightness.dark
                                ? Colors.white
                                : Colors.black)
                            : (Theme.of(context).brightness == Brightness.dark
                                ? Colors.white70
                                : Colors.black87),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      room.type.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: getColorForRoomType(),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoomHeader(BuildContext context, ChatProvider chatProvider) {
    final activeRoom = chatProvider.rooms.firstWhere((r) => r.id == chatProvider.activeRoomId);

    return Container(
      height: 70,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white10
                : Colors.black12,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: const Color(AppColors.primaryBlue).withValues(alpha: 0.1),
                child: const Icon(Icons.tag, color: Color(AppColors.primaryBlue)),
              ),
              const SizedBox(width: 16),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activeRoom.name,
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Active channel • Room ID: ${activeRoom.id}',
                    style: const TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.phone_outlined),
                onPressed: () {},
              ),
              IconButton(
                icon: const Icon(Icons.videocam_outlined),
                onPressed: () {},
              ),
              IconButton(
                icon: const Icon(Icons.info_outline),
                onPressed: () {},
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(BuildContext context, MessageModel message, bool isMe) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              backgroundColor: const Color(AppColors.primaryBlue),
              foregroundColor: Colors.white,
              radius: 16,
              child: Text(
                message.username.isNotEmpty
                    ? message.username.substring(0, 1).toUpperCase()
                    : 'U',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Column(
            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMe)
                Padding(
                  padding: const EdgeInsets.only(left: 4.0, bottom: 4.0),
                  child: Text(
                    message.username,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey,
                    ),
                  ),
                ),
              Container(
                constraints: const BoxConstraints(maxWidth: 500),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isMe
                      ? const Color(AppColors.sentMessage)
                      : (Theme.of(context).brightness == Brightness.dark
                          ? const Color(0xFF1E1E2F)
                          : const Color(AppColors.receivedMessage)),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(12),
                    topRight: const Radius.circular(12),
                    bottomLeft: isMe ? const Radius.circular(12) : const Radius.circular(0),
                    bottomRight: isMe ? const Radius.circular(0) : const Radius.circular(12),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message.content,
                      style: GoogleFonts.inter(
                        color: isMe
                            ? Colors.white
                            : (Theme.of(context).brightness == Brightness.dark
                                ? Colors.white70
                                : Colors.black87),
                        fontSize: 14,
                      ),
                    ),
                    if (message.attachments != null && message.attachments!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      ...message.attachments!.map((url) => _buildAttachmentWidget(url, isMe)),
                    ]
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4.0),
                child: Text(
                  _formatTime(message.createdAt),
                  style: const TextStyle(color: Colors.grey, fontSize: 10),
                ),
              ),
            ],
          ),
          if (isMe) ...[
            const SizedBox(width: 12),
            CircleAvatar(
              backgroundColor: const Color(AppColors.secondaryPurple),
              foregroundColor: Colors.white,
              radius: 16,
              child: Text(
                message.username.isNotEmpty
                    ? message.username.substring(0, 1).toUpperCase()
                    : 'M',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAttachmentWidget(String url, bool isMe) {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isMe ? Colors.white12 : Colors.black12,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.insert_drive_file, size: 16, color: Colors.grey),
          const SizedBox(width: 8),
          Text(
            url.split('/').last,
            style: const TextStyle(fontSize: 12, decoration: TextDecoration.underline),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageComposer(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        border: Border(
          top: BorderSide(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white10
                : Colors.black12,
          ),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.attach_file_outlined),
            onPressed: () {
              // Attachment selection flow if needed
            },
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              onChanged: _onTextChanged,
              onSubmitted: (_) => _sendMessage(),
              decoration: const InputDecoration(
                hintText: 'Type a message here...',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send, color: Color(AppColors.primaryBlue)),
            onPressed: _sendMessage,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Container(
      color: Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFF0F172A)
          : Colors.white,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(AppColors.primaryBlue).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.chat_bubble_outline,
                size: 64,
                color: Color(AppColors.primaryBlue),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Realtime Collaborations',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.white
                    : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Select any conversation or channel from the sidebar\nto start real-time messaging with your department team.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: Colors.grey,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
