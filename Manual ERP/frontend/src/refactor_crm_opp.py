import re

with open('d:/ERP/Manual ERP/frontend/src/components/crm/Opportunities.tsx', 'r') as f:
    content = f.read()

# Imports
content = re.sub(r"import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { apiClient } from '../../utils/apiService';\nimport { OpportunitySchema } from '../../utils/schemas';", content)

new_sig = """export default React.memo(function Opportunities({ currencySymbol = '$' }: { currencySymbol?: string }) {
  const queryClient = useQueryClient();

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await apiClient.get<{opportunities: any[]}>('/api/crm/opportunities');
      return res.opportunities || [];
    }
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await apiClient.get<{leads: any[]}>('/api/crm/leads');
      return res.leads || [];
    }
  });

  const createOpportunity = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/crm/opportunities', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunities'] })
  });

  const updateOpportunity = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiClient.patch(`/api/crm/opportunities/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunities'] })
  });

  const deleteOpportunity = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/crm/opportunities/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunities'] })
  });
"""

# Replace interface and signature
content = re.sub(r'interface OpportunitiesProps \{.*?\n\}\n\nconst Opportunities = React\.memo\(function Opportunities\(\{.*?\}\: OpportunitiesProps\) \{', new_sig, content, flags=re.DOTALL)

# Handle Submit
submit_pattern = r'const handleSubmit = async \(e: React\.FormEvent\) => \{.*?\n  \};'
new_submit = """const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      title: title.trim(),
      leadId: leadId,
      value: value ? parseFloat(value) : 0,
      stage,
      probability: probability ? parseInt(probability, 10) : 50,
      expectedCloseDate: expectedCloseDate || null,
      notes: notes.trim() || null
    };

    const parsed = OpportunitySchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr(parsed.error.errors[0].message);
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      if (isEditing && editingId) {
        await updateOpportunity.mutateAsync({ id: editingId, data: parsed.data });
        setLocalSuccess("Opportunity modified successfully!");
      } else {
        await createOpportunity.mutateAsync(parsed.data);
        setLocalSuccess("Opportunity mapped successfully!");
      }
      setTimeout(() => setShowModal(false), 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process opportunity.");
    } finally {
      setLoading(false);
    }
  };"""

content = re.sub(submit_pattern, new_submit, content, flags=re.DOTALL)

# Handle Delete
delete_pattern = r'const handleDelete = async \(id: string, title: string\) => \{.*?try \{.*?await onDeleteOpportunity\(id\);.*?\} catch \(err: any\) \{.*?\}\n    \}\n  \};'
new_delete = """const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently withdraw opportunity '${title}'?`)) {
      try {
        await deleteOpportunity.mutateAsync(id);
      } catch (err: any) {
        alert(err.message || "Failed to withdraw opportunity.");
      }
    }
  };"""

content = re.sub(delete_pattern, new_delete, content, flags=re.DOTALL)

content = re.sub(r'\}\)\n\nexport default Opportunities;\n', '})\n', content)

with open('d:/ERP/Manual ERP/frontend/src/components/crm/Opportunities.tsx', 'w') as f:
    f.write(content)
print("Updated Opportunities.tsx")
