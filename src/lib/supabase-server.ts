import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AppUser, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW, UserRole } from '@/types/models';
import { supabaseAdmin } from './supabase-admin';
import { getUserProfileByEmail, getUser } from '@/services/user-service';

/**
 * Tạo Supabase Client cho môi trường Server (Next.js Server Actions / API Routes).
 * Tự động đọc và ghi cookie để đồng bộ session với trình duyệt.
 */
export function createClient() {
  try {
    const cookieStore = cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Có thể xảy ra lỗi nếu gọi set cookie trong Server Component (không phải Action/Route)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Bỏ qua lỗi
            }
          },
        },
      }
    );
  } catch (error) {
    // Fallback an toàn khi chạy ngoài Next.js HTTP Request context (như unit test, scripts, CLI)
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() { return undefined; },
          set() {},
          remove() {},
        },
      }
    );
  }
}

/**
 * Lấy User hiện tại (Identity) từ Session.
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Lấy Profile (RBAC & Permissions) của User từ Database.
 * Sử dụng Supabase Admin (Service Role) ở Server-side để bypass RLS an toàn.
 */
export async function getAppUser(uid: string, email?: string): Promise<AppUser | null> {
  if (supabaseAdmin) {
    try {
      // 1. Ưu tiên tìm theo ID
      let { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*, teacher_classes(class_id, is_homeroom)')
        .eq('id', uid)
        .maybeSingle();

      // 2. Fallback: Tìm theo Email nếu ID chưa map
      if (!data && email) {
        const res = await supabaseAdmin
          .from('profiles')
          .select('*, teacher_classes(class_id, is_homeroom)')
          .ilike('email', email.trim())
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (data && !error) {
        const role = (data.role || 'teacher') as UserRole;
        const teacherClasses = data.teacher_classes || [];
        const assignedClassIds = teacherClasses.map((tc: any) => tc.class_id);
        const homeroomClassId = teacherClasses.find((tc: any) => tc.is_homeroom)?.class_id || '';

        return {
          uid: data.id,
          email: data.email || email || '',
          studentCode: data.student_code,
          displayName: data.full_name || data.email || 'Người dùng',
          role,
          assignedClassIds,
          homeroomClassId,
          permissions: DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.teacher,
          editWindowMinutes: data.edit_window_minutes ?? (DEFAULT_EDIT_WINDOW[role] || 1440),
          isActive: data.is_active ?? true,
          bankInfo: data.bank_info,
          createdAt: data.created_at,
          lastLoginAt: data.last_login_at
        } as AppUser;
      }
    } catch (adminErr) {
      console.error('[getAppUser] Lỗi khi truy vấn bằng supabaseAdmin:', adminErr);
    }
  }

  // Fallback nếu không có supabaseAdmin
  let appUser = await getUser(uid);
  if (!appUser && email) {
    appUser = await getUserProfileByEmail(email);
  }
  
  return appUser;
}

// Re-export supabaseAdmin cho các logic cần bypass RLS
export { supabaseAdmin };
export default supabaseAdmin;

