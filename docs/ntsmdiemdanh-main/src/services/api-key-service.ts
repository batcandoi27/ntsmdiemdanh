import {
    doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
    collection, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppUser } from '@/types/models';

export interface ApiKeyRecord {
    id: string; // The active API key string
    name: string;
    userId: string;
    userName: string;
    createdAt: string;
    lastUsedAt?: string;
    isActive: boolean;
    permissions: string[];
}

/**
 * Generate a random API key string
 */
function generateKeyString(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk_live_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function createApiKey(
    user: AppUser,
    name: string,
    permissions: string[] = ['read']
): Promise<ApiKeyRecord> {
    const keyString = generateKeyString();

    const record: ApiKeyRecord = {
        id: keyString,
        name,
        userId: user.uid,
        userName: user.displayName || 'Vô danh',
        createdAt: new Date().toISOString(),
        isActive: true,
        permissions
    };

    await setDoc(doc(db, 'apiKeys', keyString), record);
    return record;
}

export async function getApiKeysByUser(userId: string): Promise<ApiKeyRecord[]> {
    const q = query(
        collection(db, 'apiKeys'),
        where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as ApiKeyRecord)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllApiKeys(): Promise<ApiKeyRecord[]> {
    const snap = await getDocs(collection(db, 'apiKeys'));
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as ApiKeyRecord)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function toggleApiKeyStatus(keyId: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'apiKeys', keyId), { isActive });
}

export async function deleteApiKey(keyId: string): Promise<void> {
    await deleteDoc(doc(db, 'apiKeys', keyId));
}
