import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../theme/app_colors.dart';
import '../../models/chat.dart';
import 'expense_chat_view.dart';

class ChatHubScreen extends StatefulWidget {
  const ChatHubScreen({super.key});

  @override
  State<ChatHubScreen> createState() => _ChatHubScreenState();
}

class _ChatHubScreenState extends State<ChatHubScreen> {
  String? _selectedGroupId;

  @override
  void initState() {
    super.initState();
    // Default to first available group for current company
    final state = AppState();
    final groups = state.chatGroupsForCurrentCompany;
    if (groups.isNotEmpty) {
      _selectedGroupId = groups.first.id;
    }
  }

  void _showCreateGroupDialog() {
    final state = AppState();
    final comp = state.currentCompany;
    if (comp == null) return;

    final companyUsers = state.users.where((u) => u.companyCode == comp.code).toList();
    final nameController = TextEditingController();
    final List<String> selectedMembers = [state.currentUser?.username ?? ''];
    bool enableP2P = true;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final dark = AppColors.isDark(context);
          return AlertDialog(
            backgroundColor: dark ? AppColors.darkCard : Colors.white,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(4)),
              side: BorderSide(color: AppColors.lightBorder, width: 1.5),
            ),
            title: Row(
              children: [
                Icon(Icons.group_add, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Create SAP Chat Group / Channel',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
            content: SizedBox(
              width: 450,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Group Information',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Group/Channel Name',
                        hintText: 'e.g., Sales Strategy Group',
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Enable P2P Settlement Ledger',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Switch(
                          value: enableP2P,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) {
                            setDialogState(() {
                              enableP2P = val;
                            });
                          },
                        ),
                      ],
                    ),
                    const Text(
                      'Enables Splitwise-style /expense logging, /send money transfers, and balance matrices inside the group.',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 8),
                    const Text(
                      'Select Employees / Group Members',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      height: 160,
                      decoration: BoxDecoration(
                        border: Border.all(color: dark ? AppColors.darkBorder : AppColors.lightBorder),
                        borderRadius: BorderRadius.circular(4),
                        color: dark ? AppColors.darkBg : AppColors.lightBg,
                      ),
                      child: ListView.builder(
                        itemCount: companyUsers.length,
                        itemBuilder: (context, idx) {
                          final u = companyUsers[idx];
                          final isMe = u.username == state.currentUser?.username;
                          final isSelected = selectedMembers.contains(u.username);
                          return CheckboxListTile(
                            title: Text(
                              isMe ? '${u.username} (You)' : u.username,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isMe ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                            subtitle: Text(u.role, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                            value: isSelected,
                            activeColor: AppColors.primary,
                            dense: true,
                            onChanged: isMe
                                ? null // Admin is auto-included
                                : (val) {
                                    setDialogState(() {
                                      if (val == true) {
                                        selectedMembers.add(u.username);
                                      } else {
                                        selectedMembers.remove(u.username);
                                      }
                                    });
                                  },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                style: TextButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
              ),
              ElevatedButton(
                onPressed: () {
                  final name = nameController.text.trim();
                  if (name.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please enter a group name.'), backgroundColor: AppColors.danger),
                    );
                    return;
                  }
                  if (selectedMembers.length < 2) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please select at least one other team member.'), backgroundColor: AppColors.danger),
                    );
                    return;
                  }

                  // Create group in state
                  state.createChatGroup(name, selectedMembers, enableP2PTransfers: enableP2P);
                  
                  // Auto-select new group
                  final newGroups = state.chatGroupsForCurrentCompany;
                  if (newGroups.isNotEmpty) {
                    setState(() {
                      _selectedGroupId = newGroups.last.id;
                    });
                  }

                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Created chat group "$name" successfully.'), backgroundColor: AppColors.accent),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                child: const Text('Create Group'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);
    final state = AppState();
    final comp = state.currentCompany;

    if (comp == null) return const Scaffold(body: Center(child: Text('Unauthorized.')));

    return ListenableBuilder(
      listenable: state,
      builder: (context, _) {
        final groups = state.chatGroupsForCurrentCompany;
        
        // Safety check if current selected group is deleted or out of bounds
        if (_selectedGroupId == null && groups.isNotEmpty) {
          _selectedGroupId = groups.first.id;
        }

        ChatGroup? activeGroup;
        if (_selectedGroupId != null) {
          activeGroup = groups.firstWhere(
            (g) => g.id == _selectedGroupId,
            orElse: () => groups.first,
          );
        }

        return Scaffold(
          backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
          appBar: AppBar(
            title: Row(
              children: [
                const Icon(Icons.hub_outlined, color: Colors.white, size: 22),
                const SizedBox(width: 8),
                Text(
                  'SAP ERP Internal Communication Portal',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                ),
              ],
            ),
            backgroundColor: AppColors.primary,
            elevation: 0,
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(color: AppColors.lightBorder, height: 1),
            ),
          ),
          body: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Sidebar Channels Selector
              Expanded(
                flex: 3,
                child: Container(
                  decoration: BoxDecoration(
                    color: dark ? AppColors.darkSurface : Colors.white,
                    border: Border(
                      right: BorderSide(color: dark ? AppColors.darkBorder : AppColors.lightBorder, width: 1.5),
                    ),
                  ),
                  child: Column(
                    children: [
                      // Sidebar Header with Company Info & Create Button
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'TENANT: ${comp.code} (${comp.name})',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                                color: AppColors.secondary,
                                letterSpacing: 0.5,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Channels & Groups',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                SizedBox(
                                  height: 28,
                                  child: ElevatedButton(
                                    onPressed: _showCreateGroupDialog,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: const [
                                        Icon(Icons.add, size: 14, color: Colors.white),
                                        SizedBox(width: 2),
                                        Text('Add Group', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      
                      // Channels List View (SAP Styled flat list)
                      Expanded(
                        child: groups.isEmpty
                            ? const Center(
                                child: Text('No channels seeded.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                itemCount: groups.length,
                                itemBuilder: (context, idx) {
                                  final g = groups[idx];
                                  final isSelected = g.id == _selectedGroupId;
                                  return Container(
                                    margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isSelected 
                                          ? AppColors.primary.withOpacity(0.08) 
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                        color: isSelected ? AppColors.primary : Colors.transparent,
                                        width: 1,
                                      ),
                                    ),
                                    child: ListTile(
                                      leading: Icon(
                                        g.isDefaultGroup ? Icons.forum_outlined : Icons.corporate_fare,
                                        size: 18,
                                        color: isSelected ? AppColors.primary : AppColors.secondary,
                                      ),
                                      title: Text(
                                        '# ${g.name}',
                                        style: TextStyle(
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                          fontSize: 13,
                                          color: isSelected ? AppColors.primary : null,
                                        ),
                                      ),
                                      subtitle: Text(
                                        '${g.members.length} members • ${g.enableP2PTransfers ? "Ledger ON" : "Chat ONLY"}',
                                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                                      ),
                                      dense: true,
                                      visualDensity: VisualDensity.compact,
                                      onTap: () => setState(() => _selectedGroupId = g.id),
                                    ),
                                  );
                                },
                              ),
                      ),
                      const Divider(height: 1),

                      // Sidebar Footer showing Online Directory
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'ONLINE DIRECTORY',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Colors.grey),
                          ),
                        ),
                      ),
                      SizedBox(
                        height: 120,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          itemCount: state.users.where((u) => u.companyCode == comp.code).length,
                          itemBuilder: (context, idx) {
                            final companyUsers = state.users.where((u) => u.companyCode == comp.code).toList();
                            final member = companyUsers[idx];
                            return Container(
                              margin: const EdgeInsets.symmetric(vertical: 2),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: dark ? AppColors.darkBg : AppColors.lightBg,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: dark ? AppColors.darkBorder : AppColors.lightBorder),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: const BoxDecoration(
                                      color: AppColors.accent,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    member.username,
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                  const Spacer(),
                                  Text(
                                    member.role,
                                    style: const TextStyle(fontSize: 9, color: Colors.grey),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),

              // Message & Split Sheet Panel
              Expanded(
                flex: 7,
                child: activeGroup == null
                    ? const Center(child: Text('Select or create a chat group to begin.', style: TextStyle(color: Colors.grey)))
                    : ExpenseChatView(groupId: activeGroup.id),
              ),
            ],
          ),
        );
      },
    );
  }
}
