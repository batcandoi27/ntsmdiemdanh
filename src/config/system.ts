/**
 * System Configuration
 * 
 * SYSTEM_MODE = 'OPEN'   : Compatibility Mode. Tạm thời cho phép bypass một số quyền hạn để giáo viên thao tác toàn trường.
 * SYSTEM_MODE = 'STRICT' : Chế độ chuẩn. RBAC hoạt động chặt chẽ, giáo viên chỉ được thao tác trong lớp được phân công.
 */
export const SYSTEM_MODE = 'OPEN'; // 'OPEN' | 'STRICT'
