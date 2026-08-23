export interface VietQRBank {
  id: string;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo?: string;
  transferSupported?: boolean;
  lookupSupported?: boolean;
}

/**
 * Danh sách 50+ Ngân hàng và Ví điện tử hỗ trợ VietQR tại Việt Nam (Napas 247)
 */
export const VIETQR_BANKS: VietQRBank[] = [
  { id: 'MB', name: 'Ngân hàng TMCP Quân đội', code: 'MBBANK', bin: '970422', shortName: 'MB Bank' },
  { id: 'VCB', name: 'Ngân hàng Ngoại thương Việt Nam', code: 'VIETCOMBANK', bin: '970436', shortName: 'Vietcombank' },
  { id: 'TCB', name: 'Ngân hàng Kỹ thương Việt Nam', code: 'TECHCOMBANK', bin: '970407', shortName: 'Techcombank' },
  { id: 'BIDV', name: 'Ngân hàng Đầu tư và Phát triển Việt Nam', code: 'BIDV', bin: '970418', shortName: 'BIDV' },
  { id: 'VBA', name: 'Ngân hàng Nông nghiệp và PT Nông thôn VN', code: 'AGRIBANK', bin: '970405', shortName: 'Agribank' },
  { id: 'ACB', name: 'Ngân hàng Á Châu', code: 'ACB', bin: '970416', shortName: 'ACB' },
  { id: 'VPB', name: 'Ngân hàng Việt Nam Thịnh Vượng', code: 'VPBANK', bin: '970432', shortName: 'VPBank' },
  { id: 'TPB', name: 'Ngân hàng Tiên Phong', code: 'TPBANK', bin: '970423', shortName: 'TPBank' },
  { id: 'STB', name: 'Ngân hàng Sài Gòn Thương Tín', code: 'SACOMBANK', bin: '970403', shortName: 'Sacombank' },
  { id: 'HDB', name: 'Ngân hàng Phát triển TP.HCM', code: 'HDBANK', bin: '970437', shortName: 'HDBank' },
  { id: 'VIB', name: 'Ngân hàng Quốc tế', code: 'VIB', bin: '970441', shortName: 'VIB' },
  { id: 'SHB', name: 'Ngân hàng Sài Gòn - Hà Nội', code: 'SHB', bin: '970443', shortName: 'SHB' },
  { id: 'OCB', name: 'Ngân hàng Phương Đông', code: 'OCB', bin: '970448', shortName: 'OCB' },
  { id: 'MSB', name: 'Ngân hàng Hàng Hải', code: 'MSB', bin: '970426', shortName: 'MSB' },
  { id: 'LPB', name: 'Ngân hàng Bưu điện Liên Việt', code: 'LPBANK', bin: '970449', shortName: 'LPBank' },
  { id: 'SEAB', name: 'Ngân hàng Đông Nam Á', code: 'SEABANK', bin: '970440', shortName: 'SeABank' },
  { id: 'BAB', name: 'Ngân hàng Bắc Á', code: 'BACABANK', bin: '970409', shortName: 'Bac A Bank' },
  { id: 'BVB', name: 'Ngân hàng Bảo Việt', code: 'BAOVIETBANK', bin: '970438', shortName: 'BaoViet Bank' },
  { id: 'BVBank', name: 'Ngân hàng Bản Việt', code: 'BVBANK', bin: '970454', shortName: 'BVBank' },
  { id: 'NAB', name: 'Ngân hàng Nam Á', code: 'NAMABANK', bin: '970428', shortName: 'Nam A Bank' },
  { id: 'KLB', name: 'Ngân hàng Kiên Long', code: 'KIENLONGBANK', bin: '970452', shortName: 'Kienlongbank' },
  { id: 'PVCB', name: 'Ngân hàng Đại Chúng', code: 'PVCOMBANK', bin: '970412', shortName: 'PVcomBank' },
  { id: 'VBB', name: 'Ngân hàng Việt Nam Thương Tín', code: 'VIETBANK', bin: '970433', shortName: 'VietBank' },
  { id: 'PGB', name: 'Ngân hàng Thịnh Vượng và Phát Triển', code: 'PGBANK', bin: '970430', shortName: 'PGBank' },
  { id: 'SGB', name: 'Ngân hàng Sài Gòn Công Thương', code: 'SAIGONBANK', bin: '970400', shortName: 'SaigonBank' },
  { id: 'PBVN', name: 'Ngân hàng Public Bank Việt Nam', code: 'PUBLICBANK', bin: '970439', shortName: 'PublicBank' },
  { id: 'SHBVN', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', code: 'SHINHAN', bin: '970424', shortName: 'Shinhan Bank' },
  { id: 'WVN', name: 'Ngân hàng TNHH MTV Woori Việt Nam', code: 'WOORI', bin: '970457', shortName: 'Woori Bank' },
  { id: 'CAKE', name: 'Ngân hàng số Cake by VPBank', code: 'CAKE', bin: '546034', shortName: 'CAKE by VPBank' },
  { id: 'TIMO', name: 'Ngân hàng số Timo by BVBank', code: 'TIMO', bin: '963388', shortName: 'Timo' },
  { id: 'TNEX', name: 'Ngân hàng số TNEX by MSB', code: 'TNEX', bin: '970426', shortName: 'TNEX' },
  { id: 'VTLMONEY', name: 'Viettel Money', code: 'VIETTELMONEY', bin: '971005', shortName: 'Viettel Money' },
  { id: 'VNPTMONEY', name: 'VNPT Money', code: 'VNPTMONEY', bin: '971011', shortName: 'VNPT Money' }
];

/**
 * Sinh chuỗi nội dung chuyển khoản chuẩn hóa (Canonical format, không dấu, viết hoa, không khoảng trắng dư)
 * Định dạng: TBC_[CLASS]_[STUDENTCODE]_[COLID]_[PERIOD]
 */
export function generateCanonicalOrderInfo(
  className: string,
  studentCode: string,
  columnNameOrId: string,
  periodKey?: string
): string {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

  const cClass = clean(className);
  const cStudent = clean(studentCode);
  const cCol = clean(columnNameOrId).slice(0, 10);
  const cPeriod = periodKey ? clean(periodKey) : '';

  const parts = ['TBC', cClass, cStudent, cCol, cPeriod].filter(Boolean);
  return parts.join(' ');
}

/**
 * Kiểm tra tính hợp lệ của thông tin tài khoản ngân hàng
 */
export function validateBankInfo(bankId: string, accountNumber: string, accountName?: string): { valid: boolean; error?: string } {
  const cleanBank = (bankId || '').trim().toUpperCase();
  const cleanAcc = (accountNumber || '').trim().replace(/[^0-9a-zA-Z]/g, '');
  const cleanName = (accountName || '').trim();

  const isBankSupported = VIETQR_BANKS.some(b => b.id.toUpperCase() === cleanBank || b.code.toUpperCase() === cleanBank);
  if (!isBankSupported) {
    return { valid: false, error: `Mã ngân hàng "${bankId}" không nằm trong danh sách hỗ trợ Napas247.` };
  }

  if (cleanAcc.length < 4 || cleanAcc.length > 25) {
    return { valid: false, error: 'Số tài khoản phải từ 4 đến 25 ký tự số/chữ.' };
  }

  if (accountName !== undefined && cleanName.length < 2) {
    return { valid: false, error: 'Tên chủ tài khoản không hợp lệ.' };
  }

  return { valid: true };
}

/**
 * Sinh URL ảnh mã VietQR Napas 247
 */
export function buildVietQRImageUrl(options: {
  bankId: string;
  accountNumber: string;
  accountName: string;
  amount?: number;
  orderInfo?: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}): string {
  const { bankId, accountNumber, accountName, amount = 0, orderInfo = '', template = 'compact2' } = options;
  const cleanBank = encodeURIComponent(bankId.trim());
  const cleanAcc = encodeURIComponent(accountNumber.trim().replace(/[^0-9a-zA-Z]/g, ''));
  const cleanName = encodeURIComponent(accountName.trim().toUpperCase());
  const cleanInfo = encodeURIComponent(orderInfo.trim());

  let url = `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-${template}.png`;
  const params: string[] = [];

  if (amount > 0) params.push(`amount=${amount}`);
  if (cleanInfo) params.push(`addInfo=${cleanInfo}`);
  if (cleanName) params.push(`accountName=${cleanName}`);

  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  return url;
}
