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
    sig_pattern = rf'interface {comp_name}Props {{.*?}}\n\nexport default function {comp_name}\(.*?\)\s*{{'
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

    # Replace await onAdd/onCreate with createMutation
    # We find `await onAdd...({ ... })`
    content = re.sub(r'await (onAdd|onCreate)[a-zA-Z]+\(', 'await createMutation.mutateAsync(', content)
    content = re.sub(r'await (onUpdate)[a-zA-Z]+\(', 'await updateMutation.mutateAsync(', content)
    content = re.sub(r'await (onDelete)[a-zA-Z]+\(', 'await deleteMutation.mutateAsync(', content)

    # Find the mutateAsync payload block to wrap it in zod validation:
    # `await createMutation.mutateAsync({...});`
    # This might be tricky. Let's use a regex to capture it.
    mut_pattern = r'(await createMutation\.mutateAsync\()(\{.*?\})(\);)'
    
    def replacer(match):
        payload = match.group(2)
        return f"""const parsed = {schema_name}.safeParse({payload});
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      await createMutation.mutateAsync(parsed.data);"""

    content = re.sub(mut_pattern, replacer, content, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

process_finance('BankAccounts', '/api/finance/bank-accounts', 'bankAccounts', 'BankAccountSchema')
process_finance('Cashbook', '/api/finance/cashbook', 'cashbook', 'CashTransactionSchema')
process_finance('Expenses', '/api/finance/expenses', 'expenses', 'ExpenseSchema')
process_finance('GstSettings', '/api/finance/gst', 'gstSettings', 'GstSettingSchema')
process_finance('Payments', '/api/finance/payments', 'payments', 'PaymentSchema')
process_finance('Receipts', '/api/finance/receipts', 'receipts', 'ReceiptSchema')
print("Updated finance components")
