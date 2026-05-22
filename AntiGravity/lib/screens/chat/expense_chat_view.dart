import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../models/chat.dart';
import '../../models/expense.dart';
import '../../theme/app_colors.dart';

class ExpenseChatView extends StatefulWidget {
  final String groupId;
  const ExpenseChatView({super.key, required this.groupId});

  @override
  State<ExpenseChatView> createState() => _ExpenseChatViewState();
}

class _ExpenseChatViewState extends State<ExpenseChatView> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  final _expenseDescController = TextEditingController();
  final _expenseAmountController = TextEditingController();
  String _selectedCategory = 'Food';

  final List<String> _categories = ['Food', 'Travel', 'Hardware', 'Raw Material', 'Machinery', 'Other'];

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _expenseDescController.dispose();
    _expenseAmountController.dispose();
    super.dispose();
  }

  void _postExpense() {
    final desc = _expenseDescController.text.trim();
    final amountText = _expenseAmountController.text.trim();
    final amount = double.tryParse(amountText) ?? 0.0;

    if (desc.isEmpty || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid description or amount.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final err = AppState().logExpense(
      description: desc,
      amount: amount,
      category: _selectedCategory,
      isGroupExpense: true,
      groupId: widget.groupId,
    );

    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
    } else {
      _expenseDescController.clear();
      _expenseAmountController.clear();
      Navigator.pop(context); // Close sheet
      
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
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

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final state = AppState();
    final currentUser = state.currentUser;
    if (currentUser == null) return;

    // 1. Slash Command Parser: /expense <amount> <description>
    if (text.startsWith('/expense ')) {
      final cmdText = text.substring(9).trim();
      final spaceIndex = cmdText.indexOf(' ');
      if (spaceIndex == -1) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invalid format. Use: /expense <amount> <description>'),
            backgroundColor: AppColors.danger,
          ),
        );
        return;
      }

      final amountText = cmdText.substring(0, spaceIndex).trim();
      final description = cmdText.substring(spaceIndex).trim();
      final amount = double.tryParse(amountText);

      if (amount == null || amount <= 0 || description.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invalid parameters. Use: /expense <amount> <description>'),
            backgroundColor: AppColors.danger,
          ),
        );
        return;
      }

      final err = state.logExpense(
        description: description,
        amount: amount,
        category: 'Other',
        isGroupExpense: true,
        groupId: widget.groupId,
      );

      if (err != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      } else {
        _messageController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Logged Group Expense of Rs. ${amount.toStringAsFixed(2)}: "$description"'),
            backgroundColor: AppColors.accent,
          ),
        );
      }
    } 
    // 2. Slash Command Parser: /send <recipient> <amount>
    else if (text.startsWith('/send ')) {
      final cmdText = text.substring(6).trim();
      final spaceIndex = cmdText.indexOf(' ');
      if (spaceIndex == -1) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invalid format. Use: /send <recipient_username> <amount>'),
            backgroundColor: AppColors.danger,
          ),
        );
        return;
      }

      final recipient = cmdText.substring(0, spaceIndex).trim();
      final amountText = cmdText.substring(spaceIndex).trim();
      final amount = double.tryParse(amountText);

      if (amount == null || amount <= 0 || recipient.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invalid parameters. Use: /send <recipient_username> <amount>'),
            backgroundColor: AppColors.danger,
          ),
        );
        return;
      }

      // Check if recipient is a member of the active group
      final groups = state.chatGroupsForCurrentCompany;
      final activeGroup = groups.firstWhere((g) => g.id == widget.groupId);
      if (!activeGroup.members.contains(recipient)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('User "$recipient" is not a member of this chat group.'),
            backgroundColor: AppColors.danger,
          ),
        );
        return;
      }

      if (recipient == currentUser.username) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cannot transfer money to yourself.'),
            backgroundColor: AppColors.danger,
          ),
        );
        return;
      }

      // Log direct transfer
      state.logGroupTransfer(widget.groupId, currentUser.username, recipient, amount);
      _messageController.clear();
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully recorded P2P transfer of Rs. ${amount.toStringAsFixed(2)} to $recipient!'),
          backgroundColor: AppColors.accent,
        ),
      );
    } 
    // 3. Normal Message
    else {
      state.sendChatMessage(text, ChatType.expense, groupId: widget.groupId);
      _messageController.clear();
    }

    _scrollToBottom();
  }

  void _showAddExpenseDialog() {
    showDialog(
      context: context,
      builder: (context) {
        final dark = AppColors.isDark(context);
        return AlertDialog(
          backgroundColor: dark ? AppColors.darkCard : Colors.white,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(4)),
            side: BorderSide(color: AppColors.lightBorder, width: 1.5),
          ),
          title: Row(
            children: [
              Icon(Icons.add_shopping_cart, color: AppColors.secondary, size: 20),
              const SizedBox(width: 8),
              const Text('Log Group Expense', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: SizedBox(
            width: 400,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _expenseDescController,
                    decoration: const InputDecoration(
                      labelText: 'Expense Description',
                      hintText: 'e.g., Client Lunch / REST API Server Host',
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _expenseAmountController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Amount (INR)',
                            prefixIcon: Icon(Icons.currency_rupee, size: 16),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _selectedCategory,
                          decoration: const InputDecoration(labelText: 'Category'),
                          items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                          onChanged: (val) => setState(() => _selectedCategory = val!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Note: Group expenses will be split evenly across all current group members in the SAP Ledger.',
                    style: TextStyle(fontSize: 10, color: Colors.grey, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: _postExpense,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              ),
              child: const Text('Post Expense'),
            ),
          ],
        );
      },
    );
  }

  void _showSettleUpDialog() {
    final state = AppState();
    final currentUser = state.currentUser;
    if (currentUser == null) return;

    final groups = state.chatGroupsForCurrentCompany;
    final activeGroup = groups.firstWhere((g) => g.id == widget.groupId);
    
    // Get other group members
    final otherMembers = activeGroup.members.where((m) => m != currentUser.username).toList();
    
    if (otherMembers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No other members in this group to settle with.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    String selectedRecipient = otherMembers.first;
    final transferAmountController = TextEditingController();

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
                Icon(Icons.handshake_outlined, color: AppColors.accent, size: 20),
                const SizedBox(width: 8),
                const Text('Record P2P Settlement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            content: SizedBox(
              width: 380,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: selectedRecipient,
                    decoration: const InputDecoration(labelText: 'Send Money To (Recipient)'),
                    items: otherMembers.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                    onChanged: (val) {
                      setDialogState(() {
                        selectedRecipient = val!;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: transferAmountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Settlement Amount (INR)',
                      prefixIcon: Icon(Icons.currency_rupee, size: 16),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'P2P settlement registers direct compensation. B pays A ₹100, which reduces A\'s net spending and satisfies A.',
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
              ),
              ElevatedButton(
                onPressed: () {
                  final amountText = transferAmountController.text.trim();
                  final amount = double.tryParse(amountText) ?? 0.0;
                  if (amount <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please enter a valid amount.'), backgroundColor: AppColors.danger),
                    );
                    return;
                  }

                  state.logGroupTransfer(widget.groupId, currentUser.username, selectedRecipient, amount);
                  Navigator.pop(context);
                  
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Recorded settlement of Rs. ${amount.toStringAsFixed(2)} to $selectedRecipient!'),
                      backgroundColor: AppColors.accent,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                child: const Text('Post Settlement'),
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
    final user = state.currentUser;

    if (user == null) return const Center(child: Text('Unauthorized.'));

    return ListenableBuilder(
      listenable: state,
      builder: (context, child) {
        final groups = state.chatGroupsForCurrentCompany;
        final activeGroup = groups.firstWhere(
          (g) => g.id == widget.groupId,
          orElse: () => groups.first,
        );

        final messages = state.getMessagesForGroup(widget.groupId);
        final groupExpenses = state.getGroupExpenses(widget.groupId);
        
        // Sum total group expense
        final double totalGroupExpense = groupExpenses.fold(0.0, (sum, e) => sum + e.amount);

        // Calculate Ledgers using the mathematical split engine
        final totals = state.calculateGroupTotals(widget.groupId);
        final spentMap = totals['spent'] ?? {};
        final receivedMap = totals['received'] ?? {};
        final sentMap = totals['sent'] ?? {};
        final netMap = totals['net'] ?? {};

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // SAP Header Panel: Total Group Expense & Settle controls
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: dark ? AppColors.darkSurface : Colors.white,
                border: Border(bottom: BorderSide(color: dark ? AppColors.darkBorder : AppColors.lightBorder, width: 1.5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'SAP SYSTEM LEDGER METRIC',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.secondary, letterSpacing: 0.5),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              const Text('Total Group Expense: ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey)),
                              Text(
                                '₹ ${totalGroupExpense.toStringAsFixed(2)}',
                                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ],
                      ),
                      
                      // Actions Row
                      if (activeGroup.enableP2PTransfers)
                        Row(
                          children: [
                            ElevatedButton(
                              onPressed: _showAddExpenseDialog,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.secondary,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                              child: Row(
                                children: const [
                                  Icon(Icons.add_shopping_cart, size: 14, color: Colors.white),
                                  SizedBox(width: 6),
                                  Text('Add Expense', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: _showSettleUpDialog,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accent,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                              child: Row(
                                children: const [
                                  Icon(Icons.handshake_outlined, size: 14, color: Colors.white),
                                  SizedBox(width: 6),
                                  Text('Settle Up (P2P)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                  
                  // Render split settlement table if enabled
                  if (activeGroup.enableP2PTransfers) ...[
                    const SizedBox(height: 16),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    const Text(
                      'SAP Collaborative Split Balance Sheet (Double-Entry Log Matrix)',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.secondary),
                    ),
                    const SizedBox(height: 8),
                    
                    // The High Density SAP Grid Table
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: dark ? AppColors.darkBorder : AppColors.lightBorder),
                        borderRadius: BorderRadius.circular(2),
                        color: dark ? AppColors.darkBg : AppColors.lightBg,
                      ),
                      child: Table(
                        border: TableBorder.all(
                          color: dark ? AppColors.darkBorder : AppColors.lightBorder,
                          width: 1,
                        ),
                        columnWidths: const {
                          0: FlexColumnWidth(2),
                          1: FlexColumnWidth(1.5),
                          2: FlexColumnWidth(1.2),
                          3: FlexColumnWidth(1.2),
                          4: FlexColumnWidth(1.8),
                        },
                        children: [
                          // Table Header Row
                          TableRow(
                            decoration: BoxDecoration(
                              color: dark ? Colors.grey[900] : Colors.grey[200],
                            ),
                            children: const [
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('User / Member', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                              ),
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Money Spent', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.right),
                              ),
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Sent (P2P)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.right),
                              ),
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Received', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.right),
                              ),
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Net Spending', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.right),
                              ),
                            ],
                          ),
                          // Member balance rows
                          ...activeGroup.members.map((member) {
                            final spent = spentMap[member] ?? 0.0;
                            final sent = sentMap[member] ?? 0.0;
                            final received = receivedMap[member] ?? 0.0;
                            final net = netMap[member] ?? 0.0;

                            final isPositive = net >= 0;
                            final isCurrentUser = member == user.username;

                            return TableRow(
                              decoration: BoxDecoration(
                                color: isCurrentUser 
                                    ? AppColors.primary.withOpacity(0.04) 
                                    : null,
                              ),
                              children: [
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                                  child: Text(
                                    isCurrentUser ? '$member (You)' : member,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: isCurrentUser ? FontWeight.bold : FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                                  child: Text('₹${spent.toStringAsFixed(1)}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace'), textAlign: TextAlign.right),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                                  child: Text('₹${sent.toStringAsFixed(1)}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Colors.blueGrey), textAlign: TextAlign.right),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                                  child: Text('₹${received.toStringAsFixed(1)}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Colors.teal), textAlign: TextAlign.right),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                                  child: Text(
                                    '₹${net.toStringAsFixed(1)}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.bold,
                                      color: isPositive ? AppColors.accent : AppColors.danger,
                                    ),
                                    textAlign: TextAlign.right,
                                  ),
                                ),
                              ],
                            );
                          }),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Messages Stream (SAP Flat Look)
            Expanded(
              child: Container(
                color: dark ? AppColors.darkBg : AppColors.lightBg,
                child: messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.receipt_long, size: 48, color: Colors.grey.withOpacity(0.3)),
                            const SizedBox(height: 12),
                            const Text('No transactions or messages logged. Use /expense or /send to begin!', style: TextStyle(color: Colors.grey, fontSize: 13)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length,
                        itemBuilder: (context, idx) {
                          final msg = messages[idx];
                          final isMe = msg.sender == user.username;
                          
                          Expense? linkedExpense;
                          if (msg.isExpenseLog) {
                            try {
                              linkedExpense = groupExpenses.firstWhere((e) => e.id == msg.linkedExpenseId);
                            } catch (_) {
                              // Catch gracefully
                            }
                          }

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12.0),
                            child: Row(
                              mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (!isMe) ...[
                                  Container(
                                    width: 24,
                                    height: 24,
                                    alignment: Alignment.center,
                                    decoration: const BoxDecoration(
                                      color: AppColors.secondary,
                                      shape: BoxShape.rectangle, // SAP sharp rectangular style
                                    ),
                                    child: Text(
                                      msg.sender[0].toUpperCase(),
                                      style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                ],
                                
                                // SAP Bubble (Square flat cards)
                                Flexible(
                                  child: Column(
                                    crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                    children: [
                                      Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(msg.sender, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Colors.grey)),
                                            const SizedBox(width: 8),
                                            Text(
                                              '${msg.timestamp.hour}:${msg.timestamp.minute.toString().padLeft(2, '0')}',
                                              style: const TextStyle(color: Colors.grey, fontSize: 8),
                                            ),
                                          ],
                                        ),
                                      ),
                                      
                                      if (linkedExpense != null)
                                        _buildExpenseCard(context, linkedExpense, dark)
                                      else
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                          decoration: BoxDecoration(
                                            color: isMe 
                                                ? AppColors.primary.withOpacity(0.08) 
                                                : (dark ? AppColors.darkSurface : Colors.white),
                                            borderRadius: BorderRadius.circular(2),
                                            border: Border.all(
                                              color: isMe ? AppColors.primary : (dark ? AppColors.darkBorder : AppColors.lightBorder),
                                              width: 1,
                                            ),
                                          ),
                                          child: Text(
                                            msg.content,
                                            style: TextStyle(
                                              color: dark ? Colors.white70 : Colors.black87,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                
                                if (isMe) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    width: 24,
                                    height: 24,
                                    alignment: Alignment.center,
                                    decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.rectangle,
                                    ),
                                    child: Text(
                                      msg.sender[0].toUpperCase(),
                                      style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
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

            // SAP Message Input Dock
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: dark ? AppColors.darkSurface : Colors.white,
                border: Border(top: BorderSide(color: dark ? AppColors.darkBorder : AppColors.lightBorder, width: 1.5)),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _showAddExpenseDialog,
                    icon: const Icon(Icons.add_shopping_cart, color: AppColors.secondary, size: 22),
                    tooltip: 'Log expense using form',
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: dark ? AppColors.darkBg : AppColors.lightBg,
                        border: Border.all(color: dark ? AppColors.darkBorder : AppColors.lightBorder),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: TextField(
                        controller: _messageController,
                        style: const TextStyle(fontSize: 12),
                        decoration: const InputDecoration(
                          hintText: 'Type message, or /expense <amount> <desc> or /send <user> <amount>...',
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 8),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _sendMessage,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: const Size(60, 36),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                    child: const Text('Send', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildExpenseCard(BuildContext context, Expense exp, bool dark) {
    return Container(
      width: 280,
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: dark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(2),
        border: Border.all(color: AppColors.secondary, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                color: AppColors.secondary.withOpacity(0.1),
                child: Text(
                  exp.category.toUpperCase(),
                  style: const TextStyle(
                    color: AppColors.secondary,
                    fontWeight: FontWeight.bold,
                    fontSize: 9,
                  ),
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.check_circle, color: AppColors.accent, size: 12),
                  SizedBox(width: 4),
                  Text('Cleared Ledger', style: TextStyle(color: AppColors.accent, fontSize: 9, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            exp.description,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            '₹ ${exp.amount.toStringAsFixed(2)}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.secondary, fontFamily: 'monospace'),
          ),
          const Divider(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Log: ${exp.loggedBy}', style: const TextStyle(fontSize: 9, color: Colors.grey)),
              const Row(
                children: [
                  Icon(Icons.share, size: 8, color: AppColors.primary),
                  SizedBox(width: 2),
                  Text('Group Split (Even)', style: TextStyle(color: AppColors.primary, fontSize: 9, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
