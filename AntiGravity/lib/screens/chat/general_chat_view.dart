import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../models/chat.dart';
import '../../theme/app_colors.dart';

class GeneralChatView extends StatefulWidget {
  const GeneralChatView({super.key});

  @override
  State<GeneralChatView> createState() => _GeneralChatViewState();
}

class _GeneralChatViewState extends State<GeneralChatView> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    AppState().sendChatMessage(text, ChatType.general);
    _messageController.clear();
    
    // Smooth scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);
    final user = AppState().currentUser;

    if (user == null) return const Center(child: Text('Please log in.'));

    return ListenableBuilder(
      listenable: AppState(),
      builder: (context, child) {
        final messages = AppState().messagesForCurrentCompany
            .where((m) => m.chatType == ChatType.general)
            .toList();

        return Column(
          children: [
            // Channel Header Info
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: dark ? AppColors.darkSurface : Colors.white,
                border: Border(bottom: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.forum_outlined, color: AppColors.primary, size: 24),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('# general-chat', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('Welcome to company internal chat. Keep logs formal.', style: TextStyle(color: Colors.grey, fontSize: 11)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.info_outline, size: 20),
                    onPressed: () {},
                  ),
                ],
              ),
            ),

            // Messages Stream
            Expanded(
              child: Container(
                color: dark ? AppColors.darkBg : Colors.grey[50],
                child: messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.forum, size: 48, color: Colors.grey.withOpacity(0.3)),
                            const SizedBox(height: 12),
                            const Text('No messages yet. Say hello!', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(24),
                        itemCount: messages.length,
                        itemBuilder: (context, idx) {
                          final msg = messages[idx];
                          final isMe = msg.sender == user.username;
                          
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16.0),
                            child: Row(
                              mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (!isMe) ...[
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: AppColors.primary,
                                    child: Text(
                                      msg.sender[0].toUpperCase(),
                                      style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                ],
                                
                                // Bubble Container
                                Flexible(
                                  child: Column(
                                    crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                    children: [
                                      // Meta (Name & Time)
                                      Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              msg.sender,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              '${msg.timestamp.hour}:${msg.timestamp.minute.toString().padLeft(2, '0')}',
                                              style: const TextStyle(color: Colors.grey, fontSize: 9),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.all(16),
                                        decoration: BoxDecoration(
                                          gradient: isMe ? AppColors.primaryGradient : null,
                                          color: isMe ? null : (dark ? AppColors.darkCard : Colors.white),
                                          borderRadius: BorderRadius.only(
                                            topLeft: const Radius.circular(16),
                                            topRight: const Radius.circular(16),
                                            bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
                                            bottomRight: isMe ? Radius.zero : const Radius.circular(16),
                                          ),
                                          border: isMe ? null : Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!),
                                        ),
                                        child: Text(
                                          msg.content,
                                          style: TextStyle(
                                            color: isMe ? Colors.white : (dark ? Colors.white70 : Colors.black87),
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                
                                if (isMe) ...[
                                  const SizedBox(width: 12),
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: AppColors.secondary,
                                    child: Text(
                                      msg.sender[0].toUpperCase(),
                                      style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ),

            // Chat Input Drawer Footer
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: dark ? AppColors.darkSurface : Colors.white,
                border: Border(top: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        hintText: 'Type your message...',
                        filled: true,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FloatingActionButton(
                    onPressed: _sendMessage,
                    backgroundColor: AppColors.primary,
                    mini: true,
                    child: const Icon(Icons.send, color: Colors.white, size: 18),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
