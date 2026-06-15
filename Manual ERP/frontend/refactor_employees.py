import re

with open('src/components/hrms/Employees.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("apiClient.patch(`/api/hrms/employees/\`, payload)", "apiClient.patch(`/api/hrms/employees/${id}`, payload)")
code = code.replace("apiClient.patch(`/api/hrms/employees/\, payload)", "apiClient.patch(`/api/hrms/employees/${id}`, payload)")
code = code.replace("apiClient.patch(`/api/hrms/employees/, payload)", "apiClient.patch(`/api/hrms/employees/${id}`, payload)")
code = code.replace("apiClient.patch(`/api/hrms/employees/`, payload)", "apiClient.patch(`/api/hrms/employees/${id}`, payload)")

with open('src/components/hrms/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
