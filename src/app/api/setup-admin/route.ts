import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { AppUser, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW } from '@/types/models';

/**
 * API Setup Admin - BẢO VỆ bằng Secret Key
 *
 * Chỉ hoạt động khi:
 * 1. Biến môi trường ADMIN_SETUP_ENABLED=true
 * 2. Gửi kèm ?key=<ADMIN_SETUP_SECRET>
 *
 * Sau khi tạo admin xong, đặt ADMIN_SETUP_ENABLED=false trong .env
 */
export async function GET(request: NextRequest) {
    if (process.env.ADMIN_SETUP_ENABLED !== 'true') {
        return NextResponse.json({ error: 'API này đã bị vô hiệu hóa.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const secret = process.env.ADMIN_SETUP_SECRET;

    if (!secret || key !== secret) {
        return NextResponse.json({ error: 'Unauthorized. Secret key không hợp lệ.' }, { status: 401 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase Admin is not configured.' }, { status: 500 });
    }

    try {
        const email = 'admin@diemdanh.kgvh.io.vn';
        const password = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
        
        const { data: userRecord, error: createError } = await supabaseAdmin.auth.admin.createUser({
             email, 
             password: password, 
             user_metadata: { full_name: 'Admin Quản Trị Hệ Thống', role: 'admin' }, 
             email_confirm: true
        });

        if (createError) {
             if (createError.message.includes('already registered')) {
                 return NextResponse.json({ success: true, message: 'Admin account already exists.' });
             }
             throw createError;
        }

        const uid = userRecord.user.id;

        await supabaseAdmin.from('profiles').update({
             role: 'admin',
             full_name: 'Admin Quản Trị Hệ Thống',
             permissions: DEFAULT_PERMISSIONS['admin'],
             edit_window_minutes: DEFAULT_EDIT_WINDOW['admin'],
             is_active: true
        }).eq('id', uid);

        return NextResponse.json({
            success: true,
            message: 'Admin account created. Hãy đặt ADMIN_SETUP_ENABLED=false trong .env ngay bây giờ!'
        });
    } catch (e: any) {
        console.error('[setup-admin] Error:', e.message);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
