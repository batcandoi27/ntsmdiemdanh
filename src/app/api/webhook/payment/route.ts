import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

const dbClient = supabaseAdmin || supabase;

/**
 * Endpoint Webhook xử lý biến động số dư và tự động gạch nợ sổ theo dõi
 * Tích hợp bảo mật 3 lớp: Secret Token, DB Unique Lock (Anti-Race Condition), và Audit Trail
 */
export async function POST(req: NextRequest) {
  try {
    // 0. Lớp Bảo Mật 1: Xác thực Webhook Secret Header (nếu có cấu hình)
    const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (expectedSecret) {
      const incomingSecret =
        req.headers.get('x-webhook-secret') ||
        req.headers.get('x-api-key') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

      if (!incomingSecret || incomingSecret !== expectedSecret) {
        console.warn('[Webhook Payment] ❌ Unauthorized webhook request: Invalid secret token.');
        return NextResponse.json(
          { success: false, message: 'Unauthorized: Invalid webhook secret' },
          { status: 401 }
        );
      }
    }

    const rawBody = await req.json();
    console.log('[Webhook Payment] Received payload:', JSON.stringify(rawBody));

    // 1. Trích xuất thông tin giao dịch phổ biến từ payload (PayOS, SePay, Casso, Banking)
    const data = rawBody?.data ? (Array.isArray(rawBody.data) ? rawBody.data[0] : rawBody.data) : rawBody;

    const transactionId = String(data?.id || data?.reference || data?.tid || data?.transaction_id || `TX_${Date.now()}`);
    const amount = Number(data?.transferAmount || data?.amount || 0);
    const content = String(data?.content || data?.description || data?.orderInfo || data?.addInfo || '').trim();

    if (!content || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Missing transaction content or invalid amount' },
        { status: 400 }
      );
    }

    // 2. Lớp Bảo Mật 2: DB Atomic Lock chống Race Condition (Idempotency)
    // Thực hiện chèn trước bản ghi với transaction_id duy nhất
    const { data: initialTx, error: initialInsertErr } = await dbClient
      .from('payment_transactions')
      .insert({
        transaction_id: transactionId,
        order_code: content,
        class_id: 'PENDING_RESOLVE',
        student_code: 'PENDING_RESOLVE',
        column_id: 'PENDING_RESOLVE',
        amount: amount,
        content: content,
        payment_method: 'vietqr_webhook',
        status: 'pending',
        raw_webhook_data: rawBody,
        created_at: new Date().toISOString()
      })
      .select('id')
      .maybeSingle();

    if (initialInsertErr) {
      // 23505 = Unique Violation (Bị trùng transaction_id do gửi lại hoặc request đồng thời)
      if (initialInsertErr.code === '23505' || initialInsertErr.message?.includes('duplicate key')) {
        console.log(`[Webhook Payment] 🛡️ Transaction ${transactionId} already exists in DB (Idempotent lock hit).`);
        return NextResponse.json({
          success: true,
          message: 'Transaction already processed (idempotent)',
          transaction_id: transactionId
        });
      }
      console.error('[Webhook Payment] Initial lock insert error:', initialInsertErr);
      throw initialInsertErr;
    }

    // 3. Phân tích cú pháp nội dung chuyển khoản
    // Chuẩn: TBC [CLASS] [STUDENT_CODE] [COL_ID] [PERIOD]
    const cleanContent = content
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase();

    console.log('[Webhook Payment] Normalized content:', cleanContent);

    // Bóc tách token
    const tokens = cleanContent.split(/[\s_+-]+/).filter(Boolean);
    const startIndex = tokens[0] === 'TBC' ? 1 : 0;

    let targetClassName = tokens[startIndex] || '';
    let targetStudentCode = tokens[startIndex + 1] || '';
    let targetColHint = tokens[startIndex + 2] || '';
    let targetPeriodKey = tokens[startIndex + 3] || '';

    // 4. Tìm kiếm Lớp học và Học sinh trong DB
    let classId = '';
    let studentCode = '';

    // Tìm lớp
    if (targetClassName) {
      const { data: clsData } = await dbClient
        .from('classes')
        .select('id, name')
        .ilike('name', targetClassName)
        .maybeSingle();

      if (clsData) {
        classId = clsData.id;
      }
    }

    // Tìm học sinh
    if (targetStudentCode) {
      const { data: stList } = await dbClient
        .from('students')
        .select('id, student_code, gov_id, cccd, class_id')
        .or(`student_code.ilike.${targetStudentCode},gov_id.ilike.${targetStudentCode},cccd.ilike.${targetStudentCode}`);

      if (stList && stList.length > 0) {
        const matched = classId ? stList.find(s => s.class_id === classId) || stList[0] : stList[0];
        studentCode = matched.student_code || targetStudentCode;
        if (!classId) classId = matched.class_id;
      } else {
        studentCode = targetStudentCode;
      }
    }

    if (!classId || !studentCode) {
      // Cập nhật trạng thái transaction thành pending để admin xử lý thủ công
      await dbClient
        .from('payment_transactions')
        .update({
          class_id: classId || 'UNKNOWN',
          student_code: studentCode || 'UNKNOWN',
          status: 'pending'
        })
        .eq('transaction_id', transactionId);

      return NextResponse.json({
        success: true,
        reconciled: false,
        message: 'Could not uniquely identify class or student from content, saved for manual review',
        extracted: { targetClassName, targetStudentCode, targetColHint, targetPeriodKey }
      });
    }

    // 5. Tìm Cột theo dõi phù hợp
    const { data: cols } = await dbClient
      .from('columns')
      .select('*')
      .eq('class_id', classId)
      .eq('archived', false);

    let matchedColumn: any = null;

    if (cols && cols.length > 0) {
      if (targetColHint) {
        matchedColumn = cols.find(c => 
          c.id.toLowerCase().includes(targetColHint.toLowerCase()) ||
          c.name.toLowerCase().includes(targetColHint.toLowerCase()) ||
          c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toUpperCase().includes(targetColHint)
        );
      }
      // Nếu không khớp hint, lấy cột có paymentConfig enabled
      if (!matchedColumn) {
        matchedColumn = cols.find(c => c.payment_config?.enabled);
      }
      // Fallback cột đầu tiên
      if (!matchedColumn) {
        matchedColumn = cols[0];
      }
    }

    const columnId = matchedColumn ? matchedColumn.id : 'CUSTOM_PAYMENT';
    const periodKey = targetPeriodKey || (matchedColumn?.frequency === 'one_time' ? 'one_time' : undefined);

    // 6. Tự động Gạch Nợ / Cập nhật vào column_records
    if (matchedColumn) {
      const recordType = matchedColumn.frequency === 'period' ? 'period' : 'one_time';
      const recordId = `${columnId}_${periodKey || 'one_time'}_${studentCode}`;

      // Query xem record đã có chưa
      let recordQuery = dbClient
        .from('column_records')
        .select('id, status, value, note')
        .eq('id', recordId);

      const { data: existingRecords } = await recordQuery;
      const existingRec = existingRecords?.[0];

      if (existingRec) {
        // Cập nhật record có sẵn
        await dbClient
          .from('column_records')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            value: amount,
            note: `VietQR: Đã thanh toán ${amount.toLocaleString('vi-VN')}đ (Mã GD: ${transactionId})`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRec.id);
      } else {
        // Tạo record mới
        await dbClient
          .from('column_records')
          .insert({
            id: recordId,
            column_id: columnId,
            class_id: classId,
            student_code: studentCode,
            record_type: recordType,
            period_key: periodKey || null,
            status: 'completed',
            completed_at: new Date().toISOString(),
            value: amount,
            note: `VietQR: Đã thanh toán ${amount.toLocaleString('vi-VN')}đ (Mã GD: ${transactionId})`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    }

    // 7. Cập nhật transaction thành công
    await dbClient
      .from('payment_transactions')
      .update({
        class_id: classId,
        student_code: studentCode,
        column_id: columnId,
        period_key: periodKey || null,
        status: 'success'
      })
      .eq('transaction_id', transactionId);

    console.log(`[Webhook Payment] ✅ Successfully reconciled TX ${transactionId} for student ${studentCode} (${amount} VND)`);

    return NextResponse.json({
      success: true,
      reconciled: true,
      transaction_id: transactionId,
      class_id: classId,
      student_code: studentCode,
      column_id: columnId,
      period_key: periodKey,
      amount: amount
    });
  } catch (err: any) {
    console.error('[Webhook Payment] Error processing webhook:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET Handler cho webhook health check hoặc URL validation của cổng thanh toán
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'THCS Tran Boi Co VietQR Payment Webhook',
    timestamp: new Date().toISOString()
  });
}
