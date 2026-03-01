import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API Check DB - Đã bị vô hiệu hóa vì lý do bảo mật.
 * 
 * API này trước đó trả về danh sách lớp và học sinh mà không yêu cầu xác thực.
 * Đã lộ sơ đồ tổ chức trường học ra internet (Audit Critical #2).
 * 
 * Nếu cần kiểm tra DB, hãy dùng Firebase Console trực tiếp.
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'API này đã bị vô hiệu hóa vì lý do bảo mật. Sử dụng Firebase Console để kiểm tra dữ liệu.'
    }, { status: 403 });
}
