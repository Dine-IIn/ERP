/**
 * Country name → dial code lookup.
 * Used in Customer & Vendor master forms to auto-fill country code into contactNo.
 */
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  // Asia
  'India': '+91',
  'China': '+86',
  'Japan': '+81',
  'South Korea': '+82',
  'Pakistan': '+92',
  'Bangladesh': '+880',
  'Sri Lanka': '+94',
  'Nepal': '+977',
  'Bhutan': '+975',
  'Maldives': '+960',
  'Afghanistan': '+93',
  'Myanmar': '+95',
  'Thailand': '+66',
  'Vietnam': '+84',
  'Cambodia': '+855',
  'Laos': '+856',
  'Malaysia': '+60',
  'Singapore': '+65',
  'Indonesia': '+62',
  'Philippines': '+63',
  'Brunei': '+673',
  'Timor-Leste': '+670',
  'Mongolia': '+976',
  'Kazakhstan': '+7',
  'Uzbekistan': '+998',
  'Turkmenistan': '+993',
  'Tajikistan': '+992',
  'Kyrgyzstan': '+996',
  'Azerbaijan': '+994',
  'Armenia': '+374',
  'Georgia': '+995',
  'Iraq': '+964',
  'Iran': '+98',
  'Saudi Arabia': '+966',
  'UAE': '+971',
  'United Arab Emirates': '+971',
  'Qatar': '+974',
  'Kuwait': '+965',
  'Bahrain': '+973',
  'Oman': '+968',
  'Yemen': '+967',
  'Jordan': '+962',
  'Lebanon': '+961',
  'Syria': '+963',
  'Israel': '+972',
  'Palestine': '+970',
  'Turkey': '+90',
  'Cyprus': '+357',
  // Europe
  'United Kingdom': '+44',
  'UK': '+44',
  'Germany': '+49',
  'France': '+33',
  'Italy': '+39',
  'Spain': '+34',
  'Portugal': '+351',
  'Netherlands': '+31',
  'Belgium': '+32',
  'Switzerland': '+41',
  'Austria': '+43',
  'Sweden': '+46',
  'Norway': '+47',
  'Denmark': '+45',
  'Finland': '+358',
  'Poland': '+48',
  'Czech Republic': '+420',
  'Slovakia': '+421',
  'Hungary': '+36',
  'Romania': '+40',
  'Bulgaria': '+359',
  'Croatia': '+385',
  'Serbia': '+381',
  'Greece': '+30',
  'Ukraine': '+380',
  'Russia': '+7',
  'Ireland': '+353',
  'Iceland': '+354',
  'Luxembourg': '+352',
  'Malta': '+356',
  'Estonia': '+372',
  'Latvia': '+371',
  'Lithuania': '+370',
  'Belarus': '+375',
  'Moldova': '+373',
  'Albania': '+355',
  'North Macedonia': '+389',
  'Slovenia': '+386',
  'Bosnia': '+387',
  'Montenegro': '+382',
  // Americas
  'United States': '+1',
  'USA': '+1',
  'Canada': '+1',
  'Mexico': '+52',
  'Brazil': '+55',
  'Argentina': '+54',
  'Chile': '+56',
  'Colombia': '+57',
  'Peru': '+51',
  'Venezuela': '+58',
  'Ecuador': '+593',
  'Bolivia': '+591',
  'Paraguay': '+595',
  'Uruguay': '+598',
  'Panama': '+507',
  'Costa Rica': '+506',
  'Guatemala': '+502',
  'Honduras': '+504',
  'El Salvador': '+503',
  'Nicaragua': '+505',
  'Cuba': '+53',
  'Dominican Republic': '+1',
  'Jamaica': '+1',
  'Haiti': '+509',
  // Africa
  'South Africa': '+27',
  'Nigeria': '+234',
  'Kenya': '+254',
  'Ethiopia': '+251',
  'Ghana': '+233',
  'Tanzania': '+255',
  'Uganda': '+256',
  'Cameroon': '+237',
  'Ivory Coast': '+225',
  "Côte d'Ivoire": '+225',
  'Senegal': '+221',
  'Mozambique': '+258',
  'Madagascar': '+261',
  'Zambia': '+260',
  'Zimbabwe': '+263',
  'Egypt': '+20',
  'Morocco': '+212',
  'Algeria': '+213',
  'Tunisia': '+216',
  'Libya': '+218',
  'Sudan': '+249',
  'Somalia': '+252',
  'Angola': '+244',
  'Namibia': '+264',
  'Botswana': '+267',
  'Rwanda': '+250',
  'Benin': '+229',
  'Togo': '+228',
  'Mali': '+223',
  'Mauritius': '+230',
  // Oceania
  'Australia': '+61',
  'New Zealand': '+64',
  'Fiji': '+679',
  'Papua New Guinea': '+675',
};

/**
 * Given a country name (case-insensitive), return the dial code or null.
 */
export function getDialCodeForCountry(country: string): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  // Try exact match first
  if (COUNTRY_DIAL_CODES[trimmed]) return COUNTRY_DIAL_CODES[trimmed];
  // Try case-insensitive match
  const lower = trimmed.toLowerCase();
  const key = Object.keys(COUNTRY_DIAL_CODES).find(k => k.toLowerCase() === lower);
  return key ? COUNTRY_DIAL_CODES[key] : null;
}

/**
 * Given an existing phone number and a dial code,
 * prefix the dial code only if the number doesn't already have one.
 */
export function prefixDialCode(phone: string, dialCode: string): string {
  const clean = phone.trim();
  if (!clean) return dialCode;
  if (clean.startsWith('+')) return clean; // already has a prefix
  if (clean.startsWith('00')) return '+' + clean.slice(2); // 0091... → +91...
  return dialCode + clean;
}
