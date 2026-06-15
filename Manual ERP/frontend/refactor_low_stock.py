import re

path = 'src/components/inventory/LowStockAlerts.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

if "useQuery" not in code:
    imports = """import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
"""
    code = code.replace("import React from 'react';", "import React from 'react';\n" + imports)

code = re.sub(
    r"interface LowStockAlertsProps \{([\s\S]*?)\}",
    r"interface LowStockAlertsProps {\n  products?: Product[];\n  onTriggerReorderRedirect?: () => void;\n}",
    code
)

setup_replacement = """  const { data: fetchedProducts } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => apiClient.get<Product[]>('/api/inventory/products')
  });

  const activeProducts = products || fetchedProducts || [];
"""
code = code.replace("export default function LowStockAlerts({\n  products,\n  onTriggerReorderRedirect\n}: LowStockAlertsProps) {\n", "export default function LowStockAlerts({\n  products,\n  onTriggerReorderRedirect\n}: LowStockAlertsProps) {\n" + setup_replacement)
code = code.replace("(products || [])", "activeProducts")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
