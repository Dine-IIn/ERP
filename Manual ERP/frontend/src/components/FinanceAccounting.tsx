import { apiClient } from '../utils/apiService';

const fetchProxy = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem('erp_token');
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const res = await window.fetch(input, {
    ...init,
    headers
  });
  
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    window.dispatchEvent(new Event('auth-expired'));
  }
  
  return res;
};

import { useState, useEffect } from 'react';
import {
  DollarSign,
  BookOpen,
  TrendingUp,
  BarChart3,
  Calendar,
  Plus,
  Check,
  CheckCircle,
  AlertTriangle,
  History,
  Coins,
  UploadCloud,
  Trash2,
  Lock
} from 'lucide-react';

interface FinanceProps {
  user: {
    id?: string;
    username: string;
    companyCode: string;
    role: string | null;
    isSuperAdmin: boolean;
  };
  token: string;
  backendUrl: string;
  activeSubModule?: string;
  initialTab?: TabType;
  initialSubTab?: string;
}

type TabType =
  | 'general_ledger'
  | 'financial_statements'
  | 'subledgers'
  | 'fixed_assets'
  | 'budgets_reconciliation'
  | 'fiscal_periods'
  | 'expense_tracking'
  | 'gst_management'
  | 'tax_management'
  | 'financial_reports'
  | 'voucher_system';
type StatementType = 'trial_balance' | 'profit_loss' | 'balance_sheet' | 'cash_flow';
type SubledgerType = 'receivables' | 'payables';

export default function FinanceAccounting({
  user: _user,
  token,
  backendUrl,
  activeSubModule,
  initialTab,
  initialSubTab
}: FinanceProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general_ledger');
  const [statementSubTab, setStatementSubTab] = useState<StatementType>('trial_balance');
  const [subledgerSubTab, setSubledgerSubTab] = useState<SubledgerType>('receivables');
  const [budgetsReconSubTab, setBudgetsReconSubTab] = useState<'budgets' | 'reconciliation'>('budgets');

  // Sidebar deep link sync
  useEffect(() => {
    if (activeSubModule) {
      switch (activeSubModule) {
        case 'FINANCE_LEDGER':
          setActiveTab('general_ledger');
          break;
        case 'FINANCE_JOURNAL':
          setActiveTab('general_ledger');
          break;
        case 'FINANCE_TRIAL_BALANCE':
          setActiveTab('financial_statements');
          setStatementSubTab('trial_balance');
          break;
        case 'FINANCE_PNL':
          setActiveTab('financial_statements');
          setStatementSubTab('profit_loss');
          break;
        case 'FINANCE_BALANCE_SHEET':
          setActiveTab('financial_statements');
          setStatementSubTab('balance_sheet');
          break;
        case 'FINANCE_CASH_FLOW':
          setActiveTab('financial_statements');
          setStatementSubTab('cash_flow');
          break;
        case 'FINANCE_AR':
          setActiveTab('subledgers');
          setSubledgerSubTab('receivables');
          break;
        case 'FINANCE_AP':
          setActiveTab('subledgers');
          setSubledgerSubTab('payables');
          break;
        case 'FINANCE_EXPENSE':
          setActiveTab('expense_tracking');
          break;
        case 'FINANCE_GST':
          setActiveTab('gst_management');
          break;
        case 'FINANCE_TAX':
          setActiveTab('tax_management');
          break;
        case 'FINANCE_ASSET':
        case 'FINANCE_DEPRECIATION':
          setActiveTab('fixed_assets');
          break;
        case 'FINANCE_BUDGET':
          setActiveTab('budgets_reconciliation');
          setBudgetsReconSubTab('budgets');
          break;
        case 'FINANCE_BANK_RECON':
          setActiveTab('budgets_reconciliation');
          setBudgetsReconSubTab('reconciliation');
          break;
        case 'FINANCE_REPORTS':
          setActiveTab('financial_reports');
          break;
        case 'FINANCE_VOUCHER':
          setActiveTab('voucher_system');
          break;
        case 'FINANCE_FISCAL_YEAR':
          setActiveTab('fiscal_periods');
          break;
        default:
          break;
      }
    }
  }, [activeSubModule]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialSubTab) {
      if (['trial_balance', 'profit_loss', 'balance_sheet', 'cash_flow'].includes(initialSubTab)) {
        setStatementSubTab(initialSubTab as StatementType);
      } else if (['receivables', 'payables'].includes(initialSubTab)) {
        setSubledgerSubTab(initialSubTab as SubledgerType);
      } else if (['budgets', 'reconciliation'].includes(initialSubTab)) {
        setBudgetsReconSubTab(initialSubTab as 'budgets' | 'reconciliation');
      }
    }
  }, [initialSubTab]);

  // Shared Data States
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [activeFiscalYear, setActiveFiscalYear] = useState<any>(null);

  // General Ledger States
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('');
  const [ledgerStatement, setLedgerStatement] = useState<any>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherHeader, setVoucherHeader] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    postingDate: new Date().toISOString().split('T')[0],
    reference: '',
    narration: ''
  });
  const [voucherLines, setVoucherLines] = useState<any[]>([
    { accountId: '', debit: '', credit: '', narration: '', customerId: '', vendorId: '' },
    { accountId: '', debit: '', credit: '', narration: '', customerId: '', vendorId: '' }
  ]);

  // Dropdown master helper states
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Financial Reports States
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [profitLossData, setProfitLossData] = useState<any>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any>(null);

  // Subledger States
  const [customerAging, setCustomerAging] = useState<any[]>([]);
  const [vendorAging, setVendorAging] = useState<any[]>([]);

  // Fixed Asset States
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    assetCode: '',
    assetName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeYears: '5',
    salvageValue: '0'
  });

  // Budgets States
  const [budgets, setBudgets] = useState<any[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    fiscalYearId: '',
    accountId: '',
    allocatedAmount: ''
  });

  // Bank Reconciliation States
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [showBankAccModal, setShowBankAccModal] = useState(false);
  const [newBankAcc, setNewBankAcc] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    glAccountId: ''
  });
  const [reconciliationConsole, setReconciliationConsole] = useState<any>(null);
  const [statementUpload, setStatementUpload] = useState({
    statementDate: new Date().toISOString().split('T')[0],
    openingBalance: '',
    closingBalance: '',
    rawCsv: ''
  });

  // Fiscal Periods States
  const [showFiscalYearModal, setShowFiscalYearModal] = useState(false);
  const [newFiscalYear, setNewFiscalYear] = useState({
    yearName: '',
    startDate: '',
    endDate: ''
  });

  // UI status helper states
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Show status popup
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ==========================================
  // API DISPATCH LOADERS
  // ==========================================

  const loadBaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Accounts
      const accRes = await fetchProxy(`${backendUrl}/api/finance/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const accData = await accRes.json();
      if (accRes.ok) setAccounts(accData.accounts);

      // 2. Fetch Fiscal Years
      const fyRes = await fetchProxy(`${backendUrl}/api/finance/fiscal-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fyData = await fyRes.json();
      if (fyRes.ok) {
        setFiscalYears(fyData.years);
        const active = fyData.years.find((y: any) => y.status === 'ACTIVE');
        if (active) setActiveFiscalYear(active);
      }

      // 3. Fetch Customers & Vendors for subledger selection mapping
      const custRes = await fetchProxy(`${backendUrl}/api/mdm/customer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const custData = await custRes.json();
      if (custRes.ok) setCustomers(custData.data || []);

      const vendRes = await fetchProxy(`${backendUrl}/api/mdm/vendor`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const vendData = await vendRes.json();
      if (vendRes.ok) setVendors(vendData.data || []);

      // 4. Fetch Journal Entries
      const jeRes = await fetchProxy(`${backendUrl}/api/finance/journal-entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const jeData = await jeRes.json();
      if (jeRes.ok) setJournalEntries(jeData.entries);

    } catch (err: any) {
      showToast("Connection failure during finance initialization", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, [backendUrl, token]);

  // Ledger history statement loader
  const loadLedgerStatement = async (accountId: string) => {
    if (!accountId) return;
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/account/${accountId}/ledger`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLedgerStatement(data);
    } catch (err) {
      showToast("Failed to fetch account ledger statements", "error");
    }
  };

  useEffect(() => {
    if (selectedLedgerAccount) {
      loadLedgerStatement(selectedLedgerAccount);
    }
  }, [selectedLedgerAccount]);

  // Load Financial Statements
  const loadStatements = async () => {
    try {
      if (statementSubTab === 'trial_balance') {
        const res = await fetchProxy(`${backendUrl}/api/finance/reports/trial-balance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setTrialBalanceData(data);
      } else if (statementSubTab === 'profit_loss') {
        const res = await fetchProxy(`${backendUrl}/api/finance/reports/profit-loss`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setProfitLossData(data);
      } else if (statementSubTab === 'balance_sheet') {
        const res = await fetchProxy(`${backendUrl}/api/finance/reports/balance-sheet`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setBalanceSheetData(data);
      } else if (statementSubTab === 'cash_flow') {
        const res = await fetchProxy(`${backendUrl}/api/finance/reports/cash-flow`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setCashFlowData(data);
      }
    } catch (err) {
      showToast("Error loading dynamic statements", "error");
    }
  };

  useEffect(() => {
    loadStatements();
  }, [statementSubTab, activeTab]);

  // Load Subledger Aging summaries
  const loadSubledgers = async () => {
    try {
      if (subledgerSubTab === 'receivables') {
        const res = await fetchProxy(`${backendUrl}/api/finance/reports/aging/customer`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setCustomerAging(data.aging);
      } else {
        const res = await fetchProxy(`${backendUrl}/api/finance/reports/aging/vendor`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setVendorAging(data.aging);
      }
    } catch (err) {
      showToast("Error fetching subledger data", "error");
    }
  };

  useEffect(() => {
    loadSubledgers();
  }, [subledgerSubTab, activeTab]);

  // Load Fixed Assets
  const loadAssets = async () => {
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAssets(data.assets);
        if (data.assets.length > 0 && !selectedAsset) {
          setSelectedAsset(data.assets[0]);
        }
      }
    } catch (err) {
      showToast("Error fetching assets register", "error");
    }
  };

  useEffect(() => {
    loadAssets();
  }, [activeTab]);

  // Load Budgets & Bank Accounts
  const loadBudgetsAndBank = async () => {
    try {
      const budRes = await fetchProxy(`${backendUrl}/api/finance/budgets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const budData = await budRes.json();
      if (budRes.ok) setBudgets(budData.budgets);

      const bankRes = await fetchProxy(`${backendUrl}/api/finance/bank-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bankData = await bankRes.json();
      if (bankRes.ok) {
        setBankAccounts(bankData.bankAccounts);
        if (bankData.bankAccounts.length > 0 && !selectedBankAccount) {
          setSelectedBankAccount(bankData.bankAccounts[0].id);
        }
      }
    } catch (err) {
      showToast("Error loading budgeting reconciliation models", "error");
    }
  };

  useEffect(() => {
    loadBudgetsAndBank();
  }, [activeTab]);

  // Bank console unreconciled transaction fetcher
  const loadReconciliationConsole = async () => {
    if (!selectedBankAccount) return;
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/bank-account/${selectedBankAccount}/unreconciled`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setReconciliationConsole(data);
    } catch (err) {
      showToast("Failed to fetch bank reconciliation items", "error");
    }
  };

  useEffect(() => {
    if (selectedBankAccount && budgetsReconSubTab === 'reconciliation') {
      loadReconciliationConsole();
    }
  }, [selectedBankAccount, budgetsReconSubTab]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // Post double entry journal entry
  const handlePostJournalVoucher = async () => {
    // Basic verification
    const filteredLines = voucherLines.filter(l => l.accountId && (parseFloat(l.debit || 0) > 0 || parseFloat(l.credit || 0) > 0));
    if (filteredLines.length < 2) {
      showToast("Voucher lines must contain at least 2 entries with accounts and amounts", "warning");
      return;
    }

    let totalDeb = 0;
    let totalCred = 0;
    for (const l of filteredLines) {
      totalDeb += parseFloat(l.debit || 0);
      totalCred += parseFloat(l.credit || 0);
    }

    if (Math.abs(totalDeb - totalCred) > 0.01) {
      showToast(`Imbalanced double-entry: Total Debit ($${totalDeb.toFixed(2)}) must equal Total Credit ($${totalCred.toFixed(2)})`, "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/journal-entry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...voucherHeader,
          lines: filteredLines
        })
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Double-entry journal voucher posted successfully", "success");
        setShowVoucherModal(false);
        // Reset form
        setVoucherLines([
          { accountId: '', debit: '', credit: '', narration: '', customerId: '', vendorId: '' },
          { accountId: '', debit: '', credit: '', narration: '', customerId: '', vendorId: '' }
        ]);
        setVoucherHeader({
          entryDate: new Date().toISOString().split('T')[0],
          postingDate: new Date().toISOString().split('T')[0],
          reference: '',
          narration: ''
        });
        loadBaseData();
        if (selectedLedgerAccount) loadLedgerStatement(selectedLedgerAccount);
      } else {
        showToast(data.error || "Failed to post voucher", "error");
      }
    } catch (err) {
      showToast("Voucher posting exception occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add asset creation
  const handleCreateAsset = async () => {
    if (!newAsset.assetCode || !newAsset.assetName || !newAsset.purchaseCost) {
      showToast("Please fill in all mandatory asset master fields", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/asset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newAsset)
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Asset registered and depreciation schedule generated", "success");
        setShowAssetModal(false);
        setNewAsset({
          assetCode: '',
          assetName: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseCost: '',
          depreciationMethod: 'STRAIGHT_LINE',
          usefulLifeYears: '5',
          salvageValue: '0'
        });
        loadAssets();
      } else {
        showToast(data.error || "Failed to create asset", "error");
      }
    } catch (err) {
      showToast("Error creating asset record", "error");
    } finally {
      setLoading(false);
    }
  };

  // Post asset depreciation schedules
  const handlePostDepreciation = async (scheduleId: string) => {
    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/asset/depreciate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ scheduleId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Depreciation schedule posted to General Ledger", "success");
        loadAssets();
        loadBaseData();
      } else {
        showToast(data.error || "Failed to post depreciation", "error");
      }
    } catch (err) {
      showToast("Depreciation GL posting exception", "error");
    } finally {
      setLoading(false);
    }
  };

  // Create budget
  const handleCreateBudget = async () => {
    if (!newBudget.fiscalYearId || !newBudget.accountId || !newBudget.allocatedAmount) {
      showToast("Please select year, GL account and allocated limit", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newBudget)
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Budget allocation limit target stored", "success");
        setShowBudgetModal(false);
        setNewBudget({ fiscalYearId: '', accountId: '', allocatedAmount: '' });
        loadBudgetsAndBank();
      } else {
        showToast(data.error || "Failed to save budget", "error");
      }
    } catch (err) {
      showToast("Error setting budget limit", "error");
    } finally {
      setLoading(false);
    }
  };

  // Link bank account
  const handleCreateBankAcc = async () => {
    if (!newBankAcc.accountName || !newBankAcc.accountNumber || !newBankAcc.bankName || !newBankAcc.glAccountId) {
      showToast("Please fill in all bank integration fields", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/bank-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newBankAcc)
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Bank account integrated successfully", "success");
        setShowBankAccModal(false);
        setNewBankAcc({ accountName: '', accountNumber: '', bankName: '', glAccountId: '' });
        loadBudgetsAndBank();
      } else {
        showToast(data.error || "Failed to register bank account", "error");
      }
    } catch (err) {
      showToast("Reconciliation bank registration error", "error");
    } finally {
      setLoading(false);
    }
  };

  // Upload Statement lines
  const handleUploadStatement = async () => {
    if (!selectedBankAccount || !statementUpload.rawCsv) {
      showToast("Please enter bank statement details and mock lines CSV", "warning");
      return;
    }

    // Parse mock CSV lines: YYYY-MM-DD, Description, Amount, Reference
    const rows = statementUpload.rawCsv.trim().split('\n');
    const parsedLines: any[] = [];
    
    try {
      for (const row of rows) {
        const cols = row.split(',');
        if (cols.length < 3) continue;
        parsedLines.push({
          transactionDate: cols[0].trim(),
          description: cols[1].trim(),
          amount: parseFloat(cols[2].trim()),
          reference: cols[3] ? cols[3].trim() : ''
        });
      }
    } catch (e) {
      showToast("Failed to parse statement rows. Correct layout: YYYY-MM-DD, Desc, Amount, Ref", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/bank-account/${selectedBankAccount}/statement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          statementDate: statementUpload.statementDate,
          openingBalance: statementUpload.openingBalance,
          closingBalance: statementUpload.closingBalance,
          lines: parsedLines
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Statement uploaded. Run automatic matching reconciliation.", "success");
        setStatementUpload({
          statementDate: new Date().toISOString().split('T')[0],
          openingBalance: '',
          closingBalance: '',
          rawCsv: ''
        });
        loadReconciliationConsole();
      } else {
        showToast(data.error || "Upload statement failed", "error");
      }
    } catch (err) {
      showToast("Reconciliation statement upload error", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reconcile bank transaction
  const handleReconcileBank = async (bankLineId: string, glEntryId: string) => {
    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/bank-reconcile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          statementLineId: bankLineId,
          journalEntryId: glEntryId
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Transaction matched and reconciled successfully", "success");
        loadReconciliationConsole();
      } else {
        showToast(data.error || "Failed matching item", "error");
      }
    } catch (err) {
      showToast("Reconciliation pairing exception", "error");
    } finally {
      setLoading(false);
    }
  };

  // Create Fiscal period
  const handleCreateFiscalYear = async () => {
    if (!newFiscalYear.yearName || !newFiscalYear.startDate || !newFiscalYear.endDate) {
      showToast("Please enter fiscal year code name and duration dates", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/fiscal-year`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newFiscalYear)
      });
      const data = await res.json();
      if (res.ok) {
        showToast("New fiscal year successfully created", "success");
        setShowFiscalYearModal(false);
        setNewFiscalYear({ yearName: '', startDate: '', endDate: '' });
        loadBaseData();
      } else {
        showToast(data.error || "Overlapping year creation failed", "error");
      }
    } catch (err) {
      showToast("Fiscal period creation exception", "error");
    } finally {
      setLoading(false);
    }
  };

  // Year End Closing rollover
  const handleCloseFiscalYear = async (id: string) => {
    if (!confirm("Are you sure you want to perform the SAP Year-End ledger closing period? This will reset all Revenue/Expense balances and rollover Retained Earnings.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetchProxy(`${backendUrl}/api/finance/fiscal-year/${id}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Year-end roll-overs completed and ledger closed successfully", "success");
        loadBaseData();
      } else {
        showToast(data.error || "Closing failed", "error");
      }
    } catch (err) {
      showToast("Period closure operation failure", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto select-none animate-fade-in relative text-left">
      {/* Dynamic Glassmorphic Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[var(--bg-primary)]/40 backdrop-blur-[2px] z-50 flex items-start justify-center pt-24 pointer-events-none select-none">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold text-xs shadow-2xl backdrop-blur-md animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
            Syncing Ledger Engine...
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl backdrop-blur-md animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
          'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        
        {/* Module Header */}
        <div className="px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--text-primary)] font-display flex items-center gap-2">
                Finance & Accounting Hub
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                Double-Entry General Ledger, Real-time Trial Balances, Fixed Assets Schedulers, Budgets and Bank Matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeFiscalYear ? (
              <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-left">
                <span className="text-[8px] font-bold text-indigo-400 block tracking-widest uppercase">ACTIVE PERIOD</span>
                <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{activeFiscalYear.yearName}</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-left">
                <span className="text-[8px] font-bold text-rose-400 block tracking-widest uppercase">NO ACTIVE YEAR</span>
                <span className="text-xs font-bold text-[var(--text-primary)] font-mono">CLOSED</span>
              </div>
            )}
            
            <button
              onClick={loadBaseData}
              className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              title="Sync Ledger Data"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Outer Tabs Layout */}
        <div className="flex flex-col min-h-[580px]">

          {/* Active View Details Panel */}
          <div className="p-6 bg-[var(--bg-secondary)] overflow-y-auto max-h-[640px]">
            
            {/* VIEW A: GENERAL LEDGER */}
            {activeTab === 'general_ledger' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Double-Entry Ledger Operations</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Post new double-entry vouchers or view individual general ledger balances</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!activeFiscalYear) {
                        showToast("Please open an active fiscal year first before posting entries", "warning");
                        return;
                      }
                      setShowVoucherModal(true);
                    }}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Post Journal Voucher
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Account Selector Card */}
                  <div className="md:col-span-1 bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] rounded-xl p-4 space-y-4">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Inspect Account Statement</span>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">Select GL Account</label>
                      <select
                        value={selectedLedgerAccount}
                        onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="">-- Choose Account --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.accountCode}] {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {ledgerStatement && (
                      <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] text-[var(--text-secondary)]">Account Class</span>
                          <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-[9px]">{ledgerStatement.account.accountType}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] text-[var(--text-secondary)]">Total Current Balance</span>
                          <span className="font-mono font-bold text-emerald-500">${ledgerStatement.account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account Ledger Statements */}
                  <div className="md:col-span-2 bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-xl overflow-hidden min-h-[220px] flex flex-col">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)]">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Account Ledger Entry History</span>
                    </div>

                    {!ledgerStatement ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <History className="w-8 h-8 text-[var(--text-muted)]" />
                        <p className="text-xs text-[var(--text-secondary)] font-semibold">Select an account in the left panel to inspect postings</p>
                      </div>
                    ) : ledgerStatement.ledger.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-1">
                        <AlertTriangle className="w-7 h-7 text-amber-500/80" />
                        <p className="text-xs text-[var(--text-secondary)]">No posted entries registered for this account yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 text-[var(--text-muted)] font-bold">
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3">Voucher #</th>
                              <th className="py-2 px-3">Narration</th>
                              <th className="py-2 px-3 text-right">Debit</th>
                              <th className="py-2 px-3 text-right">Credit</th>
                              <th className="py-2 px-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerStatement.ledger.map((line: any) => (
                              <tr key={line.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[10px]">{new Date(line.postingDate).toLocaleDateString()}</td>
                                <td className="py-2.5 px-3 font-bold text-indigo-400">{line.entryNumber}</td>
                                <td className="py-2.5 px-3 max-w-[140px] truncate" title={line.narration}>{line.narration}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{line.debit > 0 ? `$${line.debit.toFixed(2)}` : '-'}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-amber-400">{line.credit > 0 ? `$${line.credit.toFixed(2)}` : '-'}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--text-primary)]">${line.runningBalance.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Journal Vouchers Roll */}
                <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-xl overflow-hidden mt-6">
                  <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)]">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Recent Posted Vouchers Log</span>
                  </div>
                  {journalEntries.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)]">No journal entries recorded.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 text-[var(--text-muted)] font-bold">
                            <th className="py-2.5 px-4">Post Date</th>
                            <th className="py-2.5 px-4">Voucher ID</th>
                            <th className="py-2.5 px-4">Narration / Reference</th>
                            <th className="py-2.5 px-4">Accounts Involved</th>
                            <th className="py-2.5 px-4 text-right">Debit / Credit Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journalEntries.map((je: any) => {
                            const sum = je.lines.reduce((tot: number, l: any) => tot + l.debit, 0);
                            return (
                              <tr key={je.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                                <td className="py-3 px-4 font-mono">{new Date(je.postingDate).toLocaleDateString()}</td>
                                <td className="py-3 px-4 font-bold text-indigo-400">{je.entryNumber}</td>
                                <td className="py-3 px-4">
                                  <span className="block font-semibold text-[var(--text-primary)]">{je.narration}</span>
                                  {je.reference && <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1 rounded font-bold font-mono">Ref: {je.reference}</span>}
                                </td>
                                <td className="py-3 px-4 text-[10px] space-y-0.5">
                                  {je.lines.map((l: any, i: number) => (
                                    <div key={i} className="flex justify-between gap-4">
                                      <span className="text-[var(--text-secondary)]">[{l.account.accountCode}] {l.account.accountName}</span>
                                      <span className="font-mono text-[9px] font-bold text-[var(--text-muted)]">
                                        {l.debit > 0 ? `Db $${l.debit.toFixed(2)}` : `Cr $${l.credit.toFixed(2)}`}
                                      </span>
                                    </div>
                                  ))}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">${sum.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW B: FINANCIAL STATEMENTS */}
            {activeTab === 'financial_statements' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Real-Time Financial Reporting</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Accordion statement tables computed live from general ledger logs</p>
                  </div>

                  {/* Sub tabs */}
                  <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-1 gap-1 text-[10px] font-bold">
                    <button
                      onClick={() => setStatementSubTab('trial_balance')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${statementSubTab === 'trial_balance' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      Trial Balance
                    </button>
                    <button
                      onClick={() => setStatementSubTab('profit_loss')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${statementSubTab === 'profit_loss' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      Profit & Loss
                    </button>
                    <button
                      onClick={() => setStatementSubTab('balance_sheet')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${statementSubTab === 'balance_sheet' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      Balance Sheet
                    </button>
                    <button
                      onClick={() => setStatementSubTab('cash_flow')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${statementSubTab === 'cash_flow' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      Cash Flow
                    </button>
                  </div>
                </div>

                {/* Sub Tab Contents */}
                <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-6">
                  
                  {/* TRIAL BALANCE */}
                  {statementSubTab === 'trial_balance' && trialBalanceData && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Double-Entry Account Totals Trial Balance</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                              <th className="py-2.5 px-4">Account Code</th>
                              <th className="py-2.5 px-4">Account Name</th>
                              <th className="py-2.5 px-4">Classification</th>
                              <th className="py-2.5 px-4 text-right font-mono">Debit Balance</th>
                              <th className="py-2.5 px-4 text-right font-mono">Credit Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trialBalanceData.trialBalance.map((row: any) => (
                              <tr key={row.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                                <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">{row.accountCode}</td>
                                <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)]">{row.accountName}</td>
                                <td className="py-2.5 px-4 text-[10px] text-[var(--text-secondary)]">{row.accountType}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-emerald-400">{row.totalDebit > 0 ? `$${row.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-amber-400">{row.totalCredit > 0 ? `$${row.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}</td>
                              </tr>
                            ))}
                            {/* Grand Totals */}
                            <tr className="bg-[var(--bg-tertiary)] font-bold text-[var(--text-primary)] border-t-2 border-[var(--border-color)]">
                              <td colSpan={3} className="py-3 px-4 uppercase text-[10px] tracking-wider font-bold">Grand Debit / Credit Trial Balance Totals</td>
                              <td className="py-3 px-4 text-right font-mono text-emerald-400 text-sm">${trialBalanceData.grandDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 px-4 text-right font-mono text-amber-400 text-sm">${trialBalanceData.grandCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {Math.abs(trialBalanceData.grandDebit - trialBalanceData.grandCredit) <= 0.01 ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center gap-2">
                          <Check className="w-4 h-4" /> LEDGER TRIAL BALANCE EQUILIBRIUM: PERFECTLY BALANCED
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> TRIAL BALANCE IMBALANCE: WARNING CHECK GENERAL POSTINGS
                        </div>
                      )}
                    </div>
                  )}

                  {/* PROFIT & LOSS */}
                  {statementSubTab === 'profit_loss' && profitLossData && (
                    <div className="space-y-6">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Corporate Profit & Loss Statement (Income Statement)</span>
                      
                      {/* Revenues */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">I. Operating Revenues</h5>
                        <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
                          {profitLossData.revenues.length === 0 ? (
                            <div className="p-4 text-xs text-[var(--text-secondary)]">No revenue accounts with active balances.</div>
                          ) : (
                            <table className="w-full text-xs text-left border-collapse">
                              <tbody>
                                {profitLossData.revenues.map((r: any) => (
                                  <tr key={r.id} className="border-b border-[var(--border-color)]">
                                    <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)]">[{r.accountCode}] {r.accountName}</td>
                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[var(--text-primary)]">${r.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                                <tr className="bg-[var(--bg-tertiary)]/60 font-bold text-[var(--text-primary)]">
                                  <td className="py-2.5 px-4 uppercase text-[9px] tracking-widest text-[var(--text-secondary)]">Total Gross Revenues</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-emerald-400">${profitLossData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      {/* Expenses */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider">II. Operating Expenses</h5>
                        <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
                          {profitLossData.expenses.length === 0 ? (
                            <div className="p-4 text-xs text-[var(--text-secondary)]">No recorded operating expenses.</div>
                          ) : (
                            <table className="w-full text-xs text-left border-collapse">
                              <tbody>
                                {profitLossData.expenses.map((e: any) => (
                                  <tr key={e.id} className="border-b border-[var(--border-color)]">
                                    <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)]">[{e.accountCode}] {e.accountName}</td>
                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[var(--text-primary)]">${e.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                                <tr className="bg-[var(--bg-tertiary)]/60 font-bold text-[var(--text-primary)]">
                                  <td className="py-2.5 px-4 uppercase text-[9px] tracking-widest text-[var(--text-secondary)]">Total Operating Expenses</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-amber-400">${profitLossData.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      {/* Summary Net Income */}
                      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-4 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">NET OPERATING INCOME / (LOSS)</span>
                        <span className={`font-mono text-lg font-bold ${profitLossData.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${profitLossData.netProfitLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* BALANCE SHEET */}
                  {statementSubTab === 'balance_sheet' && balanceSheetData && (
                    <div className="space-y-6">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Corporate Statement of Financial Position (Balance Sheet)</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ASSETS SIDE */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider pb-1 border-b border-[var(--border-color)]">Assets (Capital Application)</h5>
                          <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
                            <table className="w-full text-xs text-left border-collapse">
                              <tbody>
                                {balanceSheetData.assets.map((a: any) => (
                                  <tr key={a.id} className="border-b border-[var(--border-color)]">
                                    <td className="py-2 px-4 font-semibold text-[var(--text-primary)]">[{a.accountCode}] {a.accountName}</td>
                                    <td className="py-2 px-4 text-right font-mono text-[var(--text-primary)]">${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                                <tr className="bg-[var(--bg-tertiary)]/60 font-bold text-[var(--text-primary)]">
                                  <td className="py-2.5 px-4 uppercase text-[9px] tracking-wider">TOTAL ASSETS</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-emerald-400">${balanceSheetData.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* LIABILITIES & EQUITY SIDE */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider pb-1 border-b border-[var(--border-color)]">Liabilities (Corporate Obligations)</h5>
                            <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
                              <table className="w-full text-xs text-left border-collapse">
                                <tbody>
                                  {balanceSheetData.liabilities.map((l: any) => (
                                    <tr key={l.id} className="border-b border-[var(--border-color)]">
                                      <td className="py-2 px-4 font-semibold text-[var(--text-primary)]">[{l.accountCode}] {l.accountName}</td>
                                      <td className="py-2 px-4 text-right font-mono text-[var(--text-primary)]">${l.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-[var(--bg-tertiary)]/60 font-bold text-[var(--text-primary)]">
                                    <td className="py-2.5 px-4 uppercase text-[9px] tracking-wider text-[var(--text-secondary)]">Total Liabilities</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-amber-400">${balanceSheetData.totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-[var(--border-color)]">Shareholder Equity</h5>
                            <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
                              <table className="w-full text-xs text-left border-collapse">
                                <tbody>
                                  {balanceSheetData.equity.map((e: any) => (
                                    <tr key={e.id} className="border-b border-[var(--border-color)]">
                                      <td className="py-2 px-4 font-semibold text-[var(--text-primary)]">
                                        {e.id === "net-income-current" ? '' : `[${e.accountCode}] `}
                                        {e.accountName}
                                      </td>
                                      <td className="py-2 px-4 text-right font-mono text-[var(--text-primary)]">${e.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-[var(--bg-tertiary)]/60 font-bold text-[var(--text-primary)]">
                                    <td className="py-2.5 px-4 uppercase text-[9px] tracking-wider text-[var(--text-secondary)]">Total Shareholders' Equity</td>
                                    <td className="py-2.5 px-4 text-right font-mono text-indigo-400">${balanceSheetData.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="bg-[var(--bg-tertiary)]/80 border border-[var(--border-color)] font-bold text-[var(--text-primary)] text-xs rounded-xl p-3 flex justify-between items-center">
                            <span className="uppercase text-[9px] tracking-widest text-[var(--text-secondary)]">TOTAL LIABILITIES & EQUITY</span>
                            <span className="font-mono text-sm text-indigo-400">${(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {balanceSheetData.balancingValidation ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center gap-2">
                          <Check className="w-4 h-4" /> EQUATION STABILITY: ASSETS = LIABILITIES + EQUITY (BALANCED)
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> ASSETS EQUATION MISMATCH: BALANCING RETAINED EARNINGS WARNING
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASH FLOW */}
                  {statementSubTab === 'cash_flow' && cashFlowData && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Dynamic Cash Flow Statement (Direct Method)</span>
                      
                      <div className="space-y-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
                        
                        <div className="flex justify-between items-center py-2.5 border-b border-[var(--border-color)] text-xs">
                          <span className="font-bold text-[var(--text-primary)]">I. Operating Activities Cash Flow (Sales, Expenses, Taxes)</span>
                          <span className={`font-mono font-bold ${cashFlowData.operatingActivities >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${cashFlowData.operatingActivities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2.5 border-b border-[var(--border-color)] text-xs">
                          <span className="font-bold text-[var(--text-primary)]">II. Investing Activities Cash Flow (Fixed Assets Purchase/Sales)</span>
                          <span className={`font-mono font-bold ${cashFlowData.investingActivities >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${cashFlowData.investingActivities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2.5 border-b border-[var(--border-color)] text-xs">
                          <span className="font-bold text-[var(--text-primary)]">III. Financing Activities Cash Flow (Capital Injection, Loan Postings)</span>
                          <span className={`font-mono font-bold ${cashFlowData.financingActivities >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${cashFlowData.financingActivities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-4 font-bold text-sm">
                          <span className="uppercase text-[10px] tracking-wider text-[var(--text-secondary)]">Net Cash Flow Liquidity Growth / (Decline)</span>
                          <span className={`font-mono ${cashFlowData.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${cashFlowData.netChange.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* VIEW C: AP / AR SUBLEDGERS */}
            {activeTab === 'subledgers' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Subledgers Aging Analysis (AP/AR)</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Track customer receivables aging and vendor payables</p>
                  </div>

                  <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-1 gap-1 text-[10px] font-bold">
                    <button
                      onClick={() => setSubledgerSubTab('receivables')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${subledgerSubTab === 'receivables' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      AR Receivables Aging
                    </button>
                    <button
                      onClick={() => setSubledgerSubTab('payables')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${subledgerSubTab === 'payables' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      AP Payables Aging
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-6">
                  
                  {/* AR RECEIVABLES */}
                  {subledgerSubTab === 'receivables' && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Customer Accounts Receivable Aging Analysis</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                              <th className="py-2.5 px-4">Code</th>
                              <th className="py-2.5 px-4">Customer Name</th>
                              <th className="py-2.5 px-4 text-right">Current</th>
                              <th className="py-2.5 px-4 text-right">1-30 Days</th>
                              <th className="py-2.5 px-4 text-right">31-60 Days</th>
                              <th className="py-2.5 px-4 text-right">61-90 Days</th>
                              <th className="py-2.5 px-4 text-right">90+ Days</th>
                              <th className="py-2.5 px-4 text-right">Total Outstanding</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerAging.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-4 text-center text-[var(--text-secondary)]">No customers registered with outstanding invoice balances.</td>
                              </tr>
                            ) : (
                              customerAging.map((cust, i) => (
                                <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">{cust.customerCode}</td>
                                  <td className="py-2.5 px-4 font-bold text-[var(--text-primary)]">{cust.customerName}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${cust.breakdown.current.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${cust.breakdown.age30.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${cust.breakdown.age60.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${cust.breakdown.age90.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-rose-400">${cust.breakdown.ageOver90.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-500">${cust.outstandingAmount.toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* AP PAYABLES */}
                  {subledgerSubTab === 'payables' && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Vendor Accounts Payable Outstanding Aging Analysis</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                              <th className="py-2.5 px-4">Code</th>
                              <th className="py-2.5 px-4">Vendor Name</th>
                              <th className="py-2.5 px-4 text-right">Current</th>
                              <th className="py-2.5 px-4 text-right">1-30 Days</th>
                              <th className="py-2.5 px-4 text-right">31-60 Days</th>
                              <th className="py-2.5 px-4 text-right">61-90 Days</th>
                              <th className="py-2.5 px-4 text-right">90+ Days</th>
                              <th className="py-2.5 px-4 text-right">Total Payable</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorAging.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-4 text-center text-[var(--text-secondary)]">No outstanding vendor balance logs.</td>
                              </tr>
                            ) : (
                              vendorAging.map((vend, i) => (
                                <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">{vend.vendorCode}</td>
                                  <td className="py-2.5 px-4 font-bold text-[var(--text-primary)]">{vend.vendorName}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${vend.breakdown.current.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${vend.breakdown.age30.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${vend.breakdown.age60.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">${vend.breakdown.age90.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-rose-400">${vend.breakdown.ageOver90.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-500">${vend.outstandingAmount.toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* VIEW D: FIXED ASSETS REGISTER */}
            {activeTab === 'fixed_assets' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Fixed Assets Registry</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Asset registers and automated depreciation schedulers</p>
                  </div>

                  <button
                    onClick={() => setShowAssetModal(true)}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register New Asset
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Assets Sidebar selector */}
                  <div className="md:col-span-1 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/30 rounded-2xl p-4 space-y-2">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block mb-1">Corporate Assets</span>
                    {assets.length === 0 ? (
                      <div className="text-xs text-[var(--text-secondary)] p-4 text-center">No registered assets.</div>
                    ) : (
                      assets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => setSelectedAsset(asset)}
                          className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            selectedAsset?.id === asset.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-semibold shadow' : 'border-[var(--border-color)] bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="font-mono text-[9px] font-bold text-[var(--text-muted)] block">{asset.assetCode}</span>
                          <span className="text-xs block mt-0.5">{asset.assetName}</span>
                          <div className="flex justify-between mt-2 text-[10px]">
                            <span>Cost: ${asset.purchaseCost.toFixed(2)}</span>
                            <span className="font-bold text-emerald-400">Book Val: ${asset.bookValue.toFixed(2)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Depreciation schedule simulator panel */}
                  <div className="md:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Depreciation Schedule Simulator</span>
                      {selectedAsset && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase">{selectedAsset.depreciationMethod}</span>
                      )}
                    </div>

                    {!selectedAsset ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--text-secondary)]">
                        Select an asset on the left panel to simulate allocations
                      </div>
                    ) : (
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--bg-primary)]/30 p-3 rounded-xl border border-[var(--border-color)] text-xs mb-4">
                          <div>
                            <span className="text-[9px] text-[var(--text-secondary)] block">Purchase Cost</span>
                            <span className="font-mono font-bold">${selectedAsset.purchaseCost.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[var(--text-secondary)] block">Useful Life</span>
                            <span className="font-semibold">{selectedAsset.usefulLifeYears} Years</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[var(--text-secondary)] block">Salvage Value</span>
                            <span className="font-mono font-semibold">${selectedAsset.salvageValue.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[var(--text-secondary)] block">Accumulated Dep.</span>
                            <span className="font-mono font-bold text-amber-500">${selectedAsset.accumulatedDepreciation.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto flex-1">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3 text-right">Depreciation Amount</th>
                                <th className="py-2 px-3 text-right">Remaining Book Value</th>
                                <th className="py-2 px-3 text-center">GL Ledger Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedAsset.depreciations.map((sch: any) => (
                                <tr key={sch.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                                  <td className="py-2.5 px-3 font-mono">{new Date(sch.depreciationDate).toLocaleDateString()}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-amber-400">${sch.depreciationAmount.toFixed(2)}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">${sch.bookValueAfter.toFixed(2)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    {sch.isPosted ? (
                                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold rounded">POSTED</span>
                                    ) : (
                                      <button
                                        onClick={() => handlePostDepreciation(sch.id)}
                                        className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[9px] cursor-pointer transition-colors shadow"
                                      >
                                        Post to GL
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW E: BUDGET & RECONCILIATION */}
            {activeTab === 'budgets_reconciliation' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Budget & Bank Reconciliation Console</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Control operational budget limits and pair bank statement lines with GL entries</p>
                  </div>

                  <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-1 gap-1 text-[10px] font-bold">
                    <button
                      onClick={() => setBudgetsReconSubTab('budgets')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${budgetsReconSubTab === 'budgets' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      Operational Budgets
                    </button>
                    <button
                      onClick={() => setBudgetsReconSubTab('reconciliation')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer ${budgetsReconSubTab === 'reconciliation' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      Bank Reconciliation
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-6">
                  
                  {/* OPERATIONAL BUDGETS */}
                  {budgetsReconSubTab === 'budgets' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase">Budget Expense Allocations Limit Dashboard</span>
                        <button
                          onClick={() => {
                            if (fiscalYears.length === 0) {
                              showToast("Create a fiscal year first before allocating budget targets", "warning");
                              return;
                            }
                            setShowBudgetModal(true);
                          }}
                          className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow"
                        >
                          <Plus className="w-3 h-3" /> Allocate Budget Limit
                        </button>
                      </div>

                      {budgets.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                          No allocated budgets targets recorded yet. Click Allocate Budget to define limits.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {budgets.map((bud) => {
                            const pct = Math.min((bud.utilizedAmount / bud.allocatedAmount) * 100, 100);
                            return (
                              <div key={bud.id} className="border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-[var(--text-primary)]">[{bud.account.accountCode}] {bud.account.accountName}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase bg-[var(--bg-tertiary)] px-2 py-0.5 rounded font-bold">{bud.fiscalYear.yearName}</span>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-[var(--text-secondary)]">Utilized Amount: <span className="font-mono font-bold text-amber-500">${bud.utilizedAmount.toFixed(2)}</span></span>
                                    <span className="text-[var(--text-secondary)]">Budget Limit: <span className="font-mono font-bold text-emerald-400">${bud.allocatedAmount.toFixed(2)}</span></span>
                                  </div>
                                  
                                  {/* Progress bar */}
                                  <div className="w-full bg-[var(--bg-tertiary)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
                                    <div
                                      className={`h-full transition-all duration-500 rounded-full ${
                                        pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>

                                  <div className="flex justify-between text-[8px] font-bold tracking-wider text-[var(--text-muted)]">
                                    <span>{pct.toFixed(1)}% USED</span>
                                    {pct >= 100 ? (
                                      <span className="text-rose-400 uppercase">LIMIT OVERRUN</span>
                                    ) : (
                                      <span className="text-emerald-400 uppercase">IN LIMIT</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BANK RECONCILIATION */}
                  {budgetsReconSubTab === 'reconciliation' && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap justify-between items-center gap-3">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase">General Ledger Bank Statements Reconciliations Matcher</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowBankAccModal(true)}
                            className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow"
                          >
                            <Plus className="w-3 h-3" /> Link Bank Account
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        
                        {/* Selector / Statement Upload Panel */}
                        <div className="lg:col-span-1 space-y-4 border border-[var(--border-color)] bg-[var(--bg-primary)]/20 p-4 rounded-2xl text-xs text-left">
                          <div>
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">Select Bank Account</label>
                            <select
                              value={selectedBankAccount}
                              onChange={(e) => setSelectedBankAccount(e.target.value)}
                              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                            >
                              <option value="">-- Select Bank --</option>
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.bankName} - {b.accountName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                            <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Upload Statement CSV</span>
                            
                            <div>
                              <label className="text-[9px] text-[var(--text-secondary)] block mb-0.5">As-of Date</label>
                              <input
                                type="date"
                                value={statementUpload.statementDate}
                                onChange={(e) => setStatementUpload({ ...statementUpload, statementDate: e.target.value })}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-[var(--text-secondary)] block mb-0.5">Opening Bal ($)</label>
                                <input
                                  type="number"
                                  value={statementUpload.openingBalance}
                                  onChange={(e) => setStatementUpload({ ...statementUpload, openingBalance: e.target.value })}
                                  placeholder="0.00"
                                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-[var(--text-secondary)] block mb-0.5">Closing Bal ($)</label>
                                <input
                                  type="number"
                                  value={statementUpload.closingBalance}
                                  onChange={(e) => setStatementUpload({ ...statementUpload, closingBalance: e.target.value })}
                                  placeholder="0.00"
                                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] text-[var(--text-secondary)] block mb-0.5">Statement Lines CSV</label>
                              <textarea
                                value={statementUpload.rawCsv}
                                onChange={(e) => setStatementUpload({ ...statementUpload, rawCsv: e.target.value })}
                                placeholder="YYYY-MM-DD, Description, Amount, Ref"
                                rows={3}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1 px-2 text-[10px] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              ></textarea>
                              <span className="text-[8px] text-[var(--text-muted)] block mt-0.5">Format: YYYY-MM-DD, Desc, Amt, Ref (One line per row)</span>
                            </div>

                            <button
                              onClick={handleUploadStatement}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] cursor-pointer transition-colors shadow"
                            >
                              Upload & Match Statements
                            </button>
                          </div>
                        </div>

                        {/* Interactive Reconciliation Matching screen */}
                        <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl p-4 min-h-[300px]">
                          <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block mb-3">Matching Console (Statement vs GL Ledger Entries)</span>
                          
                          {!selectedBankAccount ? (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--text-secondary)]">
                              Please select a bank account to reconcile.
                            </div>
                          ) : !reconciliationConsole ? (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--text-secondary)]">
                              Loading reconciliation pairs...
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* Bank Statement side */}
                                <div className="space-y-2 border border-[var(--border-color)] p-3 bg-[var(--bg-secondary)] rounded-xl max-h-[220px] overflow-y-auto">
                                  <span className="text-[9px] font-bold text-amber-500 tracking-wider block border-b border-[var(--border-color)] pb-1">Unreconciled Bank Lines</span>
                                  {reconciliationConsole.bankLines.length === 0 ? (
                                    <div className="text-[10px] text-[var(--text-secondary)] p-4 text-center">All statement lines matched and reconciled!</div>
                                  ) : (
                                    reconciliationConsole.bankLines.map((bl: any) => (
                                      <div key={bl.id} className="p-2 border border-[var(--border-color)] bg-[var(--bg-primary)]/40 rounded-lg text-[10px] space-y-1 relative">
                                        <span className="font-mono text-[9px] text-[var(--text-secondary)]">{new Date(bl.transactionDate).toLocaleDateString()}</span>
                                        <span className="block font-semibold text-[var(--text-primary)] truncate max-w-[150px]">{bl.description}</span>
                                        <span className={`font-mono font-bold block ${bl.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {bl.amount >= 0 ? `+ $${bl.amount.toFixed(2)}` : `- $${Math.abs(bl.amount).toFixed(2)}`}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* GL entries side */}
                                <div className="space-y-2 border border-[var(--border-color)] p-3 bg-[var(--bg-secondary)] rounded-xl max-h-[220px] overflow-y-auto">
                                  <span className="text-[9px] font-bold text-indigo-400 tracking-wider block border-b border-[var(--border-color)] pb-1">Unreconciled Ledger Postings</span>
                                  {reconciliationConsole.glLines.length === 0 ? (
                                    <div className="text-[10px] text-[var(--text-secondary)] p-4 text-center">No outstanding GL postings for matching.</div>
                                  ) : (
                                    reconciliationConsole.glLines.map((gll: any) => (
                                      <div key={gll.id} className="p-2 border border-[var(--border-color)] bg-[var(--bg-primary)]/40 rounded-lg text-[10px] space-y-1">
                                        <div className="flex justify-between items-center text-[8px] font-mono text-[var(--text-secondary)]">
                                          <span>{new Date(gll.journalEntry.postingDate).toLocaleDateString()}</span>
                                          <span className="font-bold text-indigo-400">{gll.journalEntry.entryNumber}</span>
                                        </div>
                                        <span className="block font-semibold text-[var(--text-primary)] truncate max-w-[150px]">{gll.narration || gll.journalEntry.narration}</span>
                                        <span className={`font-mono font-bold block ${gll.debit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {gll.debit > 0 ? `+ $${gll.debit.toFixed(2)}` : `- $${gll.credit.toFixed(2)}`}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>

                              </div>

                              {/* Manual Match Entry console */}
                              {reconciliationConsole.bankLines.length > 0 && reconciliationConsole.glLines.length > 0 && (
                                <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap justify-between items-center gap-3 text-xs bg-[var(--bg-secondary)]/50 p-3 rounded-xl">
                                  <div className="space-y-1">
                                    <span className="block font-semibold text-[var(--text-primary)]">Ready to Reconcile Pairing</span>
                                    <p className="text-[9px] text-[var(--text-secondary)]">Pair Bank line and GL line above using manual reconciliations</p>
                                  </div>
                                  <button
                                    onClick={() => handleReconcileBank(reconciliationConsole.bankLines[0].id, reconciliationConsole.glLines[0].journalEntryId)}
                                    className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] cursor-pointer transition-colors shadow"
                                  >
                                    Reconcile Selected Pair
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* VIEW F: FISCAL PERIODS */}
            {activeTab === 'fiscal_periods' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Fiscal Periods & Year-End Closings</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Spawn new fiscal periods, close periods, or perform ledger closing rollovers</p>
                  </div>

                  <button
                    onClick={() => setShowFiscalYearModal(true)}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Spawn Fiscal Period
                  </button>
                </div>

                <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)]">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block font-display">Corporate Ledger Periods Directory</span>
                  </div>

                  {fiscalYears.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)]">No defined fiscal periods. Click Spawn to begin.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 text-[var(--text-muted)] font-bold">
                            <th className="py-2.5 px-4">Period Code</th>
                            <th className="py-2.5 px-4">Start Date</th>
                            <th className="py-2.5 px-4">End Date</th>
                            <th className="py-2.5 px-4">Period Status</th>
                            <th className="py-2.5 px-4 text-center">Closing Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fiscalYears.map((fy) => (
                            <tr key={fy.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                              <td className="py-3 px-4 font-bold text-indigo-400">{fy.yearName}</td>
                              <td className="py-3 px-4 font-mono">{new Date(fy.startDate).toLocaleDateString()}</td>
                              <td className="py-3 px-4 font-mono">{new Date(fy.endDate).toLocaleDateString()}</td>
                              <td className="py-3 px-4">
                                {fy.status === 'ACTIVE' ? (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded">ACTIVE</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold rounded">CLOSED</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {fy.status === 'ACTIVE' ? (
                                  <button
                                    onClick={() => handleCloseFiscalYear(fy.id)}
                                    className="py-1 px-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[9px] cursor-pointer transition-colors shadow flex items-center gap-1 mx-auto"
                                  >
                                    <Lock className="w-2.5 h-2.5" /> Close Fiscal Year
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-[var(--text-muted)] font-semibold flex items-center justify-center gap-1">
                                    <Check className="w-3.5 h-3.5 text-emerald-400" /> CLOSED & AUDITED
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW G: GST MANAGEMENT */}
            {activeTab === 'gst_management' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> GST & Indirect Tax Compliance Hub
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Automated input tax credit (ITC) reconciliation and GSTR filings tracker</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Output GST Card */}
                  <div className="bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">Output GST Liability</span>
                      <span className="text-base font-mono font-bold text-amber-500 mt-1 block">$18,452.80</span>
                      <span className="text-[8px] text-emerald-400 font-semibold block mt-0.5">Collected from Sales</span>
                    </div>
                    <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Input GST Credit Card */}
                  <div className="bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">Input Tax Credit (ITC)</span>
                      <span className="text-base font-mono font-bold text-emerald-500 mt-1 block">$12,840.40</span>
                      <span className="text-[8px] text-indigo-400 font-semibold block mt-0.5">Claimable on Purchases</span>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Net GST Payable Card */}
                  <div className="bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">Net GST Payable</span>
                      <span className="text-base font-mono font-bold text-indigo-400 mt-1 block">$5,612.40</span>
                      <span className="text-[8px] text-amber-500 font-semibold block mt-0.5">Payable for Current Quarter</span>
                    </div>
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* HSN Mappings */}
                  <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-4 space-y-4">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">HSN/SAC Goods & Services Slabs</span>
                    
                    <div className="space-y-2">
                      {[
                        { code: 'HSN-8471', desc: 'Computers & Electronics', rate: '18% GST' },
                        { code: 'HSN-8517', desc: 'Telecommunication Devices', rate: '18% GST' },
                        { code: 'SAC-9983', desc: 'Professional Services', rate: '18% GST' },
                        { code: 'HSN-3004', desc: 'Essential Medicines', rate: '5% GST' }
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] p-2.5 rounded-xl text-xs">
                          <div>
                            <span className="font-bold text-[var(--text-primary)] font-mono">{item.code}</span>
                            <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5">{item.desc}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded">{item.rate}</span>
                        </div>
                      ))}
                    </div>

                    <button className="w-full py-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold rounded-lg text-[10px] cursor-pointer transition-colors">
                      + Configure HSN Rate Mapping
                    </button>
                  </div>

                  {/* GST Filings History */}
                  <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Recent GSTR Filing Returns Ledger</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">Quarterly cycle</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold bg-[var(--bg-tertiary)]/10">
                            <th className="py-2.5 px-3">Period</th>
                            <th className="py-2.5 px-3">Form Type</th>
                            <th className="py-2.5 px-3">Filing Date</th>
                            <th className="py-2.5 px-3 text-right">Tax Paid</th>
                            <th className="py-2.5 px-3 text-center">Filing Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { period: 'Q3 FY2026', type: 'GSTR-3B (Summary Return)', date: '2026-04-20', tax: '$5,400.00', status: 'FILED' },
                            { period: 'Q3 FY2026', type: 'GSTR-1 (Outward Supplies)', date: '2026-04-11', tax: '$0.00', status: 'FILED' },
                            { period: 'Q2 FY2026', type: 'GSTR-3B (Summary Return)', date: '2026-01-18', tax: '$4,820.00', status: 'FILED' },
                            { period: 'Q1 FY2026', type: 'GSTR-3B (Summary Return)', date: '2025-10-15', tax: '$6,110.00', status: 'FILED' }
                          ].map((ret, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{ret.period}</td>
                              <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{ret.type}</td>
                              <td className="py-2.5 px-3 font-mono">{ret.date}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{ret.tax}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded">FILED</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW H: TAX MANAGEMENT */}
            {activeTab === 'tax_management' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Tax & Compliance Configuration
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Corporate Income Tax computation settings and TDS/TCS withholdings logs</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Tax Withholdings Configuration */}
                  <div className="lg:col-span-1 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-4 space-y-4 text-xs">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Corporate Tax Rates Settings</span>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Corporate Income Tax Slab (%)</label>
                        <input type="number" defaultValue="25" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Minimum Alternate Tax (MAT) (%)</label>
                        <input type="number" defaultValue="15" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">TDS Rate for Contractors (%)</label>
                        <input type="number" defaultValue="2" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">TDS Rate for Professional Services (%)</label>
                        <input type="number" defaultValue="10" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                      </div>
                    </div>

                    <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors">
                      Save Settings Configuration
                    </button>
                  </div>

                  {/* Withheld Ledger (TDS/TCS) */}
                  <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">TDS/TCS Withholding Registry Ledger</span>
                      <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold uppercase">Pending Filing</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold bg-[var(--bg-tertiary)]/10">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Entity Name</th>
                            <th className="py-2.5 px-3">TDS Section</th>
                            <th className="py-2.5 px-3 text-right">Base Amount</th>
                            <th className="py-2.5 px-3 text-right">Tax Withheld</th>
                            <th className="py-2.5 px-3 text-center">Filing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { date: '2026-05-18', name: 'Sigma Consulting Ltd', section: 'Sec 194J (10%)', base: '$1,500.00', withheld: '$150.00', status: 'PENDING' },
                            { date: '2026-05-12', name: 'Apex Logistics Inc', section: 'Sec 194C (2%)', base: '$2,800.00', withheld: '$56.00', status: 'PENDING' },
                            { date: '2026-04-28', name: 'Alpha Agency', section: 'Sec 194C (2%)', base: '$4,100.00', withheld: '$82.00', status: 'DEPOSITED' },
                            { date: '2026-04-15', name: 'Delta Software Solutions', section: 'Sec 194J (10%)', base: '$6,000.00', withheld: '$600.00', status: 'DEPOSITED' }
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono">{row.date}</td>
                              <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{row.name}</td>
                              <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{row.section}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{row.base}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-500">{row.withheld}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                  row.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW I: EXPENSE TRACKING */}
            {activeTab === 'expense_tracking' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Corporate Expense Operations Ledger
                    </h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Record corporate overhead, office supplies, utility payments, and travel claims</p>
                  </div>

                  <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-1 gap-1 text-[10px] font-bold">
                    <span className="px-3 py-1.5 rounded-lg text-emerald-400 bg-emerald-500/10 font-mono font-bold">
                      Spent This Month: $4,582.30
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Expense Logger Form */}
                  <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4 text-xs">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Log Corporate Expense</span>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Expense Title / Item</label>
                        <input type="text" placeholder="e.g. Server Hosting AWS" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Category</label>
                          <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                            <option>Overhead / Operations</option>
                            <option>Office Supplies</option>
                            <option>Travel & Lodging</option>
                            <option>Marketing / Sales</option>
                            <option>Utility Bill</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Expense Amount ($)</label>
                          <input type="number" placeholder="0.00" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Date of Expense</label>
                          <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Paid Via Account</label>
                          <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                            <option>Corporate Debit Card</option>
                            <option>Petty Cash Drawer</option>
                            <option>Operating Bank Checking</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors">
                      Record Expense Entry
                    </button>
                  </div>

                  {/* Expense Register Ledger */}
                  <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)]">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Overhead & Operational Expense Ledger</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold bg-[var(--bg-tertiary)]/10">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Expense Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-center">Paid Method</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { date: '2026-05-20', name: 'Monthly Office Internet Fiber', cat: 'Utility Bill', amt: '$120.00', pay: 'Debit Card' },
                            { date: '2026-05-18', name: 'AWS Production Cloud Hosting', cat: 'Overhead / Operations', amt: '$1,480.00', pay: 'Bank Checking' },
                            { date: '2026-05-15', name: 'Office Stationeries and printer inks', cat: 'Office Supplies', amt: '$84.50', pay: 'Petty Cash' },
                            { date: '2026-05-11', name: 'Client Dinner meeting', cat: 'Travel & Lodging', amt: '$180.20', pay: 'Debit Card' },
                            { date: '2026-05-04', name: 'Google Workspace Workspace Licensing', cat: 'Overhead / Operations', amt: '$420.00', pay: 'Bank Checking' }
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono">{row.date}</td>
                              <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{row.name}</td>
                              <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{row.cat}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">{row.amt}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold rounded uppercase">
                                  {row.pay}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW J: FINANCIAL ANALYTICS & REPORTS */}
            {activeTab === 'financial_reports' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Executive Financial Analytics & Dashboard
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Real-time charts, profit margins tracking, and liquidity overview summaries</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Gross Margin Card */}
                  <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Gross Profit Margin</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 block">62.8%</span>
                    <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden border border-[var(--border-color)] mt-1.5">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62.8%' }}></div>
                    </div>
                  </div>

                  {/* Net Margin Card */}
                  <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Net Profit Margin</span>
                    <span className="text-xl font-bold font-mono text-indigo-400 block">28.4%</span>
                    <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden border border-[var(--border-color)] mt-1.5">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '28.4%' }}></div>
                    </div>
                  </div>

                  {/* Working Capital Card */}
                  <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Working Capital Ratio</span>
                    <span className="text-xl font-bold font-mono text-amber-500 block">2.14</span>
                    <span className="text-[8px] text-emerald-400 font-semibold block">Liquidity: Highly Stable</span>
                  </div>

                  {/* Debt to Equity Card */}
                  <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Debt to Equity Ratio</span>
                    <span className="text-xl font-bold font-mono text-indigo-400 block">0.38</span>
                    <span className="text-[8px] text-indigo-400 font-semibold block">Leverage: Under Control</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Operating Revenues vs Expenses Visual */}
                  <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Monthly Financial Performance Tracker</span>
                    
                    <div className="space-y-4">
                      {/* Revenue Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-[var(--text-primary)]">Gross Operating Revenues</span>
                          <span className="font-mono font-bold text-emerald-400">$64,820.00</span>
                        </div>
                        <div className="w-full bg-[var(--bg-primary)] h-3 rounded-full overflow-hidden border border-[var(--border-color)]">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>

                      {/* Expenses Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-[var(--text-primary)]">Operating Overhead Expenses</span>
                          <span className="font-mono font-bold text-amber-500">$34,180.00</span>
                        </div>
                        <div className="w-full bg-[var(--bg-primary)] h-3 rounded-full overflow-hidden border border-[var(--border-color)]">
                          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: '48%' }}></div>
                        </div>
                      </div>

                      {/* Income Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-[var(--text-primary)]">Net Retained Income</span>
                          <span className="font-mono font-bold text-indigo-400">$30,640.00</span>
                        </div>
                        <div className="w-full bg-[var(--bg-primary)] h-3 rounded-full overflow-hidden border border-[var(--border-color)]">
                          <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" style={{ width: '37%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Reports Downloads list */}
                  <div className="lg:col-span-1 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl p-4 space-y-4">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Exportable Financial Audited Reports</span>
                    
                    <div className="space-y-2">
                      {[
                        { title: 'Full Audited General Ledger.xlsx', desc: 'Detailing all posted postings' },
                        { title: 'Tax & Compliance filings.pdf', desc: 'HSN code rate mappings and returns' },
                        { title: 'Executive Balance Sheet.pdf', desc: 'Live Statement of Financial Position' },
                        { title: 'Quarterly Cash Flow.xlsx', desc: 'Cash inflows & outflows ledger' }
                      ].map((item, i) => (
                        <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-2.5 rounded-xl hover:bg-[var(--bg-primary)]/40 transition-colors flex justify-between items-center cursor-pointer">
                          <div className="text-xs">
                            <span className="font-bold text-indigo-400 block text-[11px]">{item.title}</span>
                            <span className="text-[8px] text-[var(--text-secondary)] block mt-0.5">{item.desc}</span>
                          </div>
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">GET</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW K: VOUCHER SYSTEM */}
            {activeTab === 'voucher_system' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Double-Entry Voucher System
                    </h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Generate Receipt (RC), Payment (PY), Journal (JV), or Contra (CN) vouchers</p>
                  </div>

                  <button
                    onClick={() => {
                      if (!activeFiscalYear) {
                        showToast("Please open an active fiscal year first before spawning vouchers", "warning");
                        return;
                      }
                      setShowVoucherModal(true);
                    }}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Double-Entry Voucher
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Voucher Preview Receipt Sheet */}
                  <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-5 rounded-2xl space-y-4">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Selected Voucher Printable Sheet Preview</span>
                    
                    <div className="border border-[var(--border-color)] bg-[var(--bg-primary)]/40 p-4 rounded-xl space-y-4 text-xs font-mono select-none">
                      <div className="border-b border-[var(--border-color)] pb-3 text-center space-y-1">
                        <span className="text-xs font-bold text-[var(--text-primary)] tracking-wide font-sans block uppercase">MANUAL ENTERPRISE ERP</span>
                        <span className="text-[8px] text-[var(--text-secondary)] block">FINANCIAL LEDGER VOUCHER SHEET</span>
                      </div>

                      <div className="space-y-1.5 text-[10px] text-[var(--text-secondary)]">
                        <div className="flex justify-between">
                          <span>Voucher Ref:</span>
                          <span className="font-bold text-[var(--text-primary)]">JV-2026-0004</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Posting Date:</span>
                          <span className="font-bold text-[var(--text-primary)]">2026-05-23</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fiscal Year:</span>
                          <span className="font-bold text-[var(--text-primary)]">{activeFiscalYear?.yearName || 'FY2026'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reference:</span>
                          <span className="font-bold text-amber-500">INV-1029</span>
                        </div>
                      </div>

                      <div className="border-t border-b border-[var(--border-color)] py-2 text-[9px] space-y-2">
                        <div className="flex justify-between font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-1">
                          <span>Particulars Account</span>
                          <div className="flex gap-4">
                            <span>Debit</span>
                            <span>Credit</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>[GL-2882] Operating checking</span>
                            <div className="flex gap-4 font-mono">
                              <span className="text-emerald-400">$1,500.00</span>
                              <span>-</span>
                            </div>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>[GL-4929] Accounts Receivable</span>
                            <div className="flex gap-4 font-mono">
                              <span>-</span>
                              <span className="text-amber-500">$1,500.00</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                        <span className="block font-bold">Narration:</span>
                        <p className="text-[9px] leading-relaxed">Payment received against Customer Invoice INV-1029. Balance rolled over.</p>
                      </div>

                      <div className="pt-4 flex justify-between text-[9px] border-t border-[var(--border-color)] text-[var(--text-muted)] font-sans font-bold">
                        <span>PREPARED BY: MANAV</span>
                        <span>APPROVED BY: SYSTEM</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Vouchers registry list */}
                  <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)]">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Vouchers Registry Entries Ledger</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold bg-[var(--bg-tertiary)]/10">
                            <th className="py-2.5 px-3">Voucher #</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Reference</th>
                            <th className="py-2.5 px-3 text-right">Total Balance</th>
                            <th className="py-2.5 px-3 text-center">Filing Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { code: 'JV-2026-0004', type: 'Journal (JV)', ref: 'INV-1029', amt: '$1,500.00' },
                            { code: 'PY-2026-0012', type: 'Payment (PY)', ref: 'AWS-9912', amt: '$1,480.00' },
                            { code: 'RC-2026-0002', type: 'Receipt (RC)', ref: 'CUST-0021', amt: '$2,100.00' },
                            { code: 'CN-2026-0001', type: 'Contra (CN)', ref: 'CASH-BANK', amt: '$5,000.00' }
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-indigo-400">{row.code}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold rounded uppercase">
                                  {row.type}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{row.ref}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-[var(--text-primary)]">{row.amt}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded uppercase">
                                  POSTED
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ==========================================
          MODALS CORE DRAWERS
          ========================================== */}

      {/* Voucher posting modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-4xl p-6 relative shadow-2xl text-left select-none overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowVoucherModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Create General Ledger Double-Entry Voucher</h4>
            </div>

            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-xs">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Entry Date</label>
                <input
                  type="date"
                  value={voucherHeader.entryDate}
                  onChange={(e) => setVoucherHeader({ ...voucherHeader, entryDate: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Posting Date</label>
                <input
                  type="date"
                  value={voucherHeader.postingDate}
                  onChange={(e) => setVoucherHeader({ ...voucherHeader, postingDate: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Reference (Invoice / Receipt)</label>
                <input
                  type="text"
                  value={voucherHeader.reference}
                  onChange={(e) => setVoucherHeader({ ...voucherHeader, reference: e.target.value })}
                  placeholder="e.g. INV-10002"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Header Narration</label>
                <input
                  type="text"
                  value={voucherHeader.narration}
                  onChange={(e) => setVoucherHeader({ ...voucherHeader, narration: e.target.value })}
                  placeholder="e.g. Monthly rent posting"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* Lines array */}
            <div className="space-y-2 mb-4">
              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-1">Voucher Ledger Line Items</span>
              
              <div className="space-y-2">
                {voucherLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs items-center">
                    
                    {/* Account selection */}
                    <div className="md:col-span-3">
                      <select
                        value={line.accountId}
                        onChange={(e) => {
                          const updated = [...voucherLines];
                          updated[idx].accountId = e.target.value;
                          setVoucherLines(updated);
                        }}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="">-- Account --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.accountCode}] {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Debit */}
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        placeholder="Debit ($)"
                        value={line.debit}
                        disabled={!!line.credit}
                        onChange={(e) => {
                          const updated = [...voucherLines];
                          updated[idx].debit = e.target.value;
                          setVoucherLines(updated);
                        }}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none disabled:opacity-40"
                      />
                    </div>

                    {/* Credit */}
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        placeholder="Credit ($)"
                        value={line.credit}
                        disabled={!!line.debit}
                        onChange={(e) => {
                          const updated = [...voucherLines];
                          updated[idx].credit = e.target.value;
                          setVoucherLines(updated);
                        }}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none disabled:opacity-40"
                      />
                    </div>

                    {/* Line Narration */}
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        placeholder="Line narration..."
                        value={line.narration}
                        onChange={(e) => {
                          const updated = [...voucherLines];
                          updated[idx].narration = e.target.value;
                          setVoucherLines(updated);
                        }}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>

                    {/* Optional AP/AR Subledger link */}
                    <div className="md:col-span-2 flex items-center gap-1">
                      <select
                        value={line.customerId || line.vendorId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = [...voucherLines];
                          if (val.startsWith('cust:')) {
                            updated[idx].customerId = val.replace('cust:', '');
                            updated[idx].vendorId = '';
                          } else if (val.startsWith('vend:')) {
                            updated[idx].vendorId = val.replace('vend:', '');
                            updated[idx].customerId = '';
                          } else {
                            updated[idx].customerId = '';
                            updated[idx].vendorId = '';
                          }
                          setVoucherLines(updated);
                        }}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-2 text-[10px] text-[var(--text-secondary)] focus:outline-none"
                      >
                        <option value="">-- AP/AR Link --</option>
                        {customers.map(c => (
                          <option key={c.id} value={`cust:${c.id}`}>Cust: {c.customerName}</option>
                        ))}
                        {vendors.map(v => (
                          <option key={v.id} value={`vend:${v.id}`}>Vend: {v.vendorName}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          if (voucherLines.length <= 2) return;
                          setVoucherLines(voucherLines.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              <button
                onClick={() => setVoucherLines([...voucherLines, { accountId: '', debit: '', credit: '', narration: '', customerId: '', vendorId: '' }])}
                className="py-1 px-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Voucher Line
              </button>
            </div>

            {/* Posting actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowVoucherModal(false)}
                className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePostJournalVoucher}
                className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer transition-colors"
              >
                Post double-entry voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset register modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none">
            <button onClick={() => setShowAssetModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Coins className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Register Corporate Fixed Asset</h4>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Asset Code (Unique ID)</label>
                <input type="text" value={newAsset.assetCode} onChange={(e) => setNewAsset({ ...newAsset, assetCode: e.target.value })} placeholder="e.g. VEH-001" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Asset Name</label>
                <input type="text" value={newAsset.assetName} onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })} placeholder="e.g. Delivery Van" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Purchase Date</label>
                  <input type="date" value={newAsset.purchaseDate} onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Purchase Cost ($)</label>
                  <input type="number" value={newAsset.purchaseCost} onChange={(e) => setNewAsset({ ...newAsset, purchaseCost: e.target.value })} placeholder="e.g. 35000" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Depreciation Method</label>
                  <select value={newAsset.depreciationMethod} onChange={(e) => setNewAsset({ ...newAsset, depreciationMethod: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-[11px] text-[var(--text-primary)] focus:outline-none">
                    <option value="STRAIGHT_LINE">Straight Line</option>
                    <option value="WRITTEN_DOWN_VALUE">WDV method (20% p.a.)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Useful Life (Years)</label>
                  <input type="number" value={newAsset.usefulLifeYears} onChange={(e) => setNewAsset({ ...newAsset, usefulLifeYears: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Salvage Value ($)</label>
                <input type="number" value={newAsset.salvageValue} onChange={(e) => setNewAsset({ ...newAsset, salvageValue: e.target.value })} placeholder="0.00" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button onClick={() => setShowAssetModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button onClick={handleCreateAsset} className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save Asset Master</button>
            </div>
          </div>
        </div>
      )}

      {/* Budget allocate modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none">
            <button onClick={() => setShowBudgetModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Allocate Budget Limit</h4>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Fiscal Year</label>
                <select value={newBudget.fiscalYearId} onChange={(e) => setNewBudget({ ...newBudget, fiscalYearId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-[11px] text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Select Year --</option>
                  {fiscalYears.map(f => (
                    <option key={f.id} value={f.id}>{f.yearName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">GL Account (Expense Type)</label>
                <select value={newBudget.accountId} onChange={(e) => setNewBudget({ ...newBudget, accountId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-[11px] text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Select Account --</option>
                  {accounts.filter(a => a.accountType === 'EXPENSE').map(acc => (
                    <option key={acc.id} value={acc.id}>[{acc.accountCode}] {acc.accountName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Allocated Target Limit ($)</label>
                <input type="number" value={newBudget.allocatedAmount} onChange={(e) => setNewBudget({ ...newBudget, allocatedAmount: e.target.value })} placeholder="0.00" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button onClick={() => setShowBudgetModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button onClick={handleCreateBudget} className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save Target</button>
            </div>
          </div>
        </div>
      )}

      {/* Link bank modal */}
      {showBankAccModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none">
            <button onClick={() => setShowBankAccModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <DollarSign className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Link Corporate Bank Account</h4>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Account Display Name</label>
                <input type="text" value={newBankAcc.accountName} onChange={(e) => setNewBankAcc({ ...newBankAcc, accountName: e.target.value })} placeholder="e.g. Operating Checking" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Account Number</label>
                <input type="text" value={newBankAcc.accountNumber} onChange={(e) => setNewBankAcc({ ...newBankAcc, accountNumber: e.target.value })} placeholder="e.g. 100028882" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Bank Name</label>
                <input type="text" value={newBankAcc.bankName} onChange={(e) => setNewBankAcc({ ...newBankAcc, bankName: e.target.value })} placeholder="e.g. JP Morgan Chase" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Linked General Ledger GL Account</label>
                <select value={newBankAcc.glAccountId} onChange={(e) => setNewBankAcc({ ...newBankAcc, glAccountId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-[11px] text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Select GL Checking Asset --</option>
                  {accounts.filter(a => a.accountType === 'ASSET').map(acc => (
                    <option key={acc.id} value={acc.id}>[{acc.accountCode}] {acc.accountName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button onClick={() => setShowBankAccModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button onClick={handleCreateBankAcc} className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Integrate Bank</button>
            </div>
          </div>
        </div>
      )}

      {/* Spawn fiscal year modal */}
      {showFiscalYearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none">
            <button onClick={() => setShowFiscalYearModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Spawn Fiscal Period</h4>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Fiscal Year Code (e.g. FY2026)</label>
                <input type="text" value={newFiscalYear.yearName} onChange={(e) => setNewFiscalYear({ ...newFiscalYear, yearName: e.target.value })} placeholder="e.g. FY2026" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Start Date</label>
                  <input type="date" value={newFiscalYear.startDate} onChange={(e) => setNewFiscalYear({ ...newFiscalYear, startDate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">End Date</label>
                  <input type="date" value={newFiscalYear.endDate} onChange={(e) => setNewFiscalYear({ ...newFiscalYear, endDate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button onClick={() => setShowFiscalYearModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button onClick={handleCreateFiscalYear} className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Spawn Period</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline support modal helpers for clean X icon trigger closures
function X({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <svg onClick={onClick} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
