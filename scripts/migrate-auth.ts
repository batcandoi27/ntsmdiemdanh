import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 1. Cấu hình Firebase Admin
const serviceAccount = JSON.parse(require('fs').readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const auth = admin.auth();
const firestore = admin.firestore();

// 2. Cấu hình Supabase (Service Role Key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateAuthUsers() {
    console.log('🔐 Starting Auth Migration Firebase -> Supabase...');

    try {
        // == Task 1: Export Users từ Firebase ==
        const listUsers = await auth.listUsers();
        console.log(`Found ${listUsers.users.length} users in Firebase.`);

        // == Task 2: Lấy thông tin Role từ Firestore (Collection: users) ==
        const usersSnap = await firestore.collectionGroup('users').get();
        const roleMap = new Map();
        usersSnap.forEach(doc => {
            const d = doc.data();
            roleMap.set(d.email, d.role);
        });

        // Bổ sung Admin mặc định theo yêu cầu
        roleMap.set('thcstbc@gmail.com', 'admin');

        for (const user of listUsers.users) {
            if (!user.email) continue;

            console.log(`Processing user: ${user.email}...`);

            // == Task 3: Tạo User trong Supabase Auth ==
            // Lưu ý: Password không migrate được, nên dùng mật khẩu tạm hoặc gửi reset email
            const { data: sbUser, error: sbError } = await supabase.auth.admin.createUser({
                email: user.email,
                email_confirm: true,
                user_metadata: { full_name: user.displayName || user.email },
                password: Math.random().toString(36).slice(-12) // Mật khẩu ngẫu nhiên
            });

            if (sbError) {
                if (sbError.message.includes('already exists')) {
                    console.log(`User ${user.email} already exists in Supabase.`);
                } else {
                    console.warn(`Error creating user ${user.email}:`, sbError.message);
                    continue;
                }
            }

            // == Task 4: Cập nhật Profile & Role trong bảng public.profiles ==
            const targetId = sbUser.user?.id || (await supabase.from('profiles').select('id').eq('email', user.email).single()).data?.id;
            
            if (targetId) {
                const role = roleMap.get(user.email) || 'teacher';
                const { error: pError } = await supabase.from('profiles').upsert({
                    id: targetId,
                    email: user.email,
                    full_name: user.displayName || user.email,
                    role: role,
                    is_active: true
                });
                if (pError) console.error(`Error updating profile for ${user.email}:`, pError);
            }

            // == Task 5: (Optional) Gửi email reset password ==
            // await supabase.auth.admin.generateLink({ type: 'recovery', email: user.email });
        }

        console.log('✅ Auth Migration Finished!');

    } catch (err) {
        console.error('❌ Auth Migration Failed:', err);
    }
}

migrateAuthUsers();
