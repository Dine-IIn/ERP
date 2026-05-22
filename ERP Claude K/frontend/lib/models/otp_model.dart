class OTPModel {
  final String token;
  final String verificationMethod; // 'email' or 'mobile'
  final DateTime expiresAt;

  OTPModel({
    required this.token,
    required this.verificationMethod,
    required this.expiresAt,
  });

  factory OTPModel.fromJson(Map<String, dynamic> json) {
    return OTPModel(
      token: json['token']?.toString() ?? '',
      verificationMethod: json['verification_method']?.toString() ?? 'email',
      expiresAt: json['expires_at'] != null 
          ? DateTime.parse(json['expires_at'].toString()) 
          : DateTime.now().add(const Duration(minutes: 5)),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'verification_method': verificationMethod,
      'expires_at': expiresAt.toIso8601String(),
    };
  }
}
