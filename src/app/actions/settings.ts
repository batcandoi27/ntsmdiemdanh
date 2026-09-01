'use server';

import { db } from '@/services/db';
import { revalidatePath } from 'next/cache';
import { AppSettings, Class, AttendanceRecord } from '@/types/models';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUsersPaginated } from '@/services/user-service';

export async function generateMockData(startDate: string, endDate: string, classIds: string[]) {
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

export async function saveRoleCodes(roleCodes: Record<string, string>, updaterRole: string) {
    if (updaterRole !== 'admin') {
        return { success: false, message: 'Chỉ Admin mới có quyền cập nhật mã phân quyền.' };
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
    if (updaterRole && updaterRole !== 'admin' && updaterRole !== 'principal') {
        return { success: false, message: 'Chỉ Quản trị viên (Admin) hoặc Ban Giám Hiệu mới có quyền bật/tắt tính năng.' };
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



export async function loadUsersPaginated(pageSize: number, lastUid?: string) {
    try {
        const result = await getUsersPaginated(pageSize, lastUid);
        return { success: true, ...result };
    } catch (error) {
        console.error('Error loading users:', error);
        return { success: false, users: [], hasMore: false, message: 'Lỗi tải danh sách người dùng.' };
    }
}

// --- App Settings Actions ---

export async function fetchAppSettings() {
    try {
        const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'app_settings').single();
        if (data) {
            return { success: true, settings: data.value as AppSettings };
        }
        return { success: false, message: 'Không tìm thấy cấu hình.' };
    } catch (error) {
        console.error('Error fetching app settings:', error);
        return { success: false, message: 'Lỗi khi tải cấu hình hệ thống.' };
    }
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
    try {
        const { data: existing } = await supabaseAdmin.from('settings').select('value').eq('key', 'app_settings').single();
        const newValue = { ...(existing?.value || {}), ...settings, updatedAt: new Date().toISOString() };
        await supabaseAdmin.from('settings').upsert({ key: 'app_settings', value: newValue });
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
        const classes = await db.getClasses();
        const settingsRes = await fetchAppSettings();
        const activeYear = settingsRes.success && settingsRes.settings?.activeYear ? settingsRes.settings.activeYear : '2024-2025';
        
        console.log(`[getClassesList] Supabase success: Found ${classes.length} classes`);
        return { success: true, classes, activeYear, storagePath: 'supabase/classes' };
    } catch (error: any) {
        console.error(`[getClassesList] !!! ERROR !!!`, error);
        return { success: false, message: `Lỗi khi tải danh sách lớp: ${error.message || 'Unknown error'}` };
    }
}

export async function updateManualClassSizes(year: string, updates: { id: string, manualStudentCount?: number, adjustmentCount?: number }[]) {
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
