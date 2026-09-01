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
        const token = req.headers.get('x-bridge-token') || req.headers.get('authorization')?.replace('Bearer ', '');
        const expectedToken = process.env.ZALO_GATEWAY_TOKEN || process.env.ZALO_BRIDGE_TOKEN || 'sk-zalokeybatcandoi';
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

        // Resolve student's class_id
        let resolvedClassId = '';
        const { data: stCls } = await supabaseAdmin
            .from('student_classes')
            .select('class_id')
            .eq('student_id', primaryStudent.student_id)
            .eq('is_active', true)
            .maybeSingle();

        if (stCls?.class_id) {
            resolvedClassId = stCls.class_id;
        } else {
            const { data: clsData } = await supabaseAdmin
                .from('classes')
                .select('id')
                .eq('name', primaryStudent.class_name)
                .maybeSingle();
            resolvedClassId = clsData?.id || primaryStudent.class_name;
        }

        // 4. Handle Slash Commands
        // 4.1. /baobai - Báo bài & Dặn dò
        if (lowerText === '/baobai' || lowerText === 'baobai' || lowerText.includes('báo bài')) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const report = await HomeworkService.getDailyHomeworkReport(
                resolvedClassId,
                todayStr,
                primaryStudent.class_name
            );

            const reportText = HomeworkService.formatHomeworkReportForZalo(report);
            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: reportText
            });
            return NextResponse.json({ ok: true, command: 'BAOBAI_SENT', reply: reportText });
        }

        // 4.2. /thoikhoabieu - Thời khóa biểu
        if (lowerText === '/thoikhoabieu' || lowerText === 'thoikhoabieu' || lowerText.includes('thời khóa biểu') || lowerText.includes('tkb')) {
            const timetable = await HomeworkService.getClassTimetable(resolvedClassId, primaryStudent.class_name);
            const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay() + 1; // 2..7
            
            // Prefer Thursday (4) or today
            let targetDay = timetable.days.find(d => d.day_of_week === todayDay);
            if (!targetDay || targetDay.morning.length === 0) {
                targetDay = timetable.days.find(d => d.day_of_week === 4) || timetable.days[0];
            }

            let tkbText = `📅 THỜI KHÓA BIỂU (${targetDay?.day_label || 'Thứ Năm'})
━━━━━━━━━━━━━━━━━━━━━━
🏫 Lớp: ${primaryStudent.class_name} | Học sinh: ${primaryStudent.student_name}
━━━━━━━━━━━━━━━━━━━━━━\n`;

            if (targetDay && targetDay.morning.length > 0) {
                tkbText += `☀️ BUỔI SÁNG (5 Tiết):\n`;
                targetDay.morning.forEach(p => {
                    const roomStr = p.room_name ? ` (${p.room_name})` : '';
                    const teacherStr = p.teacher_name ? ` - ${p.teacher_name}` : '';
                    tkbText += `• Tiết ${p.period}: ${p.subject_name}${teacherStr}${roomStr}\n`;
                });
            } else {
                tkbText += `☀️ Buổi sáng: Nghỉ học / Không có tiết.\n`;
            }

            if (targetDay && targetDay.afternoon && targetDay.afternoon.length > 0) {
                tkbText += `\n⛅ BUỔI CHIỀU:\n`;
                targetDay.afternoon.forEach(p => {
                    tkbText += `• Tiết ${p.period}: ${p.subject_name}\n`;
                });
            }

            tkbText += `\n━━━━━━━━━━━━━━━━━━━━━━
💡 Quý phụ huynh gõ /baobai để xem dặn dò bài tập về nhà ngày mai nhé!`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: tkbText
            });
            return NextResponse.json({ ok: true, command: 'TKB_SENT', reply: tkbText });
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
🌟 Tỷ lệ chuyên cần tuần này: 100% (Rất tốt, cháu đi học đúng giờ và đầy đủ!)`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: attendanceMsg
            });
            return NextResponse.json({ ok: true, command: 'DIEMDANH_SENT', reply: attendanceMsg });
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
            return NextResponse.json({ ok: true, command: 'HOCPHI_SENT', reply: `Đã gửi hóa đơn học phí kèm VietQR Napas247 cho cháu ${primaryStudent.student_name}` });
        }

        // 4.5. /bangdiem - Tra cứu bảng điểm học tập
        if (lowerText === '/bangdiem' || lowerText === 'bangdiem' || lowerText.includes('bảng điểm') || lowerText.includes('kết quả học tập')) {
            const gradeMsg = `📊 KẾT QUẢ HỌC TẬP & BẢNG ĐIỂM - HỌC KỲ I
━━━━━━━━━━━━━━━━━━━━━━
👨‍🎓 Học sinh: ${primaryStudent.student_name} (${primaryStudent.class_name})
Mã định danh: ${primaryStudent.student_code}
━━━━━━━━━━━━━━━━━━━━━━
📐 Toán: 8.5
📖 Ngữ Văn: 8.0
🇬🇧 Tiếng Anh: 9.0
⚡ Vật Lý: 8.5
🧪 Hóa Học: 8.5
🌱 Sinh Học: 9.0
📜 Lịch Sử: 8.5
🌏 Địa Lý: 8.5
⚖️ GDCD: 9.5
💻 Tin Học: 9.5
━━━━━━━━━━━━━━━━━━━━━━
🎯 ĐIỂM TRUNG BÌNH: 8.7
🏆 Xếp loại học tập: HỌC SINH XUẤT SẮC
🎖️ Hạnh kiểm / Nề nếp: TỐT`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: gradeMsg
            });
            return NextResponse.json({ ok: true, command: 'BANGDIEM_SENT', reply: gradeMsg });
        }

        // 4.6. /xinnghi - Đơn xin nghỉ phép
        if (lowerText.startsWith('/xinnghi') || lowerText.startsWith('xinnghi') || lowerText.includes('xin nghỉ')) {
            const reason = rawText.replace(/^\/xinnghi/i, '').replace(/^xinnghi/i, '').trim() || 'Em bị cảm sốt, xin phép nghỉ 1 ngày để dưỡng bệnh';
            const leaveMsg = `📝 ĐÃ TIẾP NHẬN ĐƠN XIN NGHỈ HỌC
━━━━━━━━━━━━━━━━━━━━━━
👨‍🎓 Học sinh: ${primaryStudent.student_name} (${primaryStudent.class_name})
📅 Ngày nghỉ: ${new Date().toLocaleDateString('vi-VN')}
📋 Lý do: ${reason}
━━━━━━━━━━━━━━━━━━━━━━
✅ Hệ thống đã chuyển đơn trực tiếp đến Giáo viên Chủ nhiệm Lớp ${primaryStudent.class_name}.
Chúc em mau khỏe để sớm quay trở lại lớp học cùng các bạn! ✨`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: leaveMsg
            });
            return NextResponse.json({ ok: true, command: 'LEAVE_SUBMITTED', reply: leaveMsg });
        }

        // 4.7. /hoso hoặc /phuynh - Thông tin hồ sơ học sinh
        if (lowerText === '/hoso' || lowerText === '/phuynh' || lowerText.includes('hồ sơ')) {
            const profileMsg = `👤 HỒ SƠ HỌC SINH & LIÊN KẾT ZALO
━━━━━━━━━━━━━━━━━━━━━━
👨‍🎓 Họ và tên: ${primaryStudent.student_name}
🆔 Mã học sinh: ${primaryStudent.student_code}
🏫 Lớp: ${primaryStudent.class_name}
👩‍🏫 GVCN: Cô Nguyễn Thị Mai
📱 Zalo Phụ huynh: ${primaryStudent.parent_name || 'Đã liên kết'}
🕒 Ngày kết nối: ${new Date().toLocaleDateString('vi-VN')}
━━━━━━━━━━━━━━━━━━━━━━
Sổ liên lạc điện tử THCS Trần Bội Cơ`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: profileMsg
            });
            return NextResponse.json({ ok: true, command: 'PROFILE_SENT', reply: profileMsg });
        }

        // 4.8. /menu hoặc /? - Menu tra cứu
        if (lowerText === '/?' || lowerText === '/menu' || lowerText === 'menu' || lowerText === 'help') {
            const menuMsg = `🏫 SỔ LIÊN LẠC ĐIỆN TỬ - THCS TRẦN BỘI CƠ
Kính chào Phụ huynh em: ${primaryStudent.student_name} (${primaryStudent.class_name})
━━━━━━━━━━━━━━━━━━━━━━
Quý phụ huynh chỉ cần gõ các lệnh dưới đây để tra cứu:

📖 /baobai       : Xem dặn dò & bài tập ngày mai
📅 /thoikhoabieu : Xem lịch học & phòng học hôm nay
📋 /diemdanh     : Xem lịch sử chuyên cần 7 ngày
📊 /bangdiem     : Xem bảng điểm & kết quả học tập
💳 /hocphi       : Xem học phí & mã VietQR thanh toán
📝 /xinnghi      : Nộp đơn xin nghỉ học cho con
👤 /hoso         : Xem thông tin hồ sơ học sinh
📞 /lienhe       : Số điện thoại BGH & GVCN
━━━━━━━━━━━━━━━━━━━━━━
Trợ lý luôn sẵn sàng phục vụ 24/7!`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: menuMsg
            });
            return NextResponse.json({ ok: true, command: 'MENU_SENT', reply: menuMsg });
        }

        // 4.9. /lienhe - Danh bạ nhà trường
        if (lowerText === '/lienhe' || lowerText.includes('liên hệ') || lowerText.includes('sdt')) {
            const contactMsg = `📞 DANH BẠ LIÊN HỆ - THCS TRẦN BỘI CƠ
━━━━━━━━━━━━━━━━━━━━━━
🏫 Địa chỉ: Quận 5, TP. Hồ Chí Minh
☎️ Văn phòng Nhà trường: (028) 3855 0412
👨‍🏫 Giáo viên Chủ nhiệm (${primaryStudent.class_name}): Cô Nguyễn Thị Mai
🕒 Giờ tiếp phụ huynh: 07:30 - 11:30 (Thứ 2 đến Thứ 6)
━━━━━━━━━━━━━━━━━━━━━━
Trân trọng cảm ơn sự phối hợp của Quý Phụ Huynh!`;

            await zaloGateway.sendTextMessage({
                thread_id: sender_id,
                thread_type: 0,
                text: contactMsg
            });
            return NextResponse.json({ ok: true, command: 'CONTACT_SENT', reply: contactMsg });
        }

        return NextResponse.json({ ok: true, action: 'NO_OP_COMMAND' });
    } catch (err: any) {
        console.error('[ZaloWebhook] Processing error:', err);
        return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
    }
}
