'use server';

import { db } from '@/services/db';
import { revalidatePath } from 'next/cache';
import { AppSettings, Class, AttendanceRecord } from '@/types/models';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, getAppUser } from '@/lib/supabase-server';
import { getUsersPaginated } from '@/services/user-service';

/**
 * Kiểm tra quyền Admin từ Server Session (Cookies)
 */
async function assertAdminOnlyCaller(): Promise<{ isAuthorized: boolean; error?: string }> {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
        return { isAuthorized: false, error: 'Yêu cầu đăng nhập trước khi thực hiện thao tác quản trị.' };
    }
    const caller = await getAppUser(sessionUser.id, sessionUser.email);
    if (!caller || caller.role !== 'admin') {
        return { isAuthorized: false, error: 'Truy cập bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.' };
    }
    return { isAuthorized: true };
}

/**
 * Kiểm tra quyền Admin hoặc Ban Giám Hiệu từ Server Session
 */
async function assertAdminOrPrincipalCaller(): Promise<{ isAuthorized: boolean; role?: string; error?: string }> {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
        return { isAuthorized: false, error: 'Yêu cầu đăng nhập trước khi thực hiện thao tác.' };
    }
    const caller = await getAppUser(sessionUser.id, sessionUser.email);
    if (!caller || (caller.role !== 'admin' && caller.role !== 'principal')) {
        return { isAuthorized: false, error: 'Truy cập bị từ chối: Chỉ Quản trị viên (Admin) hoặc Ban Giám Hiệu mới có quyền này.' };
    }
    return { isAuthorized: true, role: caller.role };
}

export async function generateMockData(startDate: string, endDate: string, classIds: string[]) {
    const authCheck = await assertAdminOnlyCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }

    try {
        await db.mockGenerateAttendance(startDate, endDate, classIds);
        revalidatePath('/reports');
        return { success: true, message: 'Đã tạo dữ liệu giả lập thành công!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Lỗi khi tạo dữ liệu giả lập.' };
    }
}

export async function clearAttendance(startDate?: string, endDate?: string, classIds?: string[]) {
    const authCheck = await assertAdminOnlyCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }

    try {
        await db.clearAttendanceData(startDate, endDate, classIds);
        revalidatePath('/reports');
        revalidatePath('/attendance');
        return { success: true, message: 'Đã xóa dữ liệu điểm danh thành công!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Lỗi khi xóa dữ liệu.' };
    }
}


export async function getRoleCodes() {
    try {
        const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'role_codes').single();
        return { success: true, roleCodes: data?.value || {} };
    } catch (error) {
        console.error('Error fetching role codes:', error);
        return { success: false, roleCodes: {} };
    }
}

export async function saveRoleCodes(roleCodes: Record<string, string>, updaterRole?: string) {
    const authCheck = await assertAdminOnlyCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }
    try {
        await supabaseAdmin.from('settings').upsert({ key: 'role_codes', value: roleCodes });
        return { success: true, message: 'Đã lưu cấu hình Mã Phân Quyền thành công.' };
    } catch (error) {
        console.error('Error saving role codes:', error);
        return { success: false, message: 'Lỗi khi lưu mã phân quyền. Vui lòng thử lại.' };
    }
}

// --- Feature Flags Actions ---

export async function getFeatureFlags() {

    try {
        const { data, error } = await supabaseAdmin.from('settings').select('value').eq('key', 'feature_flags').maybeSingle();
        if (error) throw error;
        return { success: true, flags: data?.value || {} };
    } catch (error) {
        console.error('Error fetching feature flags:', error);
        return { success: false, flags: {}, message: 'Lỗi khi tải cấu hình tính năng.' };
    }
}

export async function saveFeatureFlags(flags: Record<string, boolean>, updaterRole?: string) {
    const authCheck = await assertAdminOrPrincipalCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }
    try {
        const { error } = await supabaseAdmin.from('settings').upsert(
            { key: 'feature_flags', value: flags },
            { onConflict: 'key' }
        );
        if (error) throw error;
        try {
            revalidatePath('/settings');
        } catch (_) {}
        return { success: true, message: 'Đã lưu cấu hình tính năng thành công!' };
    } catch (error: any) {
        console.error('Error saving feature flags:', error);
        return { success: false, message: `Lỗi khi lưu tính năng: ${error.message || 'Lỗi cơ sở dữ liệu'}` };
    }
}



export async function getDriveBackupConfig() {
    try {
        const { data, error } = await supabaseAdmin.from('settings').select('value').eq('key', 'google_drive_backup_config').maybeSingle();
        if (error) throw error;
        return {
            success: true,
            config: data?.value || {
                enabled: false,
                gas_webhook_url: '',
                secret_token: 'TBC_DRIVE_BACKUP_2026',
                backup_frequency: 'daily',
                last_backup_at: null,
                last_status: 'IDLE'
            }
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function saveDriveBackupConfig(config: Record<string, any>, updaterRole?: string) {
    const authCheck = await assertAdminOrPrincipalCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }
    try {
        const { error } = await supabaseAdmin.from('settings').upsert(
            { key: 'google_drive_backup_config', value: config },
            { onConflict: 'key' }
        );
        if (error) throw error;
        try { revalidatePath('/settings'); } catch (_) {}
        return { success: true, message: 'Đã lưu cấu hình sao lưu Google Drive thành công!' };
    } catch (error: any) {
        return { success: false, message: `Lỗi khi lưu cấu hình: ${error.message}` };
    }
}

export async function triggerDriveBackupNow(gasWebhookUrl: string, secretToken: string) {
    const authCheck = await assertAdminOrPrincipalCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }
    try {
        if (!gasWebhookUrl) {
            return { success: false, message: 'Vui lòng cung cấp URL Google Apps Script Webhook.' };
        }

        // SSRF Guard (Rule 5 & GS-8): Chỉ cho phép giao thức HTTPS, port 443 và domain chính thức của Google Apps Script
        try {
            const parsedUrl = new URL(gasWebhookUrl);
            const isGoogleHost = parsedUrl.hostname === 'script.google.com' || parsedUrl.hostname === 'script.googleusercontent.com';
            const isStandardHttpsPort = parsedUrl.port === '' || parsedUrl.port === '443';
            if (parsedUrl.protocol !== 'https:' || !isGoogleHost || !isStandardHttpsPort) {
                return { success: false, message: 'URL bị từ chối: Vì lý do an toàn bảo mật (Anti-SSRF), hệ thống chỉ chấp nhận Webhook chính thức từ Google Apps Script qua HTTPS port 443 (https://script.google.com/macros/s/...).' };
            }
        } catch (_) {
            return { success: false, message: 'Định dạng URL Webhook không hợp lệ.' };
        }

        // Gather database summary
        const { data: students, count: studentCount } = await supabaseAdmin.from('students').select('id', { count: 'exact' });
        const { data: classes, count: classCount } = await supabaseAdmin.from('classes').select('id', { count: 'exact' });
        const { data: attendance, count: attCount } = await supabaseAdmin.from('attendance').select('id', { count: 'exact' });

        const payload = {
            action: 'BACKUP_DATABASE',
            secret_token: secretToken,
            timestamp: new Date().toISOString(),
            school_name: 'THCS TRẦN BỘI CƠ',
            summary: {
                total_students: studentCount || students?.length || 0,
                total_classes: classCount || classes?.length || 0,
                total_attendance_records: attCount || attendance?.length || 0
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s strict timeout

        const res = await fetch(gasWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'error', // Chống đòn tấn công Redirect SSRF sang mạng nội bộ
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await res.json().catch(() => ({ ok: res.ok }));

        // Update last backup timestamp
        await supabaseAdmin.from('settings').upsert({
            key: 'google_drive_backup_config',
            value: {
                gas_webhook_url: gasWebhookUrl,
                secret_token: secretToken,
                enabled: true,
                last_backup_at: new Date().toISOString(),
                last_status: res.ok ? 'SUCCESS' : 'FAILED'
            }
        }, { onConflict: 'key' });

        return {
            success: true,
            message: `Đã kích hoạt sao lưu lên Google Drive thành công! (${payload.summary.total_students} học sinh, ${payload.summary.total_attendance_records} điểm danh).`,
            details: result
        };
    } catch (error: any) {
        return { success: false, message: `Lỗi kết nối Google Apps Script: ${error.message}` };
    }
}


// --- App Settings Actions ---

let cachedSettings: { settings: AppSettings; expiry: number } | null = null;
const SETTINGS_CACHE_TTL = 60 * 1000; // 60s

export async function fetchAppSettings() {
    const now = Date.now();
    if (cachedSettings && now < cachedSettings.expiry) {
        return { success: true, settings: cachedSettings.settings };
    }
    try {
        const client = supabaseAdmin || supabase;
        const { data } = await client.from('settings').select('value').eq('key', 'app_settings').single();
        if (data) {
            const settings = data.value as AppSettings;
            cachedSettings = { settings, expiry: now + SETTINGS_CACHE_TTL };
            return { success: true, settings };
        }
        return { success: false, message: 'Không tìm thấy cấu hình.' };
    } catch (error) {
        console.error('Error fetching app settings:', error);
        return { success: false, message: 'Lỗi khi tải cấu hình hệ thống.' };
    }
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
    const authCheck = await assertAdminOrPrincipalCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }
    try {
        const { data: existing } = await supabaseAdmin.from('settings').select('value').eq('key', 'app_settings').single();
        const newValue = { ...(existing?.value || {}), ...settings, updatedAt: new Date().toISOString() };
        await supabaseAdmin.from('settings').upsert({ key: 'app_settings', value: newValue });
        cachedSettings = null; // Invalidate cache immediately on update
        revalidatePath('/settings');
        return { success: true, message: 'Đã cập nhật cấu hình hệ thống.' };
    } catch (error) {
        console.error('Error updating app settings:', error);
        return { success: false, message: 'Lỗi khi lưu cấu hình.' };
    }
}

export async function getClassesList() {
    console.log(`[getClassesList] --- START FETCH ---`);
    try {
        const [classes, settingsRes] = await Promise.all([
            db.getClasses(),
            fetchAppSettings()
        ]);
        const activeYear = settingsRes.success && settingsRes.settings?.activeYear ? settingsRes.settings.activeYear : '2024-2025';
        
        console.log(`[getClassesList] Supabase success: Found ${classes.length} classes`);
        return { success: true, classes, activeYear, storagePath: 'supabase/classes' };
    } catch (error: any) {
        console.error(`[getClassesList] !!! ERROR !!!`, error);
        return { success: false, message: `Lỗi khi tải danh sách lớp: ${error.message || 'Unknown error'}` };
    }
}

export async function updateManualClassSizes(year: string, updates: { id: string, manualStudentCount?: number, adjustmentCount?: number }[]) {
    const authCheck = await assertAdminOrPrincipalCaller();
    if (!authCheck.isAuthorized) {
        return { success: false, message: authCheck.error };
    }
    try {
        console.log(`[updateManualClassSizes] START - Year: ${year}, Updates: ${updates.length}`);
        
        // Sử dụng supabaseAdmin để có quyền bypass RLS khi cập nhật bảng classes
        for (const update of updates) {
            const up: any = {};
            if (update.adjustmentCount !== undefined) up.adjustment_count = update.adjustmentCount;
            if (update.manualStudentCount !== undefined) up.manual_student_count = update.manualStudentCount;
            
            if (Object.keys(up).length > 0) {
                console.log(`[updateManualClassSizes] Admin Updating class ${update.id}:`, up);
                const { error } = await supabaseAdmin.from('classes').update(up).eq('id', update.id);
                if (error) {
                    console.error(`[updateManualClassSizes] Admin Update Error:`, error);
                    return { success: false, message: `Lỗi Admin: ${error.message}` };
                }
            }
        }
        // Invalidate cache
        const { invalidateCachePrefix } = require("@/services/cache-service");
        invalidateCachePrefix('supabase_classes');
        
        console.log(`[updateManualClassSizes] SUCCESS`);
        revalidatePath('/settings');
        return { success: true, message: `Đã cập nhật sĩ số cho ${updates.length} lớp.` };
    } catch (error: any) {
        console.error('[updateManualClassSizes] ERROR:', error);
        return { success: false, message: `Lỗi khi cập nhật sĩ số lớp: ${error.message || 'Unknown error'}` };
    }
}

