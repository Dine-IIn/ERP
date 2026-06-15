import re

with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<BankAccounts\s+bankAccounts=\{financeBankAccounts\}\s+onCreateBankAccount=\{handleCreateBankAccount\}\s+currencySymbol=\{currencySymbol\}\s+/>', '<BankAccounts />', content)

content = re.sub(r'<Cashbook\s+cashbook=\{financeCashbook\}\s+onCreateCashTransaction=\{handleCreateCashTransaction\}\s+currencySymbol=\{currencySymbol\}\s+/>', '<Cashbook />', content)

content = re.sub(r'<Expenses\s+expenses=\{financeExpenses\}\s+onCreateExpense=\{handleCreateExpense\}\s+currencySymbol=\{currencySymbol\}\s+/>', '<Expenses />', content)

content = re.sub(r'<Payments\s+payments=\{financePayments\}\s+onCreatePayment=\{handleCreatePayment\}\s+currencySymbol=\{currencySymbol\}\s+/>', '<Payments />', content)

content = re.sub(r'<Receipts\s+receipts=\{financeReceipts\}\s+onCreateReceipt=\{handleCreateReceipt\}\s+currencySymbol=\{currencySymbol\}\s+/>', '<Receipts />', content)

content = re.sub(r'<GstSettings\s+gstSettings=\{financeGstSettings\}\s+onUpdateGst=\{handleUpdateGstSetting\}\s+/>', '<GstSettings />', content)

with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed App.tsx for Finance")
