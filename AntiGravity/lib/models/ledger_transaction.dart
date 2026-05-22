class LedgerTransaction {
  final String id;
  final String code;        // e.g. ACC-101
  final String account;     // e.g. Cash Account
  final String type;        // 'Debit' (increases assets/expenses) or 'Credit' (increases revenues/liabilities)
  final double amount;
  final DateTime date;
  final String description;
  final String companyCode;

  LedgerTransaction({
    required this.id,
    required this.code,
    required this.account,
    required this.type,
    required this.amount,
    required this.date,
    required this.description,
    required this.companyCode,
  });
}
