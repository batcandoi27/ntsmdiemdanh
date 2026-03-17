
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function setAdminRole(email: string) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();

    // Create/Update user doc
    await setDoc(doc(db, 'schools', 'default', 'users', cleanEmail), {
        email: cleanEmail,
        role: 'admin',
        updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`Granted ADMIN to ${cleanEmail}`);
}
