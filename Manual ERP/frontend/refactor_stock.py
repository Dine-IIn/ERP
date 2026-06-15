import re

path = 'src/components/inventory/StockOverview.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

if "useQuery" not in code:
    imports = """import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
"""
    code = code.replace("import React from 'react';", "import React from 'react';\n" + imports)

code = re.sub(
    r"interface StockOverviewProps \{([\s\S]*?)\}",
    r"interface StockOverviewProps {\n  adjustments?: StockAdjustment[];\n}",
    code
)

setup_replacement = """  const { data: fetchedAdjustments } = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: () => apiClient.get<StockAdjustment[]>('/api/inventory/adjustments')
  });

  const activeAdjustments = adjustments || fetchedAdjustments || [];
"""
code = code.replace("export default function StockOverview({\n  adjustments\n}: StockOverviewProps) {\n", "export default function StockOverview({\n  adjustments\n}: StockOverviewProps) {\n" + setup_replacement)
code = code.replace("(adjustments || [])", "activeAdjustments")
code = code.replace("adjustments.slice", "activeAdjustments.slice")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
