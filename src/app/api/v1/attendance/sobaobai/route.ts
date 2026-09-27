import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

// Ưu tiên dùng Admin Client trên server để bypass RLS
const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date')?.trim();
    const rawClassId = searchParams.get('classId')?.trim();
    const session = searchParams.get('session')?.trim(); // 'morning' | 'afternoon'
    const periodParam = searchParams.get('period')?.trim();
    const period = periodParam ? parseInt(periodParam, 10) : null;

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tham số bắt buộc: date (YYYY-MM-DD)' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!rawClassId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tham số bắt buộc: classId (ví dụ: 8A12)' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Phân giải lớp học (Resolve Class)
    let targetClassId = rawClassId;
    let targetClassName = rawClassId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawClassId);

    if (isUUID) {
      const { data: cls } = await dbClient
        .from('classes')
        .select('id, name')
        .eq('id', rawClassId)
        .maybeSingle();
      if (cls?.name) targetClassName = cls.name;
    } else {
      // Tìm lớp theo tên (vd: 8A12)
      const { data: matchedClasses } = await dbClient
        .from('classes')
        .select('id, name')
        .ilike('name', rawClassId);

      if (!matchedClasses || matchedClasses.length === 0) {
        return NextResponse.json(
          { success: false, error: `Không tìm thấy lớp có tên "${rawClassId}" trong hệ thống.` },
          { status: 404, headers: corsHeaders }
        );
      }

      if (matchedClasses.length === 1) {
        targetClassId = matchedClasses[0].id;
        targetClassName = matchedClasses[0].name;
      } else {
        // Nếu có nhiều hơn 1 lớp trùng tên, ưu tiên lớp có điểm danh trong ngày cần tìm hoặc lớp có điểm danh gần nhất
        let bestClassId = matchedClasses[0].id;
        let foundActive = false;

        for (const c of matchedClasses) {
          const { count: attCountOnDate } = await dbClient
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', c.id)
            .eq('date', date);

          if ((attCountOnDate || 0) > 0) {
            bestClassId = c.id;
            targetClassName = c.name;
            foundActive = true;
            break;
          }
        }

        if (!foundActive) {
          for (const c of matchedClasses) {
            const { count: totalAtt } = await dbClient
              .from('attendance')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', c.id);
            if ((totalAtt || 0) > 0) {
              bestClassId = c.id;
              targetClassName = c.name;
              break;
            }
          }
        }

        targetClassId = bestClassId;
      }
    }

    // 2. Lấy tổng số học sinh của lớp
    const { count: totalStudents } = await dbClient
      .from('student_classes')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', targetClassId);

    // 3. Lấy cache attendance_statuses để phân biệt K, P, V, T, VP...
    const { data: statuses } = await dbClient
      .from('attendance_statuses')
      .select('id, code, label, type_id');
    const statusMap = new Map<string, { code: string; label: string }>();
    statuses?.forEach((s: any) => {
      statusMap.set(s.id, { code: s.code, label: s.label || s.code });
    });

    // 4. Truy vấn bảng attendance
    let query = dbClient
      .from('attendance')
      .select('*')
      .eq('class_id', targetClassId)
      .eq('date', date);

    if (session) {
      query = query.eq('session', session);
    }

    const { data: records, error: attError } = await query;
    if (attError) {
      console.error('Lỗi truy vấn attendance:', attError);
      return NextResponse.json(
        { success: false, error: `Lỗi truy vấn CSDL: ${attError.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        {
          success: true,
          date,
          className: targetClassName,
          classId: targetClassId,
          session: session || null,
          period: period || null,
          totalStudents: totalStudents || 0,
          absentCount: 0,
          absentStudents: [],
          meta: {
            timestamp: new Date().toISOString(),
            note: 'Không có bản ghi vắng nào trong khoảng thời gian này.'
          }
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 5. Lọc học sinh vắng phù hợp với tiết học (period) và loại vắng (K: không phép, P: có phép, V: vắng chưa rõ)
    // - Vắng cả buổi: period === null (áp dụng cho tất cả các tiết trong session)
    // - Vắng theo tiết: period === requestedPeriod hoặc missed_periods chứa requestedPeriod
    const relevantRecords = records.filter((r: any) => {
      const st = statusMap.get(r.status_id);
      const code = st?.code || '';
      // Các mã trạng thái vắng: K (Không phép), P (Có phép), V (Chưa rõ lý do)
      const isAbsent = ['K', 'P', 'V', 'absent', 'excused'].includes(code);
      if (!isAbsent) return false;

      if (period !== null) {
        const isSessionWide = r.period === null || r.period === undefined;
        const isSpecificPeriod = r.period === period;
        const isInMissedPeriods = Array.isArray(r.missed_periods) && r.missed_periods.includes(period);
        return isSessionWide || isSpecificPeriod || isInMissedPeriods;
      }

      return true;
    });

    // 6. Lấy thông tin họ tên học sinh
    const studentIds = Array.from(new Set(relevantRecords.map((r: any) => r.student_id).filter(Boolean)));
    const studentMap = new Map<string, { student_code: string; full_name: string }>();

    if (studentIds.length > 0) {
      const { data: stuList } = await dbClient
        .from('students')
        .select('id, student_code, full_name')
        .in('id', studentIds);
      stuList?.forEach((s: any) => {
        studentMap.set(s.id, { student_code: s.student_code, full_name: s.full_name });
      });
    }

    // 7. Chuẩn hóa payload trả về
    const absentStudents = relevantRecords.map((r: any) => {
      const stu = studentMap.get(r.student_id);
      const st = statusMap.get(r.status_id);
      const code = st?.code || 'K';
      const label = st?.label || (code === 'P' ? 'Vắng có phép' : 'Vắng không phép');
      const isFullDay = r.period === null || r.period === undefined;

      return {
        id: r.student_id,
        studentCode: stu?.student_code || '',
        fullName: stu?.full_name || 'Học sinh',
        status: code,
        statusLabel: label,
        note: r.note || '',
        isFullDay,
        period: r.period || null,
        session: r.session || 'morning',
        missedPeriods: r.missed_periods || []
      };
    });

    // Khử trùng lặp học sinh (nếu 1 học sinh có nhiều record trong cùng 1 buổi)
    const uniqueAbsentMap = new Map<string, any>();
    absentStudents.forEach(item => {
      if (!uniqueAbsentMap.has(item.id)) {
        uniqueAbsentMap.set(item.id, item);
      }
    });
    const uniqueAbsentList = Array.from(uniqueAbsentMap.values());

    return NextResponse.json(
      {
        success: true,
        date,
        className: targetClassName,
        classId: targetClassId,
        session: session || null,
        period: period || null,
        totalStudents: totalStudents || 0,
        absentCount: uniqueAbsentList.length,
        absentStudents: uniqueAbsentList,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Lỗi nghiêm trọng trong GET /api/v1/attendance/sobaobai:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server nội bộ' },
      { status: 500, headers: corsHeaders }
    );
  }
}
