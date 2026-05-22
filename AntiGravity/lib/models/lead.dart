class Lead {
  final String id;
  final String name;
  final String company;
  final double dealValue;
  final String source;
  final String status; // 'Cold', 'Warm', 'Hot', 'Won', 'Lost'
  final String companyCode;

  Lead({
    required this.id,
    required this.name,
    required this.company,
    required this.dealValue,
    required this.source,
    required this.status,
    required this.companyCode,
  });

  Lead copyWith({
    String? name,
    String? company,
    double? dealValue,
    String? source,
    String? status,
  }) {
    return Lead(
      id: id,
      name: name ?? this.name,
      company: company ?? this.company,
      dealValue: dealValue ?? this.dealValue,
      source: source ?? this.source,
      status: status ?? this.status,
      companyCode: companyCode,
    );
  }
}
