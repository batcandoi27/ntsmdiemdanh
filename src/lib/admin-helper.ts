import { supabaseAdmin } from './supabase-admin';

export async function setAdminRole(email: string) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();

    if (typeof window !== 'undefined' || !supabaseAdmin) {
        console.error("setAdminRole must be called on server with supabaseAdmin");
        return;
    }

    const { error } = await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('email', cleanEmail);
    if (error) {
        console.error(`Failed to grant ADMIN to ${cleanEmail}:`, error);
    } else {
        console.log(`Granted ADMIN to ${cleanEmail}`);
    }
}
