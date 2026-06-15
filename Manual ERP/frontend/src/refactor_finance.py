import re
import os

def process_finance(comp_name, endpoint, data_key, schema_name):
    path = f'd:/ERP/Manual ERP/frontend/src/components/finance/{comp_name}.tsx'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Imports
    content = re.sub(r"import React, \{ useState \} from 'react';", "import React, { useState } from 'react';\nimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { apiClient } from '../../utils/apiService';\nimport { " + schema_name + " } from '../../utils/schemas';", content)

    # Signature
    sig_pattern = rf'interface {comp_name}Props {{.*?}}\n\nexport default function {comp_name}\({{.*?}}\: {comp_name}Props\) {{'
    new_sig = f"""export default function {comp_name}() {{
  const queryClient = useQueryClient();

  const {{ data: {data_key} = [] }} = useQuery({{
    queryKey: ['{data_key}'],
    queryFn: async () => {{
      const res = await apiClient.get<{{{data_key}: any[]}}>('{endpoint}');
      return res.{data_key} || [];
    }}
  }});

  const createMutation = useMutation({{
    mutationFn: (data: any) => apiClient.post('{endpoint}', data),
    onSuccess: () => queryClient.invalidateQueries({{ queryKey: ['{data_key}'] }})
  }});
"""
    content = re.sub(sig_pattern, new_sig, content, flags=re.DOTALL)

    # Handle Add/Submit
    submit_pattern = r'const handleAdd = async \(e: React\.FormEvent\) => \{.*?\n  \};'
    submit_pattern_2 = r'const handleSubmit = async \(e: React\.FormEvent\) => \{.*?\n  \};'
    
    # We will just replace the inner try/catch for handleAdd or handleSubmit by finding the exact function. 
    # Since it's hard to generalize the payload building for all files via regex, we'll just replace the `await onAdd...` with `await createMutation.mutateAsync`
    
    # Let's dynamically replace the await prop calls.
    content = re.sub(r'await onAdd[a-zA-Z]+\(', 'await createMutation.mutateAsync(', content)
    content = re.sub(r'await onUpdate[a-zA-Z]+\(', 'await updateMutation.mutateAsync(', content)
    content = re.sub(r'await onDelete[a-zA-Z]+\(', 'await deleteMutation.mutateAsync(', content)
    
    # We also need to do Zod validation. But since the payload object is created dynamically inside the function and passed to onAdd, we can find the `await createMutation.mutateAsync({ ... })`
    # and instead of wrapping it, we just insert the Zod schema validation before it.
    # Actually, it's safer to just inject it inside `handleAdd` manually for each.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

process_finance('BankAccounts', '/api/finance/bank-accounts', 'bankAccounts', 'BankAccountSchema')
process_finance('Cashbook', '/api/finance/cashbook', 'cashbook', 'CashTransactionSchema')
process_finance('Expenses', '/api/finance/expenses', 'expenses', 'ExpenseSchema')
process_finance('GstSettings', '/api/finance/gst', 'gstSettings', 'GstSettingSchema')
process_finance('Payments', '/api/finance/payments', 'payments', 'PaymentSchema')
process_finance('Receipts', '/api/finance/receipts', 'receipts', 'ReceiptSchema')
print("Updated finance components")
