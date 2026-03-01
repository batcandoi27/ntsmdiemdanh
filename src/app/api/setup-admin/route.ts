import { NextResponse, NextRequest } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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
    // Kiểm tra xem tính năng có được bật không
    if (process.env.ADMIN_SETUP_ENABLED !== 'true') {
        return NextResponse.json(
            { error: 'API này đã bị vô hiệu hóa.' },
            { status: 403 }
        );
    }

    // Kiểm tra secret key
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const secret = process.env.ADMIN_SETUP_SECRET;

    if (!secret || key !== secret) {
        return NextResponse.json(
            { error: 'Unauthorized. Secret key không hợp lệ.' },
            { status: 401 }
        );
    }

    try {
        const email = 'admin@diemdanh.kgvh.io.vn';
        const password = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
        const role = 'admin';

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const appUser: AppUser = {
            uid,
            email,
            displayName: 'Admin Quản Trị Hệ Thống',
            role: role as any,
            assignedClassIds: [],
            permissions: { ...DEFAULT_PERMISSIONS['admin'] },
            editWindowMinutes: DEFAULT_EDIT_WINDOW['admin'],
            isActive: true,
            createdBy: 'system',
            createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', uid), appUser);

        return NextResponse.json({
            success: true,
            message: 'Admin account created. Hãy đặt ADMIN_SETUP_ENABLED=false trong .env ngay bây giờ!'
        });
    } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
            return NextResponse.json({ success: true, message: 'Admin account already exists.' });
        }
        console.error('[setup-admin] Error:', e.message);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
