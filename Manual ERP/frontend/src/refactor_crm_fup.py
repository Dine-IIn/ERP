import re

with open('d:/ERP/Manual ERP/frontend/src/components/crm/FollowUps.tsx', 'r') as f:
    content = f.read()

# Imports
content = re.sub(r"import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { apiClient } from '../../utils/apiService';\nimport { FollowUpSchema } from '../../utils/schemas';", content)

new_sig = """export default React.memo(function FollowUps() {
  const queryClient = useQueryClient();

  const { data: followups = [] } = useQuery({
    queryKey: ['followups'],
    queryFn: async () => {
      const res = await apiClient.get<{followups: any[]}>('/api/crm/followups');
      return res.followups || [];
    }
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await apiClient.get<{leads: any[]}>('/api/crm/leads');
      return res.leads || [];
    }
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await apiClient.get<{opportunities: any[]}>('/api/crm/opportunities');
      return res.opportunities || [];
    }
  });

  const createFollowUp = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/crm/followups', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followups'] })
  });

  const updateFollowUp = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiClient.patch(`/api/crm/followups/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followups'] })
  });

  const deleteFollowUp = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/crm/followups/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followups'] })
  });
"""

content = re.sub(r'interface FollowUpsProps \{.*?\n\}\n\nconst FollowUps = React\.memo\(function FollowUps\(\{.*?\}\: FollowUpsProps\) \{', new_sig, content, flags=re.DOTALL)

submit_pattern = r'const handleSubmit = async \(e: React\.FormEvent\) => \{.*?\n  \};'
new_submit = """const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      entityType,
      entityId,
      followUpDate,
      type,
      status,
      notes: notes.trim() || null
    };

    const parsed = FollowUpSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr(parsed.error.errors[0].message);
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      if (isEditing && editingId) {
        await updateFollowUp.mutateAsync({ id: editingId, data: parsed.data });
        setLocalSuccess("Schedule updated successfully!");
      } else {
        await createFollowUp.mutateAsync(parsed.data);
        setLocalSuccess("Task scheduled successfully!");
      }
      setTimeout(() => setShowModal(false), 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to save schedule.");
    } finally {
      setLoading(false);
    }
  };"""

content = re.sub(submit_pattern, new_submit, content, flags=re.DOTALL)

delete_pattern = r'const handleDelete = async \(id: string\) => \{.*?try \{.*?await onDeleteFollowUp\(id\);.*?\} catch \(err: any\) \{.*?\}\n    \}\n  \};'
new_delete = """const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      try {
        await deleteFollowUp.mutateAsync(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete schedule.");
      }
    }
  };"""

content = re.sub(delete_pattern, new_delete, content, flags=re.DOTALL)

content = re.sub(r'\}\)\n\nexport default FollowUps;\n', '})\n', content)

with open('d:/ERP/Manual ERP/frontend/src/components/crm/FollowUps.tsx', 'w') as f:
    f.write(content)
print("Updated FollowUps.tsx")
