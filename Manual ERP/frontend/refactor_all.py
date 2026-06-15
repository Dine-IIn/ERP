import os
import re

def refactor_employees():
    path = 'src/components/hrms/Employees.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    if "EmployeeUpdateSchema" not in code:
        imports = """import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { EmployeeUpdateSchema } from '../../utils/schemas';
"""
        code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + imports)

    code = code.replace("apiClient.patch(`/api/hrms/employees/\\, payload)", "apiClient.patch(`/api/hrms/employees/${id}`, payload)")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

def refactor_attendance():
    path = 'src/components/hrms/Attendance.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    if "useQuery" not in code:
        imports = """import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
"""
        code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + imports)

    code = re.sub(
        r"interface AttendanceProps \{([\s\S]*?)\}",
        r"interface AttendanceProps {\n  attendances?: AttendanceLog[];\n  employees?: any[];\n  currentUser?: any;\n  onPunchAttendance?: () => Promise<void>;\n  onFetchFilteredAttendance?: (userId?: string, start?: string, end?: string) => Promise<void>;\n}",
        code
    )

    setup_replacement = """  const queryClient = useQueryClient();

  const { data: fetchedAttendances } = useQuery({
    queryKey: ['hrms-attendance'],
    queryFn: () => apiClient.get<AttendanceLog[]>('/api/hrms/attendance')
  });
  
  const punchMutation = useMutation({
    mutationFn: () => apiClient.post('/api/hrms/attendance/punch', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-attendance'] })
  });

  const activeAttendances = attendances || fetchedAttendances || [];

  const [filterUser, setFilterUser] = useState('');"""
    code = code.replace("  const [filterUser, setFilterUser] = useState('');", setup_replacement, 1)

    code = code.replace("attendances.filter", "activeAttendances.filter")
    code = code.replace("(attendances || [])", "activeAttendances")
    
    handle_punch_old = """  const handlePunch = async () => {
    setPunching(true);
    try {
      await onPunchAttendance();"""
      
    handle_punch_new = """  const handlePunch = async () => {
    setPunching(true);
    try {
      if (onPunchAttendance) {
        await onPunchAttendance();
      } else {
        await punchMutation.mutateAsync();
      }"""
    code = code.replace(handle_punch_old, handle_punch_new)

    # Note: I am not adding Zod for attendance punch because it takes no payload.

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

def refactor_leave():
    path = 'src/components/hrms/LeaveManagement.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    if "LeaveRequestSchema" not in code:
        imports = """import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { LeaveRequestSchema } from '../../utils/schemas';
"""
        code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + imports)

    code = re.sub(
        r"interface LeaveManagementProps \{([\s\S]*?)\}",
        r"interface LeaveManagementProps {\n  leaveRequests?: LeaveRequest[];\n  currentUser?: any;\n  onCreateLeaveRequest?: (data: any) => Promise<void>;\n  onUpdateLeaveStatus?: (id: string, status: string, notes: string) => Promise<void>;\n}",
        code
    )

    setup_replacement = """  const queryClient = useQueryClient();

  const { data: fetchedLeaveRequests } = useQuery({
    queryKey: ['hrms-leaves'],
    queryFn: () => apiClient.get<LeaveRequest[]>('/api/hrms/leaves')
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/hrms/leaves', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-leaves'] })
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string, status: string, notes: string }) => apiClient.patch(`/api/hrms/leaves/${id}`, { status, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-leaves'] })
  });

  const activeLeaveRequests = leaveRequests || fetchedLeaveRequests || [];

  const [showApplyModal, setShowApplyModal] = useState(false);"""
    code = code.replace("  const [showApplyModal, setShowApplyModal] = useState(false);", setup_replacement, 1)

    code = code.replace("(leaveRequests || [])", "activeLeaveRequests")
    
    handle_apply_old = """    try {
      await onCreateLeaveRequest({
        type,
        startDate,
        endDate,
        reason: reason.trim()
      });"""
    handle_apply_new = """    const payload = { type, startDate, endDate, reason: reason.trim() };
    const parseResult = LeaveRequestSchema.safeParse(payload);
    if (!parseResult.success) {
      setLocalErr(parseResult.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (onCreateLeaveRequest) {
        await onCreateLeaveRequest(parseResult.data);
      } else {
        await createMutation.mutateAsync(parseResult.data);
      }"""
    code = code.replace(handle_apply_old, handle_apply_new)

    handle_update_old = """    try {
      await onUpdateLeaveStatus(activeRequest.id, status, notes.trim());"""
    handle_update_new = """    try {
      if (onUpdateLeaveStatus) {
        await onUpdateLeaveStatus(activeRequest.id, status, notes.trim());
      } else {
        await updateStatusMutation.mutateAsync({ id: activeRequest.id, status, notes: notes.trim() });
      }"""
    code = code.replace(handle_update_old, handle_update_new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

def refactor_shifts():
    path = 'src/components/hrms/Shifts.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    if "ShiftRosterSchema" not in code:
        imports = """import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { ShiftRosterSchema } from '../../utils/schemas';
"""
        code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + imports)

    code = re.sub(
        r"interface ShiftsProps \{([\s\S]*?)\}",
        r"interface ShiftsProps {\n  shiftRosters?: ShiftRoster[];\n  onCreateShiftRoster?: (data: any) => Promise<void>;\n}",
        code
    )

    setup_replacement = """  const queryClient = useQueryClient();

  const { data: fetchedShiftRosters } = useQuery({
    queryKey: ['hrms-shifts'],
    queryFn: () => apiClient.get<ShiftRoster[]>('/api/hrms/shifts')
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/hrms/shifts', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-shifts'] })
  });

  const activeShiftRosters = shiftRosters || fetchedShiftRosters || [];

  const [showAddModal, setShowAddModal] = useState(false);"""
    code = code.replace("  const [showAddModal, setShowAddModal] = useState(false);", setup_replacement, 1)

    code = code.replace("(shiftRosters || [])", "activeShiftRosters")

    handle_create_old = """    try {
      await onCreateShiftRoster({
        name: name.trim(),
        startTime,
        endTime,
        gracePeriod: Number(gracePeriod)
      });"""
    handle_create_new = """    const payload = { name: name.trim(), startTime, endTime, gracePeriod: Number(gracePeriod) };
    const parseResult = ShiftRosterSchema.safeParse(payload);
    if (!parseResult.success) {
      setLocalErr(parseResult.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (onCreateShiftRoster) {
        await onCreateShiftRoster(parseResult.data);
      } else {
        await createMutation.mutateAsync(parseResult.data);
      }"""
    code = code.replace(handle_create_old, handle_create_new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

def refactor_payroll():
    path = 'src/components/hrms/Payroll.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    if "PayrollGenerateSchema" not in code:
        imports = """import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { PayrollGenerateSchema } from '../../utils/schemas';
"""
        code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + imports)

    code = re.sub(
        r"interface PayrollProps \{([\s\S]*?)\}",
        r"interface PayrollProps {\n  payrolls?: PayrollRecord[];\n  employees?: any[];\n  onGeneratePayroll?: (data: any) => Promise<void>;\n  onDisbursePayroll?: (id: string, refNo: string, notes: string) => Promise<void>;\n  currencySymbol?: string;\n}",
        code
    )

    setup_replacement = """  const queryClient = useQueryClient();

  const { data: fetchedPayrolls } = useQuery({
    queryKey: ['hrms-payroll'],
    queryFn: () => apiClient.get<PayrollRecord[]>('/api/hrms/payroll')
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/hrms/payroll/generate', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-payroll'] })
  });

  const disburseMutation = useMutation({
    mutationFn: ({ id, refNo, notes }: { id: string, refNo: string, notes: string }) => apiClient.patch(`/api/hrms/payroll/disburse/${id}`, { referenceNo: refNo, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-payroll'] })
  });

  const activePayrolls = payrolls || fetchedPayrolls || [];

  const [showAddModal, setShowAddModal] = useState(false);"""
    code = code.replace("  const [showAddModal, setShowAddModal] = useState(false);", setup_replacement, 1)

    code = code.replace("(payrolls || [])", "activePayrolls")

    handle_generate_old = """    try {
      await onGeneratePayroll({
        userId,
        month: Number(month),
        year: Number(year),
        basicSalary: parseFloat(basicSalary),
        allowances: allowances ? parseFloat(allowances) : 0,
        deductions: deductions ? parseFloat(deductions) : 0
      });"""
    handle_generate_new = """    const payload = {
        userId,
        month: Number(month),
        year: Number(year),
        basicSalary: parseFloat(basicSalary),
        allowances: allowances ? parseFloat(allowances) : 0,
        deductions: deductions ? parseFloat(deductions) : 0
    };
    const parseResult = PayrollGenerateSchema.safeParse(payload);
    if (!parseResult.success) {
      setLocalErr(parseResult.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (onGeneratePayroll) {
        await onGeneratePayroll(parseResult.data);
      } else {
        await generateMutation.mutateAsync(parseResult.data);
      }"""
    code = code.replace(handle_generate_old, handle_generate_new)

    handle_disburse_old = """    try {
      await onDisbursePayroll(activePayroll.id, referenceNo.trim(), notes.trim());"""
    handle_disburse_new = """    try {
      if (onDisbursePayroll) {
        await onDisbursePayroll(activePayroll.id, referenceNo.trim(), notes.trim());
      } else {
        await disburseMutation.mutateAsync({ id: activePayroll.id, refNo: referenceNo.trim(), notes: notes.trim() });
      }"""
    code = code.replace(handle_disburse_old, handle_disburse_new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)


def refactor_inventory_products():
    path = 'src/components/inventory/InventoryProducts.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    if "StockAdjustSchema" not in code:
        imports = """import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { StockAdjustSchema, ProductUpdateSchema } from '../../utils/schemas';
"""
        code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + imports)

    code = re.sub(
        r"interface InventoryProductsProps \{([\s\S]*?)\}",
        r"interface InventoryProductsProps {\n  products?: Product[];\n  onAdjustStock?: (payload: any) => Promise<void>;\n  onUpdateProduct?: (id: string, payload: any) => Promise<void>;\n}",
        code
    )

    setup_replacement = """  const queryClient = useQueryClient();

  const { data: fetchedProducts } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => apiClient.get<Product[]>('/api/inventory/products')
  });

  const adjustMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/inventory/adjust', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-products'] })
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => apiClient.patch(`/api/inventory/products/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-products'] })
  });

  const activeProducts = products || fetchedProducts || [];

  const [searchTerm, setSearchTerm] = useState('');"""
    code = code.replace("  const [searchTerm, setSearchTerm] = useState('');", setup_replacement, 1)

    code = code.replace("products || []", "activeProducts")
    code = code.replace("products?.map", "activeProducts?.map")

    handle_adjust_old = """    const payload = {
      productId,
      type: adjType,
      quantity: parseFloat(quantity) || 0,
      reason: reason.trim() || "Manual inventory stock audit."
    };

    try {
      await onAdjustStock(payload);"""
    handle_adjust_new = """    const payload = {
      productId,
      type: adjType,
      quantity: parseFloat(quantity) || 0,
      reason: reason.trim() || "Manual inventory stock audit."
    };

    const parseResult = StockAdjustSchema.safeParse(payload);
    if (!parseResult.success) {
      setLocalErr(parseResult.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (onAdjustStock) {
        await onAdjustStock(parseResult.data);
      } else {
        await adjustMutation.mutateAsync(parseResult.data);
      }"""
    code = code.replace(handle_adjust_old, handle_adjust_new)

    handle_location_old = """    const payload = {
      reorderLevel: parseFloat(reorderLevel),
      warehouseLoc: warehouseLoc.trim()
    };

    try {
      await onUpdateProduct(selectedProduct.id, payload);"""
    handle_location_new = """    const payload = {
      reorderLevel: parseFloat(reorderLevel),
      warehouseLoc: warehouseLoc.trim()
    };
    
    const parseResult = ProductUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      setLocalErr(parseResult.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (onUpdateProduct) {
        await onUpdateProduct(selectedProduct.id, parseResult.data);
      } else {
        await updateProductMutation.mutateAsync({ id: selectedProduct.id, payload: parseResult.data });
      }"""
    code = code.replace(handle_location_old, handle_location_new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

if __name__ == "__main__":
    refactor_employees()
    refactor_attendance()
    refactor_leave()
    refactor_shifts()
    refactor_payroll()
    refactor_inventory_products()
    print("Done")
