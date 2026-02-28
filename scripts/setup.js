#!/usr/bin/env node

/**
 * Setup Script: Khởi tạo app cho trường mới
 *
 * Chạy: node scripts/setup.js
 *
 * Thực hiện:
 * 1. Tạo admin account đầu tiên (Firebase Auth + Firestore)
 * 2. Tạo settings/app document
 * 3. Hướng dẫn deploy Firestore rules
 *
 * Yêu cầu: .env.local đã có Firebase config
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

async function main() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏫 SETUP: Khởi tạo App Điểm Danh v3.0');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Kiểm tra env
    const requiredEnvs = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ];

    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });

    const missing = requiredEnvs.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error('❌ Thiếu biến môi trường trong .env.local:');
        missing.forEach((key) => console.error(`   - ${key}`));
        console.error('');
        console.error('Vui lòng tạo file .env.local từ .env.example');
        process.exit(1);
    }

    console.log('✅ Firebase config found in .env.local');
    console.log('');

    // Thu thập thông tin
    const schoolName = await ask('📝 Tên trường (VD: THCS Nguyễn Trãi): ');
    const schoolCode = await ask('📝 Mã trường (VD: THCS_NT): ');
    const activeYear = await ask('📝 Năm học (VD: 2025-2026): ');
    const adminEmail = await ask('📝 Email admin đầu tiên: ');
    const adminPassword = await ask('📝 Password admin: ');
    const adminName = await ask('📝 Tên hiển thị admin: ');

    console.log('');
    console.log('📋 Thông tin setup:');
    console.log(`   Trường: ${schoolName} (${schoolCode})`);
    console.log(`   Năm học: ${activeYear}`);
    console.log(`   Admin: ${adminName} <${adminEmail}>`);
    console.log('');

    const confirm = await ask('Tiếp tục? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
        console.log('⏹️ Đã huỷ.');
        process.exit(0);
    }

    console.log('');
    console.log('🔧 Đang khởi tạo...');

    // Dynamic import Firebase
    const { initializeApp } = require('firebase/app');
    const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
    const { getFirestore, doc, setDoc } = require('firebase/firestore');

    const app = initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });

    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
        // 1. Tạo Admin Auth
        console.log('   1/3 Tạo admin account...');
        const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        const uid = userCred.user.uid;

        // 2. Tạo Admin Profile
        console.log('   2/3 Tạo admin profile...');
        await setDoc(doc(db, 'users', uid), {
            uid: uid,
            email: adminEmail,
            displayName: adminName,
            role: 'admin',
            assignedClassIds: [],
            permissions: {
                canEditAttendance: true,
                canEditStudentStatus: true,
                canCreateAccounts: true,
                canViewAllClasses: true,
                canExportData: true,
                canManageTimetable: true,
                canAccessAPI: true,
            },
            editWindowMinutes: -1,
            isActive: true,
            createdAt: new Date().toISOString(),
        });

        // 3. Tạo Settings
        console.log('   3/3 Tạo cấu hình trường...');
        await setDoc(doc(db, 'settings', 'app'), {
            activeYear: activeYear,
            schoolName: schoolName,
            schoolCode: schoolCode,
            periodsPerSession: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ SETUP HOÀN TẤT!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log(`🏫 Trường: ${schoolName}`);
        console.log(`📅 Năm học: ${activeYear}`);
        console.log(`👑 Admin: ${adminName} <${adminEmail}>`);
        console.log('');
        console.log('📋 Bước tiếp theo:');
        console.log('   1. Deploy Firestore Rules:');
        console.log('      firebase deploy --only firestore:rules');
        console.log('');
        console.log('   2. Chạy app:');
        console.log('      npm run dev');
        console.log('');
        console.log('   3. Đăng nhập bằng email admin vừa tạo');
        console.log('');
    } catch (error) {
        console.error('');
        console.error('❌ Lỗi setup:', error.message);
        if (error.code === 'auth/email-already-in-use') {
            console.error('   Email này đã được sử dụng. Thử email khác.');
        }
        process.exit(1);
    }

    rl.close();
    process.exit(0);
}

main();
