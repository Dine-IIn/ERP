import re

with open('d:/ERP/Manual ERP/frontend/src/components/crm/Leads.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = re.sub(r"import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { apiClient } from '../../utils/apiService';\nimport { LeadSchema } from '../../utils/schemas';", content)

# 2. Signature
new_sig = """export default React.memo(function Leads() {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await apiClient.get<{leads: Lead[]}>('/api/crm/leads');
      return res.leads || [];
    }
  });

  const { data: companyUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<{users: any[]}>('/api/admin/users');
      return res.users || [];
    }
  });

  const createLead = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/crm/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const updateLead = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiClient.patch(`/api/crm/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const deleteLead = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/crm/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
"""

# Replace interface and sig
content = re.sub(r'interface LeadsProps \{.*?\n\}\n\nconst Leads = React\.memo\(function Leads\(\{.*?\}\: LeadsProps\) \{', new_sig, content, flags=re.DOTALL)

# 3. Handle Submit
submit_pattern = r'const handleSubmit = async \(e: React\.FormEvent\) => \{.*?\n  \};'
new_submit = """const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      companyName: companyName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim(),
      source,
      status,
      assignedToId: assignedToId || null,
      notes: notes.trim() || null
    };

    const parsed = LeadSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr(parsed.error.errors[0].message);
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      if (isEditing && editingId) {
        await updateLead.mutateAsync({ id: editingId, data: parsed.data });
        setLocalSuccess("Lead dossier modified successfully!");
      } else {
        await createLead.mutateAsync(parsed.data);
        setLocalSuccess("New sales lead logged successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process sales lead.");
    } finally {
      setLoading(false);
    }
  };"""

content = re.sub(submit_pattern, new_submit, content, flags=re.DOTALL)

# 4. Handle Delete
delete_pattern = r'const handleDelete = async \(id: string, name: string\) => \{.*?try \{.*?await onDeleteLead\(id\);.*?\} catch \(err: any\) \{.*?\}\n    \}\n  \};'
new_delete = """const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently discard sales lead for '${name}'?`)) {
      try {
        await deleteLead.mutateAsync(id);
      } catch (err: any) {
        alert(err.message || "Failed to discard lead.");
      }
    }
  };"""

content = re.sub(delete_pattern, new_delete, content, flags=re.DOTALL)

# 5. Export
content = re.sub(r'\}\)\n\nexport default Leads;\n', '})\n', content)

with open('d:/ERP/Manual ERP/frontend/src/components/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Updated Leads.tsx")
