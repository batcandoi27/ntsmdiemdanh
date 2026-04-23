/**
 * API Auth Middleware
 *
 * Verify Supabase Auth token from Authorization: Bearer <token>
 * or API key from X-API-Key header.
 * Rate limiting: 100 requests/minute/IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppUser } from '@/types/models';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
// Token Verification
// ============================================

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
        if (!supabaseAdmin) return { user: null, error: 'Supabase Admin is not available.' };
        
        // Use Supabase Admin to check apiKeys table
        const { data: keyData, error: keyError } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('id', apiKey)
            .maybeSingle();

        if (keyError || !keyData) {
            return { user: null, error: 'API key không hợp lệ.' };
        }

        if (!keyData.is_active) {
            return { user: null, error: 'API key đã bị vô hiệu hoá.' };
        }

        // Get the user who owns this key
        const { data: userDoc, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', keyData.user_id)
            .maybeSingle();

        if (userError || !userDoc) {
            return { user: null, error: 'Người dùng không tồn tại.' };
        }

        const appUser: AppUser = {
            uid: userDoc.id,
            displayName: userDoc.full_name,
            email: userDoc.email,
            role: userDoc.role,
            isActive: userDoc.is_active,
            permissions: userDoc.permissions || {},
            assignedClassIds: [], // Can fetch if needed
            editWindowMinutes: userDoc.role === 'admin' ? -1 : 1440,
            createdAt: userDoc.created_at || new Date().toISOString()
        };

        return { user: appUser, error: null };
    } catch (err) {
        return { user: null, error: 'Lỗi xác thực API key.' };
    }
}

async function verifyBearerToken(token: string): Promise<{ user: AppUser | null; error: string | null }> {
    try {
        if (!supabaseAdmin) return { user: null, error: 'Supabase Admin is not available.' };
        
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data.user) {
            return { user: null, error: 'Token không hợp lệ hoặc đã hết hạn.' };
        }

        // Fetch user profile
        const { data: userDoc } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
            
        if (!userDoc) {
             return { user: null, error: 'Người dùng không tồn tại.' };
        }

        const appUser: AppUser = {
            uid: userDoc.id,
            displayName: userDoc.full_name,
            email: userDoc.email || data.user.email,
            role: userDoc.role,
            isActive: userDoc.is_active,
            permissions: userDoc.permissions || {},
            assignedClassIds: [],
            editWindowMinutes: userDoc.role === 'admin' ? -1 : 1440,
            createdAt: userDoc.created_at || new Date().toISOString()
        };
        
        return { user: appUser, error: null };
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
