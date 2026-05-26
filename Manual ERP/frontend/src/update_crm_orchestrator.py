import os

path = r"d:\ERP\Manual ERP\frontend\src\components\crm\CrmModule.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

content = "".join(lines)

# 1. Add subcomponent imports at the top
imports = """import { CrmDashboard } from './CrmDashboard';
import { CrmLeads } from './CrmLeads';
import { CrmCustomers } from './CrmCustomers';
import { CrmPipeline } from './CrmPipeline';
import { CrmFollowups } from './CrmFollowups';
import { CrmOpportunities } from './CrmOpportunities';
import { CrmStages } from './CrmStages';
import { CrmNotes } from './CrmNotes';
"""

# Let's insert these imports right after standard imports
standard_imports_end = "import {\n  Users, Activity, PhoneCall, Calendar, Target,\n  BarChart3, Plus, Search, Filter, Download, MoreHorizontal,\n  MessageSquare, Mail, Phone, ArrowUpRight, ArrowDownRight, Briefcase,\n  CheckCircle2, AlertCircle, FileText, Settings, Sliders\n} from 'lucide-react';"

if standard_imports_end in content:
    content = content.replace(standard_imports_end, standard_imports_end + "\n" + imports)
else:
    # Fallback to general lucide-react import
    content = "import { apiClient } from '../../utils/apiService';\nimport React, { useState, useEffect } from 'react';\n" + imports + content[content.find("import {"): ]

# 2. Replace Content Area
start_marker = "      {/* Content Area */}\n      <div className=\"flex-1 overflow-hidden\">"
end_marker = "      </div>\n\n      {/* ==========================================\n          MODALS CORE DRAWERS"

replacement = """      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && (
          <CrmDashboard 
            dashboardStats={dashboardStats}
            leads={leads}
            followups={followups}
          />
        )}

        {currentTab === 'leads' && (
          <CrmLeads 
            leads={leads}
            handleQualifyLead={handleQualifyLead}
            renderTable={renderTable}
          />
        )}

        {currentTab === 'customers' && (
          <CrmCustomers 
            customers={customers}
            renderTable={renderTable}
          />
        )}

        {currentTab === 'pipeline' && (
          <CrmPipeline 
            pipelineStages={pipelineStages}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setShowLeadModal={setShowLeadModal}
            Clock={Clock}
          />
        )}

        {currentTab === 'followups' && (
          <CrmFollowups 
            followups={followups}
            renderTable={renderTable}
          />
        )}

        {currentTab === 'opportunities' && (
          <CrmOpportunities 
            opportunities={opportunities}
            handleWinDeal={handleWinDeal}
            renderTable={renderTable}
          />
        )}

        {currentTab === 'stages' && (
          <CrmStages 
            pipelineStages={pipelineStages}
            renderTable={renderTable}
          />
        )}

        {currentTab === 'notes' && (
          <CrmNotes 
            communications={communications}
            renderTable={renderTable}
          />
        )}
      </div>"""

# Let's locate the content area block and replace it
# We will find the index of `{/* Content Area */}` and the index of `MODALS CORE DRAWERS`
start_idx = content.find("      {/* Content Area */}")
end_idx = content.find("      {/* ==========================================\n          MODALS CORE DRAWERS")

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + replacement + "\n\n" + content[end_idx:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("CRM Orchestrator updated successfully.")
else:
    print(f"Error finding markers. start_idx={start_idx}, end_idx={end_idx}")
