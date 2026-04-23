/**
 * API Key Service - Supabase implementation (100%)
 */

import { supabase } from '@/lib/supabase';
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

interface ApiKeyRow {
    id: string;
    name: string;
    user_id: string;
    user_name: string;
    permissions: string[];
    is_active: boolean;
    last_used_at: string | null;
    created_at: string;
}

function rowToApiKey(row: ApiKeyRow): ApiKeyRecord {
    return {
        id: row.id,
        name: row.name,
        userId: row.user_id,
        userName: row.user_name,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at ?? undefined,
        isActive: row.is_active,
        permissions: row.permissions ?? ['read'],
    };
}

export async function createApiKey(
    user: AppUser,
    name: string,
    permissions: string[] = ['read']
): Promise<ApiKeyRecord> {
    const keyString = generateKeyString();

    const row = {
        id: keyString,
        name,
        user_id: user.uid,
        user_name: user.displayName || 'Vô danh',
        permissions,
        is_active: true,
        created_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('api_keys')
        .insert(row);

    if (error) {
        console.error('Error creating API key:', error);
        throw new Error('Lỗi tạo API key: ' + error.message);
    }

    return {
        id: keyString,
        name,
        userId: user.uid,
        userName: user.displayName || 'Vô danh',
        createdAt: row.created_at,
        isActive: true,
        permissions,
    };
}

export async function getApiKeysByUser(userId: string): Promise<ApiKeyRecord[]> {
    const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching API keys:', error);
        return [];
    }
    return (data as ApiKeyRow[]).map(rowToApiKey);
}

export async function getAllApiKeys(): Promise<ApiKeyRecord[]> {
    const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all API keys:', error);
        return [];
    }
    return (data as ApiKeyRow[]).map(rowToApiKey);
}

export async function toggleApiKeyStatus(keyId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', keyId);

    if (error) throw new Error('Lỗi cập nhật API key: ' + error.message);
}

export async function deleteApiKey(keyId: string): Promise<void> {
    const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

    if (error) throw new Error('Lỗi xóa API key: ' + error.message);
}

/**
 * Verify an API key (for middleware) - returns the key record if valid
 */
export async function verifyApiKey(apiKey: string): Promise<ApiKeyRecord | null> {
    const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', apiKey)
        .eq('is_active', true)
        .maybeSingle();

    if (error || !data) return null;

    // Update last_used_at
    await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey);

    return rowToApiKey(data as ApiKeyRow);
}
