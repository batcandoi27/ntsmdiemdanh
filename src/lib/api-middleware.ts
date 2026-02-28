/**
 * API Auth Middleware
 *
 * Verify Firebase Auth token from Authorization: Bearer <token>
 * or API key from X-API-Key header.
 * Rate limiting: 100 requests/minute/IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppUser } from '@/types/models';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';

// ============================================
// Rate Limiting (Simple in-memory)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }

    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
}

// ============================================
// Token Verification (Client-side approach)
// Note: For production, use Firebase Admin SDK server-side
// ============================================

/**
 * Extract user UID from Firebase ID token or API key.
 * Returns AppUser if authenticated, null otherwise.
 */
export async function authenticateRequest(req: NextRequest): Promise<{
    user: AppUser | null;
    error: string | null;
}> {
    // Rate limit check
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
        return { user: null, error: 'Quá nhiều request. Vui lòng thử lại sau.' };
    }

    // Try API Key first
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
        return await verifyApiKey(apiKey);
    }

    // Try Bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { user: null, error: 'Thiếu Authorization header hoặc X-API-Key.' };
    }

    const token = authHeader.substring(7);
    return await verifyBearerToken(token);
}

async function verifyApiKey(apiKey: string): Promise<{ user: AppUser | null; error: string | null }> {
    try {
        const keyDoc = await getDoc(doc(db, 'apiKeys', apiKey));
        if (!keyDoc.exists()) {
            return { user: null, error: 'API key không hợp lệ.' };
        }

        const keyData = keyDoc.data();
        if (!keyData.isActive) {
            return { user: null, error: 'API key đã bị vô hiệu hoá.' };
        }

        // Get the user who owns this key
        const userDoc = await getDoc(doc(db, 'users', keyData.userId));
        if (!userDoc.exists()) {
            return { user: null, error: 'Người dùng không tồn tại.' };
        }

        return { user: userDoc.data() as AppUser, error: null };
    } catch (err) {
        return { user: null, error: 'Lỗi xác thực API key.' };
    }
}

async function verifyBearerToken(token: string): Promise<{ user: AppUser | null; error: string | null }> {
    try {
        // In a real setup, use Firebase Admin SDK to verify token server-side.
        // For this client-side implementation, we trust the token format
        // and look up the user by a session token stored in Firestore.
        //
        // Production recommendation: Move to Next.js API route middleware
        // with firebase-admin verifyIdToken().
        return { user: null, error: 'Bearer token verification requires Firebase Admin SDK. Use API key instead.' };
    } catch (err) {
        return { user: null, error: 'Lỗi xác thực token.' };
    }
}

// ============================================
// Response Helpers
// ============================================

export function apiSuccess(data: unknown, status: number = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status: number = 400) {
    return NextResponse.json({ success: false, error: message }, { status });
}
