import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AppUser, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW } from '@/types/models';

export async function GET() {
    try {
        const email = 'admin@diemdanh.kgvh.io.vn';
        const password = '123456';
        const role = 'admin';

        console.log('Bắt đầu tạo tài khoản admin...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        console.log('Khởi tạo profile vào Firestore...');
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

        return NextResponse.json({ success: true, message: 'Admin account created: admin@diemdanh.kgvh.io.vn / 123456' });
    } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
            return NextResponse.json({ success: true, message: 'Admin account already exists.' });
        }
        console.error(e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
