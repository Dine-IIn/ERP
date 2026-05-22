class TimesheetEntry {
  final String id;
  final String username;
  final DateTime clockIn;
  final DateTime? clockOut;
  final String companyCode;

  TimesheetEntry({
    required this.id,
    required this.username,
    required this.clockIn,
    this.clockOut,
    required this.companyCode,
  });

  TimesheetEntry copyWith({
    DateTime? clockOut,
  }) {
    return TimesheetEntry(
      id: id,
      username: username,
      clockIn: clockIn,
      clockOut: clockOut ?? this.clockOut,
      companyCode: companyCode,
    );
  }

  double get totalHours {
    if (clockOut == null) return 0.0;
    return clockOut!.difference(clockIn).inSeconds / 3600.0;
  }
}

class Payslip {
  final String id;
  final String username;
  final String period; // e.g. "May 2026"
  final double totalHours;
  final double hourlyRate;
  final double bonus;
  final double deductions;
  final String status; // 'Pending', 'Approved', 'Paid'
  final DateTime date;
  final String companyCode;

  Payslip({
    required this.id,
    required this.username,
    required this.period,
    required this.totalHours,
    required this.hourlyRate,
    required this.bonus,
    required this.deductions,
    required this.status,
    required this.date,
    required this.companyCode,
  });

  double get grossPayout => (totalHours * hourlyRate) + bonus - deductions;

  Payslip copyWith({
    String? status,
  }) {
    return Payslip(
      id: id,
      username: username,
      period: period,
      totalHours: totalHours,
      hourlyRate: hourlyRate,
      bonus: bonus,
      deductions: deductions,
      status: status ?? this.status,
      date: date,
      companyCode: companyCode,
    );
  }
}
