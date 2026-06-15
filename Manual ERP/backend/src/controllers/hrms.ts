import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';
import {
  UpdateEmployeeSchema,
  LeaveRequestSchema,
  UpdateLeaveStatusSchema,
  ShiftRosterSchema,
  GeneratePayrollSchema,
  DisbursePayrollSchema,
  ListAttendanceQuerySchema,
  ListLeaveRequestsQuerySchema,
  ListPayrollQuerySchema
} from '../types';

// =========================================================================
// 1. Employees Directory (linked to User, Role, Department in administration)
// =========================================================================

export async function listEmployees(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const employees = await prisma.user.findMany({
      where: { companyId },
      include: {
        role: true,
        department: true,
        reportsTo: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { username: 'asc' }
    });

    return res.json({ employees });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = UpdateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { departmentId, roleId, status, shiftStart, shiftEnd, shiftName, reportsToId, mobileNo, email } = parsed.data;

    const employee = await prisma.user.findFirst({
      where: { id, companyId }
    });
    if (!employee) return res.status(404).json({ error: "Employee record not found" });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(roleId !== undefined && { roleId: roleId || null }),
        ...(status && { status }),
        ...(shiftStart !== undefined && { shiftStart: shiftStart || null }),
        ...(shiftEnd !== undefined && { shiftEnd: shiftEnd || null }),
        ...(shiftName !== undefined && { shiftName: shiftName || null }),
        ...(reportsToId !== undefined && { reportsToId: reportsToId || null }),
        ...(mobileNo && { mobileNo }),
        ...(email !== undefined && { email: email || null })
      },
      include: {
        role: true,
        department: true
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'hrms_employees',
      'UPDATE',
      employee,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Employee profile synchronized successfully", employee: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 2. Attendance punch systems
// =========================================================================

export async function listAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = ListAttendanceQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { userId, startDate, endDate } = parsed.data;

    const attendances = await prisma.attendance.findMany({
      where: {
        companyId,
        ...(userId && { userId: String(userId) }),
        ...(startDate && endDate && {
          date: {
            gte: new Date(String(startDate)),
            lte: new Date(String(endDate))
          }
        })
      },
      include: {
        user: { select: { id: true, username: true, email: true } }
      },
      orderBy: { checkIn: 'desc' }
    });

    return res.json({ attendances });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function punchAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    if (!companyId || !userId) return res.status(401).json({ error: "Unauthorized" });

    const now = new Date();

    // Check if there is an active check-in (checkOut is null)
    const activePunch = await prisma.attendance.findFirst({
      where: { companyId, userId, checkOut: null },
      orderBy: { checkIn: 'desc' }
    });

    if (activePunch) {
      // Punch Out
      const checkInTime = new Date(activePunch.checkIn);
      const durationHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const updated = await prisma.attendance.update({
        where: { id: activePunch.id },
        data: {
          checkOut: now,
          duration: Math.round(durationHours * 100) / 100
        }
      });

      await logAudit(
        companyId,
        userId,
        req.user?.username || null,
        'hrms_attendance',
        'PUNCH_OUT',
        activePunch,
        updated,
        req.ip,
        req.headers['user-agent']
      );

      return res.json({ message: "Punched out successfully", attendance: updated });
    } else {
      // Punch In
      // Calculate attendance status based on default late rule (e.g. if after 09:30 AM status is LATE)
      // For detailed shift integration, we can fetch active shift and compare start times
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const isLate = currentHour > 9 || (currentHour === 9 && currentMin > 30);
      const status = isLate ? "LATE" : "PRESENT";

      const attendance = await prisma.attendance.create({
        data: {
          companyId,
          userId,
          checkIn: now,
          status
        }
      });

      await logAudit(
        companyId,
        userId,
        req.user?.username || null,
        'hrms_attendance',
        'PUNCH_IN',
        null,
        attendance,
        req.ip,
        req.headers['user-agent']
      );

      return res.status(201).json({ message: "Punched in successfully", attendance });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 3. Leave Management (approvals linkable to Administration role permissions)
// =========================================================================

export async function listLeaveRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = ListLeaveRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { userId } = parsed.data;

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        companyId,
        ...(userId && { userId: String(userId) })
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        approvedBy: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ leaveRequests });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createLeaveRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    if (!companyId || !userId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = LeaveRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { type, startDate, endDate, reason } = parsed.data;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        companyId,
        userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: "PENDING"
      }
    });

    return res.status(201).json({ message: "Leave request submitted successfully", leaveRequest });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateLeaveRequestStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    if (!companyId || !userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = UpdateLeaveStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { status, notes } = parsed.data;

    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: { id, companyId }
    });
    if (!leaveRequest) return res.status(404).json({ error: "Leave request not found" });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        notes: notes || null,
        approvedById: userId
      },
      include: {
        user: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } }
      }
    });

    await logAudit(
      companyId,
      userId,
      req.user?.username || null,
      'hrms_leaves',
      'DECIDE',
      leaveRequest,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Leave request ${status.toLowerCase()} successfully`, leaveRequest: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 4. Shift Rosters
// =========================================================================

export async function listShiftRosters(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const shiftRosters = await prisma.shiftRoster.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });

    return res.json({ shiftRosters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createShiftRoster(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = ShiftRosterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { name, startTime, endTime, gracePeriod } = parsed.data;

    const roster = await prisma.shiftRoster.create({
      data: {
        companyId,
        name,
        startTime,
        endTime,
        gracePeriod: gracePeriod !== undefined ? gracePeriod : 15
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'hrms_shifts',
      'CREATE',
      null,
      roster,
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Shift roster configured successfully", roster });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 5. Basic Payroll Periods Sheets
// =========================================================================

export async function listPayroll(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = ListPayrollQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { month, year } = parsed.data;

    const payrolls = await prisma.payrollPeriod.findMany({
      where: {
        companyId,
        ...(month && { month: parseInt(String(month)) }),
        ...(year && { year: parseInt(String(year)) })
      },
      include: {
        user: { select: { id: true, username: true, email: true } }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    return res.json({ payrolls });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function generatePayroll(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = GeneratePayrollSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { userId, month: parsedMonth, year: parsedYear, basicSalary: parsedBasic, allowances, deductions } = parsed.data;

    const parsedAllowances = allowances !== undefined ? allowances : 0.0;
    const parsedDeductionsInput = deductions !== undefined ? deductions : 0.0;

    // --- Dynamic Deductions Calculations ---
    const startDate = new Date(parsedYear, parsedMonth - 1, 1);
    const endDate = new Date(parsedYear, parsedMonth, 0, 23, 59, 59);
    const dailyRate = parsedBasic / 30.0;

    // 1. Calculate Unpaid Leaves (SICK, CASUAL, ANNUAL approved leaves count as daily deductions)
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        companyId,
        userId,
        status: "APPROVED",
        type: { in: ["SICK", "CASUAL", "ANNUAL"] },
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } }
        ]
      }
    });

    let totalLeaveDays = 0;
    for (const leave of approvedLeaves) {
      const leaveStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
      const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
      const diffTime = Math.abs(leaveEnd.getTime() - leaveStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      totalLeaveDays += diffDays;
    }
    const leaveDeduction = totalLeaveDays * dailyRate;

    // 2. Calculate Late check-ins (10% of daily rate per check-in marked as LATE)
    const lateArrivalsCount = await prisma.attendance.count({
      where: {
        companyId,
        userId,
        status: "LATE",
        date: { gte: startDate, lte: endDate }
      }
    });
    const lateDeduction = lateArrivalsCount * (dailyRate * 0.1);

    const totalCalculatedDeductions = parsedDeductionsInput + leaveDeduction + lateDeduction;
    const netSalary = parsedBasic + parsedAllowances - totalCalculatedDeductions;

    // Create or update payroll record
    const payroll = await prisma.payrollPeriod.upsert({
      where: {
        companyId_userId_month_year: {
          companyId,
          userId,
          month: parsedMonth,
          year: parsedYear
        }
      },
      create: {
        companyId,
        userId,
        month: parsedMonth,
        year: parsedYear,
        basicSalary: parsedBasic,
        allowances: parsedAllowances,
        deductions: totalCalculatedDeductions,
        netSalary,
        status: "PENDING"
      },
      update: {
        basicSalary: parsedBasic,
        allowances: parsedAllowances,
        deductions: totalCalculatedDeductions,
        netSalary,
        status: "PENDING"
      }
    });

    return res.status(200).json({ message: "Payroll sheet generated successfully", payroll });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function disbursePayroll(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = DisbursePayrollSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { referenceNo, notes } = parsed.data;

    const payroll = await prisma.payrollPeriod.findFirst({
      where: { id, companyId },
      include: { user: true }
    });
    if (!payroll) return res.status(404).json({ error: "Payroll record not found" });
    if (payroll.status === "DISBURSED") {
      return res.status(400).json({ error: "Payroll already disbursed" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.payrollPeriod.update({
        where: { id },
        data: {
          status: "DISBURSED",
          paymentDate: new Date(),
          referenceNo: referenceNo || null,
          notes: notes || null
        }
      });

      const desc = `Salary Disbursement for ${payroll.user.username} (Month: ${payroll.month}/${payroll.year})`;

      // 1. Create CompanyExpense record
      await tx.companyExpense.create({
        data: {
          companyId,
          amount: payroll.netSalary,
          description: desc,
          category: "SALARY",
          date: new Date(),
          referenceNo: referenceNo || `PAYROLL-${payroll.id}`
        }
      });

      // 2. Deduct from Bank Account Balance
      const bankAccount = await tx.companyBankAccount.findFirst({ where: { companyId } });
      if (bankAccount) {
        await tx.companyBankAccount.update({
          where: { id: bankAccount.id },
          data: { balance: { decrement: payroll.netSalary } }
        });
      }

      // 3. Create CashbookVoucher
      const lastVoucher = await tx.cashbookVoucher.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });
      const previousBal = lastVoucher ? lastVoucher.currentBal : 0.0;
      const currentBal = previousBal - payroll.netSalary;

      const count = await tx.cashbookVoucher.count({ where: { companyId } });
      const voucherNo = `VCH-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

      await tx.cashbookVoucher.create({
        data: {
          companyId,
          voucherNo,
          entryType: 'OUTWARD_EXPENSE',
          amount: payroll.netSalary,
          previousBal,
          currentBal,
          description: desc,
          referenceNo: referenceNo || `PAYROLL-${payroll.id}`
        }
      });

      return up;
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'hrms_payroll',
      'DISBURSE',
      payroll,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Salary disbursed successfully", payroll: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
