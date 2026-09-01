// Zalo Gateway Client SDK for WebApp Điểm Danh & Sổ Chủ Nhiệm
// Communicates with Zalo Bot Gateway Daemon on port 3871 (Microservice Plan A)

import {
    ZaloMessagePayload,
    ZaloFriendAliasPayload,
    ZaloBankCardPayload,
    ZaloReminderPayload,
    ZaloNotePayload,
    ZaloPollPayload,
    ZaloMemberReviewPayload
} from '@/types/zalo';

export interface ZaloGatewayConfig {
    baseUrl: string;
    bridgeToken: string;
    queueDelayMs: number; // 1500ms
}

export class ZaloGatewayClient {
    private config: ZaloGatewayConfig;
    private sendQueue: Array<() => Promise<any>> = [];
    private isProcessingQueue = false;

    constructor(customConfig?: Partial<ZaloGatewayConfig>) {
        this.config = {
            baseUrl: customConfig?.baseUrl || process.env.ZALO_GATEWAY_URL || process.env.NEXT_PUBLIC_ZALO_GATEWAY_URL || 'https://zalo.thaycoai.io.vn',
            bridgeToken: customConfig?.bridgeToken || process.env.ZALO_GATEWAY_TOKEN || process.env.ZALO_BRIDGE_TOKEN || 'sk-zalokeybatcandoi',
            queueDelayMs: customConfig?.queueDelayMs || 1500
        };
    }

    private getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'x-bridge-token': this.config.bridgeToken,
            'Authorization': `Bearer ${this.config.bridgeToken}`
        };
    }

    /**
     * Check Gateway Health
     */
    async getHealth(): Promise<{ ok: boolean; status: string; uptime?: number }> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(`${this.config.baseUrl}/healthz`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json().catch(() => ({ status: 'online' }));
                return { ok: true, status: data.status || 'online', uptime: data.uptime };
            }
            return { ok: false, status: `HTTP ${res.status}` };
        } catch (err: any) {
            return { ok: false, status: 'offline', ...{ error: err?.message } };
        }
    }

    /**
     * Enqueue a request to prevent Zalo Anti-Flood (1.5s delay between sequential messages)
     */
    private enqueue<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.sendQueue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        while (this.sendQueue.length > 0) {
            const task = this.sendQueue.shift();
            if (task) {
                try {
                    await task();
                } catch (e) {
                    console.error('[ZaloGatewayClient] Queue task error:', e);
                }
                // Sleep 1.5s before next message
                if (this.sendQueue.length > 0) {
                    await new Promise(r => setTimeout(r, this.config.queueDelayMs));
                }
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Send direct Text Message (1-1 DM or Group)
     */
    async sendTextMessage(payload: ZaloMessagePayload): Promise<{ ok: boolean; messageId?: string; error?: string }> {
        return this.enqueue(async () => {
            try {
                const res = await fetch(`${this.config.baseUrl}/v1/hermes/messages`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                return { ok: res.ok, messageId: data?.message_id || data?.id, error: data?.error };
            } catch (err: any) {
                console.error('[ZaloGatewayClient] sendTextMessage failed:', err);
                return { ok: false, error: err?.message };
            }
        });
    }

    /**
     * Change Friend Alias (Đổi biệt danh phụ huynh: [9A1] - Phụ huynh Nguyễn Văn An)
     */
    async changeFriendAlias(payload: ZaloFriendAliasPayload): Promise<{ ok: boolean; error?: string }> {
        try {
            const res = await fetch(`${this.config.baseUrl}/api/alias`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, error: data?.error };
        } catch (err: any) {
            console.error('[ZaloGatewayClient] changeFriendAlias failed:', err);
            return { ok: false, error: err?.message };
        }
    }

    /**
     * Send Bank Card Widget (Thẻ ATM Ngân Hàng có nút Copy STK 1-chạm)
     */
    async sendBankCard(payload: ZaloBankCardPayload): Promise<{ ok: boolean; error?: string }> {
        return this.enqueue(async () => {
            try {
                const res = await fetch(`${this.config.baseUrl}/api/cards/bank`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                return { ok: res.ok, error: data?.error };
            } catch (err: any) {
                console.error('[ZaloGatewayClient] sendBankCard failed:', err);
                return { ok: false, error: err?.message };
            }
        });
    }

    /**
     * Create Zalo Reminder in Group (Tạo Lịch Nhắc Hẹn - Rung chuông tự động đúng giờ)
     */
    async createReminder(payload: ZaloReminderPayload): Promise<{ ok: boolean; reminderId?: string; error?: string }> {
        try {
            const res = await fetch(`${this.config.baseUrl}/api/reminders`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, reminderId: data?.reminder_id, error: data?.error };
        } catch (err: any) {
            console.error('[ZaloGatewayClient] createReminder failed:', err);
            return { ok: false, error: err?.message };
        }
    }

    /**
     * Pin Note to Group (Ghim Bảng Tin Ghi Chú Nhóm: TKB, Lịch thi, Nội quy)
     */
    async createNote(payload: ZaloNotePayload): Promise<{ ok: boolean; noteId?: string; error?: string }> {
        try {
            const res = await fetch(`${this.config.baseUrl}/api/notes`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, noteId: data?.note_id, error: data?.error };
        } catch (err: any) {
            console.error('[ZaloGatewayClient] createNote failed:', err);
            return { ok: false, error: err?.message };
        }
    }

    /**
     * Create Group Poll (Tạo cuộc bình chọn / thăm dò ý kiến phụ huynh)
     */
    async createPoll(payload: ZaloPollPayload): Promise<{ ok: boolean; pollId?: string; error?: string }> {
        try {
            const res = await fetch(`${this.config.baseUrl}/api/groups/${payload.group_id}/polls`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, pollId: data?.poll_id, error: data?.error };
        } catch (err: any) {
            console.error('[ZaloGatewayClient] createPoll failed:', err);
            return { ok: false, error: err?.message };
        }
    }

    /**
     * Review & Auto-Approve Pending Group Members (Duyệt phụ huynh vào nhóm lớp)
     */
    async reviewPendingMembers(payload: ZaloMemberReviewPayload): Promise<{ ok: boolean; error?: string }> {
        try {
            const res = await fetch(`${this.config.baseUrl}/api/groups/${payload.group_id}/members/review`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, error: data?.error };
        } catch (err: any) {
            console.error('[ZaloGatewayClient] reviewPendingMembers failed:', err);
            return { ok: false, error: err?.message };
        }
    }

    /**
     * Send Exception-Based Attendance Alert (1-1 DM for Absent / Late Students)
     */
    async sendAttendanceAlert(options: {
        parentZaloId: string;
        studentName: string;
        className: string;
        status: 'ABSENT' | 'LATE' | 'VIOLATION';
        timeStr: string;
        teacherName?: string;
        notes?: string;
    }): Promise<{ ok: boolean; error?: string }> {
        let title = '⚠️ CẢNH BÁO ĐIỂM DANH HỌC SINH';
        let statusText = 'VẮNG MẶT TẠI LỚP (Chưa điểm danh sau 15 phút)';

        if (options.status === 'LATE') {
            title = '⏰ THÔNG BÁO HỌC SINH ĐI MUỘN';
            statusText = `ĐẾN LỚP MUỘN (${options.notes || 'Đã vào lớp sau giờ chào cờ/chuông reo'})`;
        } else if (options.status === 'VIOLATION') {
            title = '📌 NHẮC NHỞ NỀ NẾP & RÈN LUYỆN';
            statusText = `GHI NHẬN VI PHẠM (${options.notes || 'Cần phụ huynh phối hợp nhắc nhở'})`;
        }

        const messageText = `${title}
━━━━━━━━━━━━━━━━━━━━━━
👨‍🎓 Học sinh: ${options.studentName} (${options.className})
⏰ Thời gian: ${options.timeStr}
📍 Tình trạng: ${statusText}
👨‍🏫 GVCN / Phụ trách: ${options.teacherName || 'Giáo viên Chủ Nhiệm'}
━━━━━━━━━━━━━━━━━━━━━━
Kính nhờ Quý Phụ Huynh kiểm tra lại thông tin và phản hồi giáo viên nếu cháu xin nghỉ phép ạ!`;

        return this.sendTextMessage({
            thread_id: options.parentZaloId,
            thread_type: 0,
            text: messageText
        });
    }

    /**
     * Send Tuition Invoice with Napas247 Dynamic VietQR Link
     */
    async sendTuitionInvoice(options: {
        parentZaloId: string;
        studentName: string;
        studentCode: string;
        className: string;
        monthStr: string;
        amount: number;
        bankName: string;
        bankBin: string;
        accountNumber: string;
        accountHolder: string;
        dueDateStr?: string;
    }): Promise<{ ok: boolean; error?: string }> {
        const transferContent = `HOCPHI ${options.studentCode} T${options.monthStr.replace(/\D/g, '')}`.toUpperCase();
        const vietQrUrl = `https://img.vietqr.io/image/${options.bankBin}-${options.accountNumber}-compact.png?amount=${options.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(options.accountHolder)}`;

        const messageText = `🧾 PHIẾU BÁO HỌC PHÍ & QUỸ LỚP ${options.monthStr}
━━━━━━━━━━━━━━━━━━━━━━
👨‍🎓 Học sinh: ${options.studentName} (Mã: ${options.studentCode})
🏫 Lớp: ${options.className}
💰 Số tiền: ${options.amount.toLocaleString('vi-VN')} VNĐ
🕒 Hạn nộp: ${options.dueDateStr || 'Trước ngày 10 hàng tháng'}
━━━━━━━━━━━━━━━━━━━━━━
📲 THÔNG TIN CHUYỂN KHOẢN:
• Ngân hàng: ${options.bankName}
• Số tài khoản: ${options.accountNumber}
• Chủ tài khoản: ${options.accountHolder}
• Cú pháp: ${transferContent}

🔗 Mở ứng dụng Ngân hàng quét mã VietQR tự động điền:
${vietQrUrl}`;

        // Send text message
        const resText = await this.sendTextMessage({
            thread_id: options.parentZaloId,
            thread_type: 0,
            text: messageText
        });

        // Also send official Bank Card widget
        await this.sendBankCard({
            thread_id: options.parentZaloId,
            thread_type: 0,
            bank_card: {
                binBank: options.bankBin,
                numAccBank: options.accountNumber,
                nameAccBank: options.accountHolder
            }
        });

        return resText;
    }
}

// Global Singleton Instance
export const zaloGateway = new ZaloGatewayClient();
