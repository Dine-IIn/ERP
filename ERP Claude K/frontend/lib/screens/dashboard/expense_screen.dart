import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/providers/expense_provider.dart';
import 'package:enterprise_erp/providers/auth_provider.dart';
import 'package:enterprise_erp/providers/chat_provider.dart';
import 'package:enterprise_erp/models/expense_model.dart';

class ExpenseScreen extends StatefulWidget {
  final Function(String) onNavigateToModule; // Callback to switch active sidebar tab

  const ExpenseScreen({super.key, required this.onNavigateToModule});

  @override
  State<ExpenseScreen> createState() => _ExpenseScreenState();
}

class _ExpenseScreenState extends State<ExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _tagsController = TextEditingController();
  String _selectedCategory = 'Office Supplies';
  Map<String, double> _splits = {};
  
  final List<String> _categories = [
    'Office Supplies',
    'Travel & Lodging',
    'Meals & Entertainment',
    'Hardware & Equipment',
    'Software Subscriptions',
    'Marketing & Ads',
    'Consulting & Fees',
    'Other'
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ExpenseProvider>(context, listen: false).fetchExpenses();
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  void _openCreateExpenseDialog() {
    _amountController.clear();
    _descriptionController.clear();
    _tagsController.clear();
    _selectedCategory = 'Office Supplies';
    _splits = {};

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              title: Text(
                'File New Expense Claim',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold),
              ),
              content: SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Container(
                    width: 500,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Amount
                        TextFormField(
                          controller: _amountController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Amount (\$)',
                            prefixIcon: Icon(Icons.attach_money),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) return 'Please enter an amount';
                            if (double.tryParse(value) == null) return 'Enter a valid number';
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        // Category Dropdown
                        DropdownButtonFormField<String>(
                          value: _selectedCategory,
                          decoration: const InputDecoration(
                            labelText: 'Category',
                            prefixIcon: Icon(Icons.category_outlined),
                          ),
                          items: _categories.map((cat) {
                            return DropdownMenuItem(value: cat, child: Text(cat));
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() {
                                _selectedCategory = val;
                              });
                            }
                          },
                        ),
                        const SizedBox(height: 16),
                        // Description
                        TextFormField(
                          controller: _descriptionController,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Description / Purpose',
                            prefixIcon: Icon(Icons.description_outlined),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) return 'Enter a description';
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        // Tags
                        TextFormField(
                          controller: _tagsController,
                          decoration: const InputDecoration(
                            labelText: 'Tags (comma separated)',
                            prefixIcon: Icon(Icons.local_offer_outlined),
                            hintText: 'q2, marketing, flight',
                          ),
                        ),
                        const SizedBox(height: 16),
                        // Split details (Mock UI for split)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Payment Split options',
                              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            TextButton.icon(
                              icon: const Icon(Icons.people_outline, size: 16),
                              label: const Text('Equal Split'),
                              onPressed: () {
                                setModalState(() {
                                  _splits = {
                                    'John Doe': 0.5,
                                    'Sarah Jenkins': 0.5,
                                  };
                                });
                              },
                            ),
                          ],
                        ),
                        if (_splits.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).brightness == Brightness.dark
                                  ? Colors.white10
                                  : Colors.black12,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Column(
                              children: _splits.entries.map((e) {
                                return Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(e.key, style: const TextStyle(fontSize: 12)),
                                    Text('${(e.value * 100).toStringAsFixed(0)}% share', style: const TextStyle(fontSize: 12)),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (_formKey.currentState!.validate()) {
                      final amount = double.parse(_amountController.text.trim());
                      final desc = _descriptionController.text.trim();
                      final tags = _tagsController.text
                          .split(',')
                          .map((t) => t.trim())
                          .where((t) => t.isNotEmpty)
                          .toList();

                      final provider = Provider.of<ExpenseProvider>(context, listen: false);
                      final success = await provider.createExpense({
                        'amount': amount,
                        'category': _selectedCategory,
                        'description': desc,
                        'tags': tags,
                        if (_splits.isNotEmpty) 'split_details': _splits,
                      });

                      if (success) {
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Expense claim filed successfully!')),
                        );
                      }
                    }
                  },
                  child: const Text('Submit Claim'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return const Color(AppColors.success);
      case 'rejected':
        return const Color(AppColors.error);
      default:
        return const Color(AppColors.warning);
    }
  }

  @override
  Widget build(BuildContext context) {
    final expenseProvider = Provider.of<ExpenseProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.userData ?? {};
    final isAdmin = user['is_admin'] == true || user['userType'] == 'super_admin';

    return Container(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Corporate Expenses',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Track, verify, and approve multi-tenant ERP business expense claims.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.add, size: 16),
                label: const Text('File Expense Claim'),
                onPressed: _openCreateExpenseDialog,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(180, 48),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Main contents
          Expanded(
            child: expenseProvider.isLoading && expenseProvider.expenses.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : expenseProvider.expenses.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        itemCount: expenseProvider.expenses.length,
                        itemBuilder: (context, index) {
                          final expense = expenseProvider.expenses[index];
                          return _buildExpenseCard(expense, isAdmin, expenseProvider);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseCard(ExpenseModel expense, bool isAdmin, ExpenseProvider provider) {
    final statusColor = _getStatusColor(expense.status);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);

    void _navigateToExpenseChat() async {
      // Find room in chatProvider matching expense ID
      await chatProvider.fetchRooms();
      final targetRoom = chatProvider.rooms.firstWhere(
        (room) => room.expenseId == expense.id || room.name.contains(expense.category),
        orElse: () => chatProvider.rooms.firstWhere(
          (room) => room.type == 'expense',
          orElse: () => chatProvider.rooms.first,
        ),
      );

      // Join room and switch active tab to Chat
      await chatProvider.setActiveRoom(targetRoom.id);
      widget.onNavigateToModule(AppStrings.chat);
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Line 1: Amount & Status tag
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(AppColors.primaryBlue).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.payments_outlined,
                        color: Color(AppColors.primaryBlue),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '\$${expense.amount.toStringAsFixed(2)}',
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          expense.category,
                          style: const TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    expense.status.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Line 2: Description
            Text(
              expense.description,
              style: GoogleFonts.inter(fontSize: 14),
            ),
            const SizedBox(height: 16),

            // Line 3: Meta & tags
            Row(
              children: [
                if (expense.tags != null && expense.tags!.isNotEmpty) ...[
                  ...expense.tags!.map((t) => Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.grey.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '#$t',
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                        ),
                      )),
                ],
                const Spacer(),
                Text(
                  'Claimed on: ${expense.createdAt.year}-${expense.createdAt.month.toString().padLeft(2, '0')}-${expense.createdAt.day.toString().padLeft(2, '0')}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),

            // Splits table if present
            if (expense.splitDetails != null && expense.splitDetails!.isNotEmpty) ...[
              const Divider(height: 24),
              Text(
                'Split Allocations:',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                children: expense.splitDetails!.entries.map((entry) {
                  return Chip(
                    avatar: CircleAvatar(
                      backgroundColor: const Color(AppColors.primaryBlue),
                      radius: 10,
                      child: Text(
                        entry.key.substring(0, 1).toUpperCase(),
                        style: const TextStyle(fontSize: 9, color: Colors.white),
                      ),
                    ),
                    label: Text(
                      '${entry.key}: ${(entry.value * 100).toStringAsFixed(0)}%',
                      style: const TextStyle(fontSize: 11),
                    ),
                  );
                }).toList(),
              ),
            ],

            if (expense.status.toLowerCase() == 'approved' && expense.approvedBy != null) ...[
              const Divider(height: 24),
              Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Color(AppColors.success), size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Approved by Administrator (ID: ${expense.approvedBy})',
                    style: const TextStyle(color: Color(AppColors.success), fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ],

            // Actions row (Admin approvals & Room chat integrations)
            const Divider(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Real-time conversation link
                ElevatedButton.icon(
                  icon: const Icon(Icons.chat_bubble_outline, size: 16),
                  label: const Text('Open Expense Chat Room'),
                  onPressed: _navigateToExpenseChat,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(AppColors.primaryBlue).withValues(alpha: 0.1),
                    foregroundColor: const Color(AppColors.primaryBlue),
                    minimumSize: const Size(200, 36),
                  ),
                ),
                // Admin Actions
                if (isAdmin && expense.status.toLowerCase() == 'pending') ...[
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: () => provider.updateExpenseStatus(expense.id, 'rejected'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(AppColors.error),
                          side: const BorderSide(color: Color(AppColors.error)),
                          minimumSize: const Size(100, 36),
                        ),
                        child: const Text('Reject'),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: () => provider.updateExpenseStatus(expense.id, 'approved'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(AppColors.success),
                          foregroundColor: Colors.white,
                          minimumSize: const Size(100, 36),
                        ),
                        child: const Text('Approve'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
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
              Icons.receipt_long_outlined,
              size: 64,
              color: Color(AppColors.primaryBlue),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'No expense claims found',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'File your first corporate expense claim using the button above.',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
