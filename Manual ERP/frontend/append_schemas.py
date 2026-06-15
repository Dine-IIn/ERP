with open('src/utils/schemas.ts', 'a', encoding='utf-8') as f:
    f.write('''\n// --- HRMS Schemas ---
export const EmployeeUpdateSchema = z.object({
  roleId: z.string().nullable().optional().or(z.literal('')),
  departmentId: z.string().nullable().optional().or(z.literal('')),
  status: z.string(),
  shiftStart: z.string().nullable().optional(),
  shiftEnd: z.string().nullable().optional(),
  shiftName: z.string().nullable().optional(),
  reportsToId: z.string().nullable().optional().or(z.literal('')),
  mobileNo: z.string().min(1, "Mobile number is required"),
  email: z.string().email().nullable().optional().or(z.literal(''))
});

export const LeaveRequestSchema = z.object({
  type: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required")
});

export const ShiftRosterSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  gracePeriod: z.number().min(0)
});

export const PayrollGenerateSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2000),
  basicSalary: z.number().min(0),
  allowances: z.number().min(0).optional(),
  deductions: z.number().min(0).optional()
});

// --- Inventory Schemas ---
export const StockAdjustSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.string().min(1, "Adjustment type is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason is required")
});

export const ProductUpdateSchema = z.object({
  reorderLevel: z.number().min(0).optional(),
  warehouseLoc: z.string().optional()
});
''')
