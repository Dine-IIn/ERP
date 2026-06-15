import re

path = 'src/components/inventory/CompleteInventoryView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

if "useQuery" not in code:
    imports = """import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
"""
    code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + imports)

code = re.sub(
    r"interface CompleteInventoryViewProps \{([\s\S]*?)\}",
    r"interface CompleteInventoryViewProps {\n  products?: Product[];\n  currencySymbol?: string;\n}",
    code
)

setup_replacement = """  const { data: fetchedProducts } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => apiClient.get<Product[]>('/api/inventory/products')
  });

  const activeProducts = products || fetchedProducts || [];

  const [searchTerm, setSearchTerm] = useState('');"""
code = code.replace("  const [searchTerm, setSearchTerm] = useState('');", setup_replacement, 1)

code = code.replace("(products || [])", "activeProducts")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
