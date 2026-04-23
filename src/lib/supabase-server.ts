import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AppUser } from '@/types/models';
import { supabaseAdmin } from './supabase-admin';
import { getUserProfileByEmail, getUser } from '@/services/user-service';

/**
 * Tạo Supabase Client cho môi trường Server (Next.js Server Actions / API Routes).
 * Tự động đọc và ghi cookie để đồng bộ session với trình duyệt.
 */
export function createClient() {
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
 */
export async function getAppUser(uid: string, email?: string): Promise<AppUser | null> {
  // Ưu tiên tìm theo ID
  let appUser = await getUser(uid);
  
  // Fallback: Tìm theo Email nếu account migrated
  if (!appUser && email) {
      appUser = await getUserProfileByEmail(email);
  }
  
  return appUser;
}

// Re-export supabaseAdmin cho các logic cần bypass RLS
export { supabaseAdmin };
export default supabaseAdmin;
