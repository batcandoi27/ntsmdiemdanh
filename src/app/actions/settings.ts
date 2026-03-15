'use server';

import { db } from '@/services/db';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { AppSettings, Class, AttendanceRecord } from '@/types/models';
import { SCHOOL_ID } from '@/config/constants';
 // Keep this import for now, as the instruction implies it's no longer needed but doesn't explicitly remove it. The change is about removing the *call* to initAdmin().

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

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function getRoleCodes() {
    try {
        if (isSupabase) {
            const { data } = await supabase.from('settings').select('value').eq('key', 'role_codes').single();
            return { success: true, roleCodes: data?.value || {} };
        } else {
            const docSnap = await adminDb.doc('settings/app_config').get();
            if (docSnap.exists) {
                return { success: true, roleCodes: docSnap.data()?.roleCodes || {} };
            }
            return { success: true, roleCodes: {} };
        }
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
        if (isSupabase) {
            await supabase.from('settings').upsert({ key: 'role_codes', value: roleCodes });
        } else {
            await adminDb.doc('settings/app_config').set({ roleCodes }, { merge: true });
        }
        return { success: true, message: 'Đã lưu cấu hình Mã Phân Quyền thành công.' };
    } catch (error) {
        console.error('Error saving role codes:', error);
        return { success: false, message: 'Lỗi khi lưu mã phân quyền. Vui lòng thử lại.' };
    }
}

import { getUsersPaginated } from '@/services/user-service';

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
        if (isSupabase) {
            const { data } = await supabase.from('settings').select('value').eq('key', 'app_settings').single();
            if (data) {
                return { success: true, settings: data.value as AppSettings };
            }
        } else {
            const docSnap = await adminDb.doc('settings/app').get();
            if (docSnap.exists) {
                return { success: true, settings: docSnap.data() as AppSettings };
            }
        }
        return { success: false, message: 'Không tìm thấy cấu hình.' };
    } catch (error) {
        console.error('Error fetching app settings:', error);
        return { success: false, message: 'Lỗi khi tải cấu hình hệ thống.' };
    }
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
    try {
        if (isSupabase) {
             const { data: existing } = await supabase.from('settings').select('value').eq('key', 'app_settings').single();
             const newValue = { ...(existing?.value || {}), ...settings, updatedAt: new Date().toISOString() };
             await supabase.from('settings').upsert({ key: 'app_settings', value: newValue });
        } else {
            await adminDb.doc('settings/app').set({
                ...settings,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }
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
        if (isSupabase) {
            // Supabase implementation using db adapter for better cache/logic reuse
            const classes = await db.getClasses();
            const settingsRes = await fetchAppSettings();
            const activeYear = settingsRes.success ? settingsRes.settings.activeYear : '2024-2025';
            
            console.log(`[getClassesList] Supabase success: Found ${classes.length} classes`);
            return { success: true, classes, activeYear, storagePath: 'supabase/classes' };
        } else {
            // Firebase implementation (Legacy)
            console.log(`[getClassesList] SCHOOL_ID configuration: "${SCHOOL_ID}"`);
            const settingsSnap = await adminDb.doc('settings/app').get();
            const activeYear = settingsSnap.exists ? (settingsSnap.data()?.activeYear || '2025-2026') : '2025-2026';
            
            let path = `years/${activeYear}/classes`;
            let classesSnap = await adminDb.collection(path).get();
            
            if (classesSnap.empty) {
                const v2Path = `schools/${SCHOOL_ID}/years/${activeYear}/classes`;
                const v2Snap = await adminDb.collection(v2Path).get();
                if (!v2Snap.empty) {
                    path = v2Path;
                    classesSnap = v2Snap;
                }
            }

            const classes = classesSnap.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            } as Class));
            
            classes.sort((a, b) => {
                if (a.grade !== b.grade) return (Number(a.grade) || 0) - (Number(b.grade) || 0);
                return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
            });

            return { success: true, classes, activeYear, storagePath: path };
        }
    } catch (error: any) {
        console.error(`[getClassesList] !!! ERROR !!!`, error);
        return { success: false, message: `Lỗi khi tải danh sách lớp: ${error.message || 'Unknown error'}` };
    }
}

export async function updateManualClassSizes(year: string, updates: { id: string, manualStudentCount: number }[], storagePath?: string) {
    try {
        console.log(`[updateManualClassSizes] START - Year: ${year}, Updates: ${updates.length}`);
        await db.updateManualClassSizes(year, updates);
        console.log(`[updateManualClassSizes] SUCCESS`);
        revalidatePath('/settings');
        return { success: true, message: `Đã cập nhật sĩ số cho ${updates.length} lớp.` };
    } catch (error: any) {
        console.error('[updateManualClassSizes] ERROR:', error);
        return { success: false, message: `Lỗi khi cập nhật sĩ số lớp: ${error.message || 'Unknown error'}` };
    }
}
