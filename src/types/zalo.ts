// Types for Zalo Gateway Integration & Sổ Liên Lạc Điện Tử (Zalo Bot Protocol)

export interface ZaloMessagePayload {
    thread_id: string;
    thread_type: 0 | 1; // 0: DM (1-1), 1: Group
    text: string;
}

export interface ZaloFriendAliasPayload {
    user_id: string;
    alias: string;
}

export interface ZaloBankCardPayload {
    thread_id: string;
    thread_type: 0 | 1;
    bank_card: {
        binBank: string;
        numAccBank: string;
        nameAccBank: string;
    };
}

export interface ZaloReminderPayload {
    thread_id: string;
    thread_type: 1; // Group only
    reminder: {
        title: string;
        startTime: number; // Unix timestamp ms
    };
}

export interface ZaloNotePayload {
    group_id: string;
    note: {
        title: string;
        pinAct?: number; // 1 to pin
    };
}

export interface ZaloPollPayload {
    group_id: string;
    question: string;
    options: string[];
    allow_multi_choices?: boolean;
    allow_add_new_option?: boolean;
    is_anonymous?: boolean;
}

export interface ZaloMemberReviewPayload {
    group_id: string;
    members: string[];
    is_approve: boolean;
}

export interface ZaloLabelPayload {
    user_id: string;
    labels: string[]; // ['Lớp 9A1', 'Đã đóng học phí', ...]
}

export interface StudentParentZaloMapping {
    id: string;
    student_id: string;
    student_code: string;
    student_name: string;
    class_name: string;
    parent_zalo_id: string;
    parent_name?: string;
    parent_phone?: string;
    is_friend: boolean;
    alias_set?: string;
    status: 'CONNECTED' | 'DISCONNECTED';
    connected_at: string;
    last_interacted_at?: string;
}

export interface ClassZaloGroup {
    class_id: string;
    class_name: string;
    zalo_group_id: string;
    group_name?: string;
    is_bot_deputy: boolean; // Code 166 guard
    auto_report_enabled: boolean;
    created_at: string;
}

export interface ZaloMessageLog {
    id: string;
    idempotency_key: string;
    thread_id: string;
    thread_type: 0 | 1;
    message_type: 'ATTENDANCE_ALERT' | 'TUITION_INVOICE' | 'REPORT' | 'POLL' | 'HOMEWORK' | 'REMINDER';
    content: string;
    metadata?: Record<string, any>;
    status: 'PENDING' | 'SENT' | 'FAILED';
    retry_count: number;
    error_code?: number;
    error_message?: string;
    sent_at?: string;
    created_at: string;
}
