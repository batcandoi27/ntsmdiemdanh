import { supabase } from '@/lib/supabase';

export const supabaseAuth = {
    async signIn(email: string, password?: string) {
        if (password) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            return { error };
        } else {
            const { error } = await supabase.auth.signInWithOtp({ 
                email,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            return { error };
        }
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async updatePassword(password: string) {
        const { error } = await supabase.auth.updateUser({ password });
        return { error };
    },

    async getProfileOnly(userId: string, email?: string) {
        // 1. Thử tìm theo ID (Supabase Auth ID)
        const { data: profilesById } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId);
        
        let profile = profilesById && profilesById.length > 0 ? profilesById[0] : null;

        // 2. Nếu không thấy, thử tìm theo Email (hỗ trợ tài khoản migrated hoặc nạp sẵn)
        if (!profile && email) {
            const { data: profilesByEmail } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email);
            
            profile = profilesByEmail && profilesByEmail.length > 0 ? profilesByEmail[0] : null;
        }

        if (!profile) return null;

        const profileIdToUse = profile.id; // Dùng ID thực tế của profile để fetch classes

        // Lấy danh sách lớp được phân công
        const { data: assignments } = await supabase
            .from('teacher_classes')
            .select('class_id, is_homeroom')
            .eq('teacher_id', profileIdToUse);
        
        const assignedClassIds = assignments?.map(a => a.class_id) || [];
        const homeroomClassId = assignments?.find(a => a.is_homeroom)?.class_id || '';

        return {
            ...profile,
            assignedClassIds,
            homeroomClassId
        };
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const profileData = await this.getProfileOnly(user.id, user.email);
        if (!profileData) return null;

        return {
            uid: user.id,
            email: user.email,
            displayName: profileData.full_name || user.email?.split('@')[0],
            role: profileData.role || 'teacher',
            isActive: profileData.is_active ?? true,
            assignedClassIds: (profileData as any).assignedClassIds || [], 
            homeroomClassId: (profileData as any).homeroomClassId,
            permissions: profileData.role === 'admin' ? { canEditAttendance: true, canEditStudentStatus: true, canCreateAccounts: true, canViewAllClasses: true, canExportData: true, canManageTimetable: true, canAccessAPI: true } : { canEditAttendance: true, canEditStudentStatus: false, canCreateAccounts: false, canViewAllClasses: profileData.role === 'supervisor' || profileData.role === 'principal', canExportData: true, canManageTimetable: false, canAccessAPI: false },
            editWindowMinutes: profileData.role === 'admin' ? -1 : 1440,
            createdAt: user.created_at
        };
    }
};
