import re

with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For CRM leads
content = re.sub(r'<Leads\s+leads=\{leadsList\}\s+companyUsers=\{companyUsers\}\s+onCreateLead=\{handleCreateLead\}\s+onUpdateLead=\{handleUpdateLead\}\s+onDeleteLead=\{handleDeleteLead\}\s+/>', '<Leads />', content)

# For CRM opportunities
content = re.sub(r'<Opportunities\s+opportunities=\{opportunitiesList\}\s+leads=\{leadsList\}\s+onCreateOpportunity=\{handleCreateOpportunity\}\s+onUpdateOpportunity=\{handleUpdateOpportunity\}\s+onDeleteOpportunity=\{handleDeleteOpportunity\}\s+currencySymbol=\{currencySymbol\}\s+/>', '<Opportunities currencySymbol={currencySymbol} />', content)

# For CRM followups
content = re.sub(r'<FollowUps\s+followups=\{followupsList\}\s+leads=\{leadsList\}\s+opportunities=\{opportunitiesList\}\s+onCreateFollowUp=\{handleCreateFollowUp\}\s+onUpdateFollowUp=\{handleUpdateFollowUp\}\s+onDeleteFollowUp=\{handleDeleteFollowUp\}\s+/>', '<FollowUps />', content)

with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed App.tsx")
