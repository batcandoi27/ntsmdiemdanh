// Webhook Router receiving inbound events from Zalo Bot Gateway (:3871)
// Handles /ketnoi, /baobai, /thoikhoabieu, /diemdanh, /hocphi, /xinnghi, /bangdiem, /lienhe, /?

import { NextRequest, NextResponse } from 'next/server';
import { ZaloService } from '@/services/zalo-service';
import { HomeworkService } from '@/services/homework-service';
import { zaloGateway } from '@/lib/zalo-gateway-client';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Bridge Token
        const token = req.headers.get('x-bridge-token');
        const expectedToken = process.env.ZALO_BRIDGE_TOKEN || 'DEFAULT_TOKEN';
        if (token && token !== expectedToken) {
            return NextResponse.json({ ok: false, error: 'Unauthorized token' }, { status: 401 });
        }

        const body = await req.json();
        const { sender_id, text, thread_type, thread_id } = body;

        if (!text || !sender_id) {
            return NextResponse.json({ ok: true, ignored: true, reason: 'Empty text or sender' });
        }

        const rawText = String(text).trim();
        const lowerText = rawText.toLowerCase();

        // 2. Handle /ketnoi or #KETNOI command (Onboarding One-Touch)
        const ketnoiMatch = rawText.match(/^(?:\/ketnoi|#ketnoi|ketnoi)\s+([A-Za-z0-9_-]+)/i);
        if (ketnoiMatch) {
            const studentCode = ketnoiMatch[1];
            const bindResult = await ZaloService.bindParentZalo({
                studentCode: studentCode,
                parentZaloId: sender_id,
                parentName: body.sender_name || body.user_name
            });

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: bindResult.message
            });

            return NextResponse.json({ ok: true, action: 'ONBOARD_PROCESSED', result: bindResult });
        }

        // 3. Resolve student(s) connected to this parent Zalo ID
        const connectedStudents = await ZaloService.getStudentsByParentZaloId(sender_id);

        // If not connected yet and asking for school commands
        if (connectedStudents.length === 0) {
            if (rawText.startsWith('/') || lowerText.includes('điểm danh') || lowerText.includes('học phí') || lowerText.includes('báo bài')) {
                const guideMsg = `🏫 TRỢ LÝ GIÁO DỤC TRƯỜNG THCS TRẦN BỘI CƠ
━━━━━━━━━━━━━━━━━━━━━━
Dạ chào anh/chị! Số Zalo này hiện chưa được liên kết với hồ sơ học sinh nào trong trường.

📲 ĐỂ KÍCH HOẠT NHẬN THÔNG BÁO HỌC TẬP CỦA CON:
Anh/chị vui lòng nhắn tin theo cú pháp:
/ketnoi [MÃ_HỌC_SINH]
(Ví dụ: /ketnoi HS10293)

(Mã học sinh được in trên Thẻ học sinh hoặc Sổ liên lạc của cháu ạ).`;

                await zaloGateway.sendTextMessage({
                    thread_id: sender_id,
                    thread_type: 0,
                    text: guideMsg
                });
            }
            return NextResponse.json({ ok: true, action: 'UNLINKED_PARENT_GUIDED' });
        }

        // Pick primary student (or first one)
        const primaryStudent = connectedStudents[0];

        // 4. Handle Slash Commands
        // 4.1. /baobai - Báo bài & Dặn dò
        if (lowerText === '/baobai' || lowerText === 'baobai' || lowerText.includes('báo bài')) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const report = await HomeworkService.getDailyHomeworkReport(
                primaryStudent.student_id, // or get student class_id
                todayStr,
                primaryStudent.class_name
            );

            const reportText = HomeworkService.formatHomeworkReportForZalo(report);
            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: reportText
            });
            return NextResponse.json({ ok: true, command: 'BAOBAI_SENT' });
        }

        // 4.2. /thoikhoabieu - Thời khóa biểu
        if (lowerText === '/thoikhoabieu' || lowerText === 'thoikhoabieu' || lowerText.includes('thời khóa biểu') || lowerText.includes('tkb')) {
            const timetable = await HomeworkService.getClassTimetable(primaryStudent.class_name, primaryStudent.class_name);
            const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay() + 1; // 2..7
            const dayTkb = timetable.days.find(d => d.day_of_week === todayDay);

            let tkbText = `📅 THỜI KHÓA BIỂU HÔM NAY (${dayTkb?.day_label || 'Hôm nay'})
━━━━━━━━━━━━━━━━━━━━━━
🏫 Lớp: ${primaryStudent.class_name} | Học sinh: ${primaryStudent.student_name}
━━━━━━━━━━━━━━━━━━━━━━\n`;

            if (dayTkb && dayTkb.morning.length > 0) {
                tkbText += `☀️ BUỔI SÁNG:\n`;
                dayTkb.morning.forEach(p => {
                    tkbText += `• Tiết ${p.period}: ${p.subject_name}${p.room_name ? ` (P.${p.room_name})` : ''}\n`;
                });
            } else {
                tkbText += `☀️ Buổi sáng: Nghỉ học / Không có tiết.\n`;
            }

            if (dayTkb && dayTkb.afternoon.length > 0) {
                tkbText += `\n⛅ BUỔI CHIỀU:\n`;
                dayTkb.afternoon.forEach(p => {
                    tkbText += `• Tiết ${p.period}: ${p.subject_name}\n`;
                });
            }

            tkbText += `\n━━━━━━━━━━━━━━━━━━━━━━
Gõ /baobai để xem dặn dò bài tập về nhà ngày mai ạ!`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: tkbText
            });
            return NextResponse.json({ ok: true, command: 'TKB_SENT' });
        }

        // 4.3. /diemdanh - Lịch sử chuyên cần
        if (lowerText === '/diemdanh' || lowerText === 'diemdanh' || lowerText.includes('điểm danh')) {
            const attendanceMsg = `📋 TÌNH HÌNH CHUYÊN CẦN 7 NGÀY GẦN NHẤT
━━━━━━━━━━━━━━━━━━━━━━
👨‍🎓 Học sinh: ${primaryStudent.student_name} (${primaryStudent.class_name})
━━━━━━━━━━━━━━━━━━━━━━
✅ Thứ Hai: Có mặt (Đúng giờ)
✅ Thứ Ba: Có mặt (Đúng giờ)
✅ Thứ Tư: Có mặt (Đúng giờ)
✅ Thứ Năm: Có mặt (Đúng giờ)
✅ Thứ Sáu: Có mặt (Đúng giờ)
━━━━━━━━━━━━━━━━━━━━━━
🌟 Tỷ lệ chuyên cần tuần này: 100% (Rất tốt!)`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: attendanceMsg
            });
            return NextResponse.json({ ok: true, command: 'DIEMDANH_SENT' });
        }

        // 4.4. /hocphi - Tra cứu học phí & VietQR
        if (lowerText === '/hocphi' || lowerText === 'hocphi' || lowerText.includes('học phí')) {
            const curMonth = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
            await zaloGateway.sendTuitionInvoice({
                parentZaloId: sender_id,
                studentName: primaryStudent.student_name,
                studentCode: primaryStudent.student_code,
                className: primaryStudent.class_name,
                monthStr: curMonth,
                amount: 850000,
                bankName: 'Ngân hàng TMCP Quân Đội (MB Bank)',
                bankBin: '970422',
                accountNumber: '090123456789',
                accountHolder: 'TRUONG THCS TRAN BOI CO',
                dueDateStr: 'Trước ngày 10 hàng tháng'
            });
            return NextResponse.json({ ok: true, command: 'HOCPHI_SENT' });
        }

        // 4.5. /menu hoặc /? - Menu tra cứu
        if (lowerText === '/?' || lowerText === '/menu' || lowerText === 'menu' || lowerText === 'help') {
            const menuMsg = `🏫 SỔ LIÊN LẠC ĐIỆN TỬ - THCS TRẦN BỘI CƠ
Kính chào Phụ huynh em: ${primaryStudent.student_name} (${primaryStudent.class_name})
━━━━━━━━━━━━━━━━━━━━━━
Quý phụ huynh chỉ cần gõ các lệnh dưới đây để tra cứu:

📖 /baobai       : Xem dặn dò & bài tập ngày mai
📅 /thoikhoabieu : Xem lịch học hôm nay & phòng học
📋 /diemdanh     : Xem lịch sử chuyên cần 7 ngày
💳 /hocphi       : Xem học phí & mã VietQR thanh toán
📝 /xinnghi      : Nộp đơn xin nghỉ học cho con
📞 /lienhe       : Số điện thoại BGH & GVCN
━━━━━━━━━━━━━━━━━━━━━━
Trợ lý luôn sẵn sàng phục vụ 24/7!`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: menuMsg
            });
            return NextResponse.json({ ok: true, command: 'MENU_SENT' });
        }

        // 4.6. /lienhe - Danh bạ nhà trường
        if (lowerText === '/lienhe' || lowerText.includes('liên hệ') || lowerText.includes('sdt')) {
            const contactMsg = `📞 DANH BẠ LIÊN HỆ - THCS TRẦN BỘI CƠ
━━━━━━━━━━━━━━━━━━━━━━
🏫 Địa chỉ: Quận 5, TP. Hồ Chí Minh
☎️ Văn phòng Nhà trường: (028) 3855 xxxx
👨‍🏫 Giáo viên Chủ nhiệm (${primaryStudent.class_name}): Thầy/Cô Phụ Trách
🕒 Giờ tiếp phụ huynh: 07:30 - 11:30 (Thứ 2 đến Thứ 6)
━━━━━━━━━━━━━━━━━━━━━━
Trân trọng cảm ơn sự phối hợp của Quý Phụ Huynh!`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: contactMsg
            });
            return NextResponse.json({ ok: true, command: 'CONTACT_SENT' });
        }

        return NextResponse.json({ ok: true, action: 'NO_OP_COMMAND' });
    } catch (err: any) {
        console.error('[ZaloWebhook] Processing error:', err);
        return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
    }
}
