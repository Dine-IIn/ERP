import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';

const router = Router();

// WebSocket notification helper
let ioInstance: any = null;
export function setFinanceIo(io: any) {
  ioInstance = io;
}

function triggerRealtimeAlert(userId: string, notification: any) {
  if (ioInstance) {
    ioInstance.to(userId).emit('notification', notification);
  }
}

// Helper to log audit logs
async function logAudit(companyId: string, userId: string, username: string, actionType: string, moduleName: string, newValue: any, oldValue: any = null) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        username,
        actionType,
        moduleName,
        newValue: newValue ? JSON.stringify(newValue) : null,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
      }
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

// ==========================================
// 1. FISCAL YEAR MANAGEMENT
// ==========================================

router.get('/fiscal-years', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const years = await prisma.fiscalYear.findMany({
      where: { companyId },
      orderBy: { startDate: 'desc' }
    });
    return res.json({ years });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/fiscal-year', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { yearName, startDate, endDate } = req.body;

    if (!yearName || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields: yearName, startDate, endDate" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    // Check for overlap
    const existing = await prisma.fiscalYear.findFirst({
      where: {
        companyId,
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ error: `Fiscal period overlaps with existing period '${existing.yearName}'` });
    }

    const newYear = await prisma.fiscalYear.create({
      data: {
        companyId: companyId!,
        yearName,
        startDate: start,
        endDate: end,
        status: "ACTIVE"
      }
    });

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "CREATE", "finance", newYear);
    return res.status(201).json({ message: "Fiscal year created successfully", fiscalYear: newYear });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/fiscal-year/:id/close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { id, companyId }
    });

    if (!fiscalYear) {
      return res.status(404).json({ error: "Fiscal year not found" });
    }

    if (fiscalYear.status === "CLOSED") {
      return res.status(400).json({ error: "Fiscal year is already closed" });
    }

    // SAP-Grade Year-End Closing logic:
    // 1. Gather all Revenue & Expense account balances.
    // 2. Post a closing entry resetting all Revenue & Expense balances to 0, transferring net profit/loss to Retained Earnings account.
    
    // Find or create a Retained Earnings account (Equity class)
    let retainedEarnings = await prisma.chartOfAccounts.findFirst({
      where: { companyId, accountCode: "3000-RE", isDeleted: false }
    });

    if (!retainedEarnings) {
      retainedEarnings = await prisma.chartOfAccounts.create({
        data: {
          companyId: companyId!,
          accountCode: "3000-RE",
          accountName: "Retained Earnings (Closing)",
          accountType: "EQUITY",
          balance: 0.0
        }
      });
    }

    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        companyId,
        accountType: { in: ["REVENUE", "EXPENSE"] },
        balance: { not: 0.0 },
        isDeleted: false
      }
    });

    if (accounts.length > 0) {
      // Calculate net profit/loss
      let totalRevenues = 0;
      let totalExpenses = 0;
      const linesData: any[] = [];

      for (const acc of accounts) {
        if (acc.accountType === "REVENUE") {
          // Revenue has credit balance. To clear it, we Debit it.
          totalRevenues += acc.balance;
          linesData.push({
            accountId: acc.id,
            debit: acc.balance,
            credit: 0.0,
            narration: `Year-end closing clearance for ${acc.accountName}`
          });
        } else if (acc.accountType === "EXPENSE") {
          // Expense has debit balance. To clear it, we Credit it.
          totalExpenses += acc.balance;
          linesData.push({
            accountId: acc.id,
            debit: 0.0,
            credit: acc.balance,
            narration: `Year-end closing clearance for ${acc.accountName}`
          });
        }
      }

      const netProfitLoss = totalRevenues - totalExpenses; // positive = net profit (credit), negative = net loss (debit)

      if (netProfitLoss !== 0) {
        if (netProfitLoss > 0) {
          // Credit Retained Earnings
          linesData.push({
            accountId: retainedEarnings.id,
            debit: 0.0,
            credit: netProfitLoss,
            narration: `Transfer net profit for year ${fiscalYear.yearName} to Retained Earnings`
          });
        } else {
          // Debit Retained Earnings
          linesData.push({
            accountId: retainedEarnings.id,
            debit: Math.abs(netProfitLoss),
            credit: 0.0,
            narration: `Transfer net loss for year ${fiscalYear.yearName} to Retained Earnings`
          });
        }
      }

      // Generate next closing voucher number
      const entryCount = await prisma.journalEntry.count({ where: { companyId } });
      const entryNumber = `CL-${fiscalYear.yearName}-${String(entryCount + 1).padStart(4, '0')}`;

      await prisma.$transaction(async (tx) => {
        // Create closing journal entry
        const entry = await tx.journalEntry.create({
          data: {
            companyId: companyId!,
            fiscalYearId: fiscalYear.id,
            entryNumber,
            entryDate: fiscalYear.endDate,
            postingDate: fiscalYear.endDate,
            reference: "YEAR_END_CLOSING",
            narration: `Year-end ledger closing period voucher for ${fiscalYear.yearName}`,
            status: "POSTED",
            lines: {
              create: linesData.map(l => ({
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                narration: l.narration
              }))
            }
          }
        });

        // Zero out the income statement accounts and update Retained Earnings
        for (const line of linesData) {
          if (line.accountId === retainedEarnings?.id) {
            const diff = line.credit - line.debit;
            await tx.chartOfAccounts.update({
              where: { id: line.accountId },
              data: { balance: { increment: diff } }
            });
          } else {
            await tx.chartOfAccounts.update({
              where: { id: line.accountId },
              data: { balance: 0.0 }
            });
          }
        }
      });
    }

    // Close the year
    const updatedYear = await prisma.fiscalYear.update({
      where: { id },
      data: { status: "CLOSED" }
    });

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "UPDATE", "finance", { closedId: id });
    return res.json({ message: "Fiscal year closed and balance sheets rolled over successfully", fiscalYear: updatedYear });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CHART OF ACCOUNTS & LEDGERS
// ==========================================

router.get('/accounts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { accountCode: 'asc' }
    });
    return res.json({ accounts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/account/:accountId/ledger', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { accountId } = req.params;

    const account = await prisma.chartOfAccounts.findFirst({
      where: { id: accountId, companyId, isDeleted: false }
    });

    if (!account) {
      return res.status(404).json({ error: "GL account not found" });
    }

    const lines = await prisma.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: {
          companyId,
          status: "POSTED"
        }
      },
      include: {
        journalEntry: true
      },
      orderBy: {
        journalEntry: {
          postingDate: 'asc'
        }
      }
    });

    // Compute running balance
    let running = 0.0;
    const ledger = lines.map(line => {
      const isAssetOrExpense = ["ASSET", "EXPENSE"].includes(account.accountType);
      if (isAssetOrExpense) {
        running += (line.debit - line.credit);
      } else {
        running += (line.credit - line.debit);
      }
      return {
        id: line.id,
        entryNumber: line.journalEntry.entryNumber,
        entryDate: line.journalEntry.entryDate,
        postingDate: line.journalEntry.postingDate,
        reference: line.journalEntry.reference,
        narration: line.narration || line.journalEntry.narration,
        debit: line.debit,
        credit: line.credit,
        runningBalance: running
      };
    });

    return res.json({ account, ledger });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. JOURNAL ENTRIES (VOUCHERS)
// ==========================================

router.get('/journal-entries', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const entries = await prisma.journalEntry.findMany({
      where: { companyId },
      include: {
        lines: {
          include: {
            account: true,
            customer: true,
            vendor: true
          }
        }
      },
      orderBy: { postingDate: 'desc' }
    });
    return res.json({ entries });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/journal-entry', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { entryDate, postingDate, reference, narration, lines } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: "A double-entry journal voucher requires at least two account lines" });
    }

    const postDate = new Date(postingDate || entryDate || new Date());
    const entDate = new Date(entryDate || new Date());

    // 1. Validate Fiscal Period
    const activeYear = await prisma.fiscalYear.findFirst({
      where: {
        companyId,
        status: "ACTIVE",
        startDate: { lte: postDate },
        endDate: { gte: postDate }
      }
    });

    if (!activeYear) {
      return res.status(400).json({ error: "No active fiscal period covers the posting date of this transaction" });
    }

    // 2. Validate balanced double-entry
    let totalDebit = 0.0;
    let totalCredit = 0.0;

    for (const line of lines) {
      const d = parseFloat(line.debit || 0);
      const c = parseFloat(line.credit || 0);
      if (d < 0 || c < 0) {
        return res.status(400).json({ error: "Debit and Credit amounts must be positive values" });
      }
      if (d > 0 && c > 0) {
        return res.status(400).json({ error: "A line item cannot contain both Debit and Credit amounts" });
      }
      totalDebit += d;
      totalCredit += c;
    }

    // Double-entry tolerance check (floating point precision)
    if (Math.abs(totalDebit - totalCredit) > 0.009) {
      return res.status(400).json({ error: `Imbalanced double-entry: Total Debits ($${totalDebit.toFixed(2)}) must exactly match Total Credits ($${totalCredit.toFixed(2)})` });
    }

    if (totalDebit <= 0) {
      return res.status(400).json({ error: "Journal entry must contain non-zero transaction amounts" });
    }

    // 3. Budget warning verification
    const budgetWarnings: string[] = [];
    for (const line of lines) {
      const d = parseFloat(line.debit || 0);
      if (d > 0) {
        const budget = await prisma.budget.findFirst({
          where: { companyId, fiscalYearId: activeYear.id, accountId: line.accountId },
          include: { account: true }
        });
        if (budget) {
          if (budget.utilizedAmount + d > budget.allocatedAmount) {
            budgetWarnings.push(`GL account '${budget.account.accountName}' has exceeded its budget limit! Limit: $${budget.allocatedAmount.toFixed(2)}, Current Utilized: $${budget.utilizedAmount.toFixed(2)}, Current Posting: $${d.toFixed(2)}`);
          }
        }
      }
    }

    // Sequential voucher code JV-YYYY-XXXX
    const count = await prisma.journalEntry.count({ where: { companyId } });
    const entryNumber = `JV-${postDate.getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // 4. Transaction execution
    const newEntry = await prisma.$transaction(async (tx) => {
      // Create Header and Lines
      const entry = await tx.journalEntry.create({
        data: {
          companyId: companyId!,
          fiscalYearId: activeYear.id,
          entryNumber,
          entryDate: entDate,
          postingDate: postDate,
          reference: reference || null,
          narration: narration || "Journal voucher entry",
          status: "POSTED",
          lines: {
            create: lines.map(l => ({
              accountId: l.accountId,
              debit: parseFloat(l.debit || 0),
              credit: parseFloat(l.credit || 0),
              narration: l.narration || null,
              customerId: l.customerId || null,
              vendorId: l.vendorId || null
            }))
          }
        },
        include: {
          lines: true
        }
      });

      // Update GL accounts & AP/AR Subledgers
      for (const line of lines) {
        const accId = line.accountId;
        const d = parseFloat(line.debit || 0);
        const c = parseFloat(line.credit || 0);
        const diff = d - c; // positive = debit, negative = credit

        const account = await tx.chartOfAccounts.findUnique({ where: { id: accId } });
        if (!account) throw new Error("Account not found");

        const isAssetOrExpense = ["ASSET", "EXPENSE"].includes(account.accountType);
        const balanceChange = isAssetOrExpense ? diff : -diff;

        await tx.chartOfAccounts.update({
          where: { id: accId },
          data: { balance: { increment: balanceChange } }
        });

        // Subledgers (Customer/Vendor outstanding)
        if (line.customerId) {
          // Debits increase customer receivables, credits decrease them
          await tx.customerMaster.update({
            where: { id: line.customerId },
            data: { outstandingAmount: { increment: diff } }
          });
        }

        if (line.vendorId) {
          // Credits increase vendor payables, debits decrease them
          await tx.vendorMaster.update({
            where: { id: line.vendorId },
            data: { rating: { increment: -diff } } // using rating as temporary outstanding balance if no outstandingAmount field
          });
        }

        // Budget utilization update
        if (d > 0) {
          const budget = await tx.budget.findFirst({
            where: { companyId, fiscalYearId: activeYear.id, accountId: accId }
          });
          if (budget) {
            await tx.budget.update({
              where: { id: budget.id },
              data: { utilizedAmount: { increment: d } }
            });
          }
        }
      }

      return entry;
    });

    // Dispatch real-time WebSocket warning notifications for budgets
    if (budgetWarnings.length > 0 && req.user?.userId) {
      for (const warning of budgetWarnings) {
        const dbNotif = await prisma.notification.create({
          data: {
            userId: req.user.userId,
            title: "⚠️ BUDGET EXCEEDED WARNING",
            message: warning,
            category: "finance",
            channels: "in_app",
            type: "STOCK", // mapping to warning popup type
            priority: "HIGH",
            companyId
          }
        });
        triggerRealtimeAlert(req.user.userId, dbNotif);
      }
    }

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "CREATE", "finance", { entryId: newEntry.id, entryNumber });
    return res.status(201).json({ message: "Journal voucher posted successfully", journalEntry: newEntry, warnings: budgetWarnings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. FINANCIAL STATEMENTS REPORTS
// ==========================================

router.get('/reports/trial-balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    const accounts = await prisma.chartOfAccounts.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { accountCode: 'asc' }
    });

    let grandDebit = 0.0;
    let grandCredit = 0.0;

    const trialBalance = await Promise.all(accounts.map(async (acc) => {
      const summary = await prisma.journalEntryLine.aggregate({
        where: {
          accountId: acc.id,
          journalEntry: {
            companyId,
            status: "POSTED"
          }
        },
        _sum: {
          debit: true,
          credit: true
        }
      });

      const totalDebit = summary._sum.debit || 0.0;
      const totalCredit = summary._sum.credit || 0.0;
      grandDebit += totalDebit;
      grandCredit += totalCredit;

      return {
        id: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        totalDebit,
        totalCredit
      };
    }));

    return res.json({ trialBalance, grandDebit, grandCredit });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/reports/profit-loss', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        companyId,
        accountType: { in: ["REVENUE", "EXPENSE"] },
        isDeleted: false
      },
      orderBy: { accountCode: 'asc' }
    });

    const revenues = accounts.filter(a => a.accountType === "REVENUE");
    const expenses = accounts.filter(a => a.accountType === "EXPENSE");

    const totalRevenue = revenues.reduce((sum, a) => sum + a.balance, 0.0);
    const totalExpense = expenses.reduce((sum, a) => sum + a.balance, 0.0);
    const netProfitLoss = totalRevenue - totalExpense;

    return res.json({
      revenues,
      expenses,
      totalRevenue,
      totalExpense,
      netProfitLoss
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/reports/balance-sheet', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        companyId,
        accountType: { in: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] },
        isDeleted: false
      },
      orderBy: { accountCode: 'asc' }
    });

    const assets = accounts.filter(a => a.accountType === "ASSET");
    const liabilities = accounts.filter(a => a.accountType === "LIABILITY");
    const equityAccounts = accounts.filter(a => a.accountType === "EQUITY");

    // Dynamic Income aggregation
    const revenues = accounts.filter(a => a.accountType === "REVENUE");
    const expenses = accounts.filter(a => a.accountType === "EXPENSE");
    const totalRevenue = revenues.reduce((sum, a) => sum + a.balance, 0.0);
    const totalExpense = expenses.reduce((sum, a) => sum + a.balance, 0.0);
    const netIncome = totalRevenue - totalExpense;

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0.0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0.0);
    const totalEquityRaw = equityAccounts.reduce((sum, a) => sum + a.balance, 0.0);
    
    // Add net income as current year rollover profit to the Equity side
    const totalEquity = totalEquityRaw + netIncome;
    const balancingValidation = Math.abs(totalAssets - (totalLiabilities + totalEquity)) <= 0.01;

    return res.json({
      assets,
      liabilities,
      equity: [
        ...equityAccounts,
        { id: "net-income-current", accountCode: "3999-NP", accountName: "Current Year Net Profit", accountType: "EQUITY", balance: netIncome }
      ],
      totalAssets,
      totalLiabilities,
      totalEquity,
      balancingValidation
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/reports/cash-flow', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    // Detect checking/cash bank accounts
    const bankAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        companyId,
        accountType: "ASSET",
        OR: [
          { accountName: { contains: "Cash" } },
          { accountName: { contains: "Bank" } },
          { accountName: { contains: "Checking" } },
          { accountName: { contains: "Operating" } }
        ],
        isDeleted: false
      }
    });

    const bankAccIds = bankAccounts.map(b => b.id);

    // Grab all posted lines that affect these cash/bank accounts
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: { companyId, status: "POSTED" }
      },
      include: {
        journalEntry: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        }
      }
    });

    // Categorize cash inflows/outflows
    let operatingActivities = 0.0;
    let investingActivities = 0.0;
    let financingActivities = 0.0;

    const matchedEntries = new Set<string>();

    for (const line of journalLines) {
      if (bankAccIds.includes(line.accountId)) {
        const entryId = line.journalEntryId;
        if (matchedEntries.has(entryId)) continue;
        matchedEntries.add(entryId);

        const flowAmount = line.debit - line.credit; // positive inflow, negative outflow

        // Inspect non-cash opposite accounts in this voucher
        const otherLines = line.journalEntry.lines.filter(l => l.accountId !== line.accountId);
        if (otherLines.length > 0) {
          const mainOppositeType = otherLines[0].account.accountType;

          if (["REVENUE", "EXPENSE"].includes(mainOppositeType)) {
            operatingActivities += flowAmount;
          } else if (mainOppositeType === "ASSET") {
            investingActivities += flowAmount; // fixed assets purchase/sale
          } else if (["LIABILITY", "EQUITY"].includes(mainOppositeType)) {
            financingActivities += flowAmount; // capital injection, bank loan
          } else {
            operatingActivities += flowAmount;
          }
        } else {
          operatingActivities += flowAmount;
        }
      }
    }

    const netChange = operatingActivities + investingActivities + financingActivities;

    return res.json({
      operatingActivities,
      investingActivities,
      financingActivities,
      netChange
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. AP / AR SUBLEDGERS
// ==========================================

router.get('/reports/aging/customer', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    const customers = await prisma.customerMaster.findMany({
      where: { companyId, isDeleted: false }
    });

    const now = new Date();

    const aging = await Promise.all(customers.map(async (cust) => {
      // Find outstanding transactions
      const lines = await prisma.journalEntryLine.findMany({
        where: {
          customerId: cust.id,
          journalEntry: {
            companyId,
            status: "POSTED"
          }
        },
        include: { journalEntry: true }
      });

      let current = 0.0;
      let age30 = 0.0;
      let age60 = 0.0;
      let age90 = 0.0;
      let ageOver90 = 0.0;

      for (const line of lines) {
        const amt = line.debit - line.credit;
        if (amt === 0) continue;

        const diffTime = Math.abs(now.getTime() - line.journalEntry.postingDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          current += amt;
        } else if (diffDays <= 60) {
          age30 += amt;
        } else if (diffDays <= 90) {
          age60 += amt;
        } else if (diffDays <= 120) {
          age90 += amt;
        } else {
          ageOver90 += amt;
        }
      }

      return {
        customerId: cust.id,
        customerCode: cust.customerCode,
        customerName: cust.customerName,
        outstandingAmount: cust.outstandingAmount,
        breakdown: { current, age30, age60, age90, ageOver90 }
      };
    }));

    return res.json({ aging });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/reports/aging/vendor', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    const vendors = await prisma.vendorMaster.findMany({
      where: { companyId, isDeleted: false }
    });

    const now = new Date();

    const aging = await Promise.all(vendors.map(async (vend) => {
      const lines = await prisma.journalEntryLine.findMany({
        where: {
          vendorId: vend.id,
          journalEntry: {
            companyId,
            status: "POSTED"
          }
        },
        include: { journalEntry: true }
      });

      let current = 0.0;
      let age30 = 0.0;
      let age60 = 0.0;
      let age90 = 0.0;
      let ageOver90 = 0.0;

      for (const line of lines) {
        const amt = line.credit - line.debit; // Credit increases vendor payables
        if (amt === 0) continue;

        const diffTime = Math.abs(now.getTime() - line.journalEntry.postingDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          current += amt;
        } else if (diffDays <= 60) {
          age30 += amt;
        } else if (diffDays <= 90) {
          age60 += amt;
        } else if (diffDays <= 120) {
          age90 += amt;
        } else {
          ageOver90 += amt;
        }
      }

      return {
        vendorId: vend.id,
        vendorCode: vend.vendorCode,
        vendorName: vend.vendorName,
        outstandingAmount: vend.rating || 0.0, // mapping vendor rating field as outstanding payables
        breakdown: { current, age30, age60, age90, ageOver90 }
      };
    }));

    return res.json({ aging });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. ASSET REGISTER & DEPRECIATION
// ==========================================

router.get('/assets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const assets = await prisma.assetMaster.findMany({
      where: { companyId },
      include: { depreciations: true }
    });
    return res.json({ assets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/asset', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { assetCode, assetName, purchaseDate, purchaseCost, depreciationMethod, usefulLifeYears, salvageValue } = req.body;

    if (!assetCode || !assetName || !purchaseCost || !usefulLifeYears) {
      return res.status(400).json({ error: "Missing required asset master fields" });
    }

    // Check duplicate code
    const existing = await prisma.assetMaster.findFirst({
      where: { companyId, assetCode }
    });

    if (existing) {
      return res.status(400).json({ error: `Asset code '${assetCode}' already exists` });
    }

    const cost = parseFloat(purchaseCost);
    const salvage = parseFloat(salvageValue || 0);
    const years = parseInt(usefulLifeYears);

    const asset = await prisma.assetMaster.create({
      data: {
        companyId: companyId!,
        assetCode,
        assetName,
        purchaseDate: new Date(purchaseDate),
        purchaseCost: cost,
        depreciationMethod,
        usefulLifeYears: years,
        salvageValue: salvage,
        bookValue: cost,
        status: "ACTIVE"
      }
    });

    // Pre-calculate depreciation schedule
    const schedules: any[] = [];
    let currentBookValue = cost;
    const depDate = new Date(purchaseDate);

    if (depreciationMethod === "STRAIGHT_LINE") {
      const yearlyDep = (cost - salvage) / years;
      for (let i = 1; i <= years; i++) {
        depDate.setFullYear(depDate.getFullYear() + 1);
        currentBookValue -= yearlyDep;
        schedules.push({
          assetId: asset.id,
          depreciationDate: new Date(depDate),
          depreciationAmount: yearlyDep,
          bookValueAfter: Math.max(currentBookValue, salvage),
          isPosted: false
        });
      }
    } else {
      // WDV (Written Down Value) depreciation rate e.g., 20%
      const rate = 0.20;
      for (let i = 1; i <= years; i++) {
        depDate.setFullYear(depDate.getFullYear() + 1);
        const yearlyDep = currentBookValue * rate;
        currentBookValue -= yearlyDep;
        schedules.push({
          assetId: asset.id,
          depreciationDate: new Date(depDate),
          depreciationAmount: yearlyDep,
          bookValueAfter: Math.max(currentBookValue, salvage),
          isPosted: false
        });
      }
    }

    await prisma.assetDepreciationSchedule.createMany({
      data: schedules
    });

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "CREATE", "finance", asset);
    return res.status(201).json({ message: "Asset registered and schedules pre-generated", asset });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/asset/depreciate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { scheduleId } = req.body;

    const schedule = await prisma.assetDepreciationSchedule.findUnique({
      where: { id: scheduleId },
      include: { asset: true }
    });

    if (!schedule || schedule.asset.companyId !== companyId) {
      return res.status(404).json({ error: "Depreciation schedule period not found" });
    }

    if (schedule.isPosted) {
      return res.status(400).json({ error: "Depreciation has already been posted to the general ledger" });
    }

    // SAP-grade depreciation posting voucher:
    // Debit: Depreciation Expense
    // Credit: Accumulated Depreciation (or Asset Account directly)
    let depExpenseAcc = await prisma.chartOfAccounts.findFirst({
      where: { companyId, accountCode: "5020-DEP", isDeleted: false }
    });

    if (!depExpenseAcc) {
      depExpenseAcc = await prisma.chartOfAccounts.create({
        data: {
          companyId: companyId!,
          accountCode: "5020-DEP",
          accountName: "Depreciation Expense",
          accountType: "EXPENSE",
          balance: 0.0
        }
      });
    }

    let assetGlAcc = await prisma.chartOfAccounts.findFirst({
      where: { companyId, accountCode: `1500-${schedule.asset.assetCode}`, isDeleted: false }
    });

    if (!assetGlAcc) {
      assetGlAcc = await prisma.chartOfAccounts.create({
        data: {
          companyId: companyId!,
          accountCode: `1500-${schedule.asset.assetCode}`,
          accountName: `Fixed Asset - ${schedule.asset.assetName}`,
          accountType: "ASSET",
          balance: schedule.asset.purchaseCost
        }
      });
    }

    const postDate = new Date();
    // Validate Fiscal Period
    const activeYear = await prisma.fiscalYear.findFirst({
      where: {
        companyId,
        status: "ACTIVE",
        startDate: { lte: postDate },
        endDate: { gte: postDate }
      }
    });

    if (!activeYear) {
      return res.status(400).json({ error: "No active fiscal period open for depreciation posting date" });
    }

    // Sequential voucher code JV-YYYY-XXXX
    const count = await prisma.journalEntry.count({ where: { companyId } });
    const entryNumber = `DEP-${postDate.getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    await prisma.$transaction(async (tx) => {
      // Create journal entry voucher
      const entry = await tx.journalEntry.create({
        data: {
          companyId: companyId!,
          fiscalYearId: activeYear.id,
          entryNumber,
          entryDate: postDate,
          postingDate: postDate,
          reference: "ASSET_DEPRECIATION",
          narration: `Automatic depreciation allocation for fixed asset ${schedule.asset.assetName}`,
          status: "POSTED",
          lines: {
            create: [
              {
                accountId: depExpenseAcc!.id,
                debit: schedule.depreciationAmount,
                credit: 0.0,
                narration: `Depreciation debit expense for ${schedule.asset.assetName}`
              },
              {
                accountId: assetGlAcc!.id,
                debit: 0.0,
                credit: schedule.depreciationAmount,
                narration: `Credit accumulated depreciation reduction for ${schedule.asset.assetName}`
              }
            ]
          }
        }
      });

      // Update balances
      await tx.chartOfAccounts.update({
        where: { id: depExpenseAcc!.id },
        data: { balance: { increment: schedule.depreciationAmount } }
      });

      await tx.chartOfAccounts.update({
        where: { id: assetGlAcc!.id },
        data: { balance: { decrement: schedule.depreciationAmount } }
      });

      // Update asset record
      await tx.assetMaster.update({
        where: { id: schedule.assetId },
        data: {
          accumulatedDepreciation: { increment: schedule.depreciationAmount },
          bookValue: schedule.bookValueAfter
        }
      });

      // Update schedule record
      await tx.assetDepreciationSchedule.update({
        where: { id: scheduleId },
        data: {
          isPosted: true,
          journalEntryId: entry.id
        }
      });
    });

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "CREATE", "finance", { scheduleId, assetName: schedule.asset.assetName });
    return res.json({ message: "Depreciation voucher posted to ledger successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. BUDGETS MANAGEMENT
// ==========================================

router.get('/budgets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const budgets = await prisma.budget.findMany({
      where: { companyId },
      include: {
        account: true,
        fiscalYear: true
      }
    });
    return res.json({ budgets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/budget', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { fiscalYearId, accountId, allocatedAmount } = req.body;

    if (!fiscalYearId || !accountId || allocatedAmount === undefined) {
      return res.status(400).json({ error: "Missing required budget fields" });
    }

    const amount = parseFloat(allocatedAmount);

    const budget = await prisma.budget.upsert({
      where: {
        companyId_fiscalYearId_accountId: {
          companyId: companyId!,
          fiscalYearId,
          accountId
        }
      },
      update: {
        allocatedAmount: amount
      },
      create: {
        companyId: companyId!,
        fiscalYearId,
        accountId,
        allocatedAmount: amount,
        utilizedAmount: 0.0
      }
    });

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "CREATE", "finance", budget);
    return res.status(201).json({ message: "Budget allocated/updated successfully", budget });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. BANK RECONCILIATION
// ==========================================

router.get('/bank-accounts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { companyId },
      include: { glAccount: true }
    });
    return res.json({ bankAccounts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/bank-account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { accountName, accountNumber, bankName, glAccountId } = req.body;

    if (!accountName || !accountNumber || !bankName || !glAccountId) {
      return res.status(400).json({ error: "Missing required fields for bank account" });
    }

    // Check duplicate
    const existing = await prisma.bankAccount.findFirst({
      where: { companyId, accountNumber }
    });

    if (existing) {
      return res.status(400).json({ error: `Bank account number '${accountNumber}' already registered` });
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        companyId: companyId!,
        accountName,
        accountNumber,
        bankName,
        glAccountId,
        status: "ACTIVE"
      }
    });

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "CREATE", "finance", bankAccount);
    return res.status(201).json({ message: "Bank account linked successfully", bankAccount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/bank-account/:bankAccountId/statement', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { bankAccountId } = req.params;
    const { statementDate, openingBalance, closingBalance, lines } = req.body;

    if (!statementDate || lines === undefined || !Array.isArray(lines)) {
      return res.status(400).json({ error: "Missing required statement fields" });
    }

    const statement = await prisma.bankStatement.create({
      data: {
        bankAccountId,
        statementDate: new Date(statementDate),
        openingBalance: parseFloat(openingBalance || 0),
        closingBalance: parseFloat(closingBalance || 0),
        status: "DRAFT",
        lines: {
          create: lines.map((l: any) => ({
            transactionDate: new Date(l.transactionDate),
            description: l.description,
            amount: parseFloat(l.amount),
            reference: l.reference || null,
            isReconciled: false
          }))
        }
      },
      include: {
        lines: true
      }
    });

    // Auto Matching reconciliation routine:
    // Automatically match statement lines with GL Journal Entry Lines where amount, date (within 3 days), or reference match.
    for (const sLine of statement.lines) {
      const startRange = new Date(sLine.transactionDate);
      startRange.setDate(startRange.getDate() - 3);
      const endRange = new Date(sLine.transactionDate);
      endRange.setDate(endRange.getDate() + 3);

      const bankAcc = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bankAcc) continue;

      const matchedGlLine = await prisma.journalEntryLine.findFirst({
        where: {
          accountId: bankAcc.glAccountId,
          debit: sLine.amount > 0 ? sLine.amount : 0.0,
          credit: sLine.amount < 0 ? Math.abs(sLine.amount) : 0.0,
          journalEntry: {
            companyId,
            postingDate: { gte: startRange, lte: endRange },
            status: "POSTED"
          }
        }
      });

      if (matchedGlLine) {
        await prisma.bankStatementLine.update({
          where: { id: sLine.id },
          data: {
            isReconciled: true,
            matchedJournalEntryId: matchedGlLine.journalEntryId,
            reconciledAt: new Date()
          }
        });
      }
    }

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "CREATE", "finance", { statementId: statement.id });
    return res.status(201).json({ message: "Statement uploaded and auto-reconciliation performed", statement });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/bank-account/:bankAccountId/unreconciled', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { bankAccountId } = req.params;

    const bankAcc = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId }
    });

    if (!bankAcc) {
      return res.status(404).json({ error: "Bank account not linked" });
    }

    const bankLines = await prisma.bankStatementLine.findMany({
      where: {
        bankStatement: { bankAccountId },
        isReconciled: false
      },
      include: { bankStatement: true }
    });

    const glLines = await prisma.journalEntryLine.findMany({
      where: {
        accountId: bankAcc.glAccountId,
        journalEntry: {
          companyId,
          status: "POSTED"
        }
      },
      include: { journalEntry: true }
    });

    // Filter GL lines that have NOT been reconciled (not linked by any reconciled BankStatementLine)
    const reconciledGlEntryIds = (await prisma.bankStatementLine.findMany({
      where: {
        bankStatement: { bankAccountId },
        isReconciled: true,
        matchedJournalEntryId: { not: null }
      },
      select: { matchedJournalEntryId: true }
    })).map(x => x.matchedJournalEntryId);

    const unreconciledGlLines = glLines.filter(g => !reconciledGlEntryIds.includes(g.journalEntryId));

    return res.json({ bankLines, glLines: unreconciledGlLines });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/bank-reconcile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { statementLineId, journalEntryId } = req.body;

    const line = await prisma.bankStatementLine.findUnique({
      where: { id: statementLineId },
      include: { bankStatement: { include: { bankAccount: true } } }
    });

    if (!line || line.bankStatement.bankAccount.companyId !== companyId) {
      return res.status(404).json({ error: "Statement line not found" });
    }

    const journal = await prisma.journalEntry.findFirst({
      where: { id: journalEntryId, companyId }
    });

    if (!journal) {
      return res.status(404).json({ error: "Journal entry not found" });
    }

    await prisma.bankStatementLine.update({
      where: { id: statementLineId },
      data: {
        isReconciled: true,
        matchedJournalEntryId: journalEntryId,
        reconciledAt: new Date()
      }
    });

    // Check if the whole statement is reconciled
    const remainingUnreconciled = await prisma.bankStatementLine.count({
      where: { bankStatementId: line.bankStatementId, isReconciled: false }
    });

    if (remainingUnreconciled === 0) {
      await prisma.bankStatement.update({
        where: { id: line.bankStatementId },
        data: { status: "RECONCILED" }
      });
    }

    await logAudit(companyId!, req.user?.userId!, req.user?.username!, "UPDATE", "finance", { statementLineId, journalEntryId });
    return res.json({ message: "Transaction reconciled successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
