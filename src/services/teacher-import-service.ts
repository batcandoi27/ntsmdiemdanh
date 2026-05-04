'use server';

import ExcelJS from 'exceljs';
import { createTeacher, getAllGroups, createGroup, addTeacherToGroup } from './teacher-service';
import { Teacher, TeacherGroupType, TeacherGroupCategory, TeacherGroupLevel } from '@/types/teacher';

interface ImportResult {
  success: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * Import danh sách giáo viên từ file Excel
 * @param buffer Buffer của file excel
 */
export async function importTeachersFromExcel(buffer: any): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};
    
    // Ánh xạ các cột dựa trên tiêu đề (Dòng 1)
    const groupCols: { col: number; category: TeacherGroupCategory }[] = [];
    headerRow.eachCell((cell, colNumber) => {
      const header = cell.text.trim().toLowerCase();
      if (header === 'họ và tên') colMap.full_name = colNumber;
      else if (header.includes('cccd')) colMap.cccd = colNumber;
      else if (header.includes('ngày cấp')) colMap.issued_date = colNumber;
      else if (header.includes('nơi cấp')) colMap.issued_place = colNumber;
      else if (header.includes('địa chỉ')) colMap.address = colNumber;
      else if (header.includes('chức danh')) colMap.position = colNumber;
      else if (header.includes('số điện thoại')) colMap.phone = colNumber;
      else if (header.includes('email')) colMap.email = colNumber;
      else if (header.includes('đơn vị công tác')) colMap.don_vi_cong_tac = colNumber;
      
      // Phân loại nhóm (Category)
      else if (header === 'tổ' || header.includes('tổ chuyên môn')) {
        groupCols.push({ col: colNumber, category: 'department' });
      } else if (header.includes('đoàn') || header.includes('chi đoàn')) {
        groupCols.push({ col: colNumber, category: 'organization' });
      } else if (header.includes('đảng') || header.includes('chi bộ')) {
        groupCols.push({ col: colNumber, category: 'organization' });
      } else if (header.includes('nhóm') || header.includes('công đoàn')) {
        groupCols.push({ col: colNumber, category: 'organization' });
      }
    });

    // Lấy danh sách nhóm hiện có để cache
    const existingGroups = await getAllGroups();
    const groupCache = new Map(existingGroups.map(g => [`${g.category}:${g.name.toLowerCase()}`, g.id]));

    // Bắt đầu từ dòng 2
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const fullName = colMap.full_name ? row.getCell(colMap.full_name).text.trim() : '';
      
      // Nếu không có tên hoặc tên quá ngắn (ví dụ các dòng chữ ký) -> Bỏ qua
      if (!fullName || fullName.length < 2 || fullName.includes('(') || fullName.includes(':')) continue; 

      try {
        // Hàm xử lý ngày tháng an toàn
        const parseExcelDate = (cellValue: any) => {
          if (!cellValue) return undefined;
          if (cellValue instanceof Date) return cellValue.toISOString().split('T')[0];
          
          const str = String(cellValue).trim();
          // Thử parse định dạng DD/MM/YYYY
          const parts = str.split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            // Đảm bảo năm có 4 chữ số
            const fullYear = year.length === 2 ? `20${year}` : year;
            return `${fullYear}-${month}-${day}`;
          }
          
          try {
            const d = new Date(str);
            return isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0];
          } catch {
            return undefined;
          }
        };

        // 1. Tạo/Cập nhật Giáo viên
        const teacherData: Omit<Teacher, 'id' | 'created_at' | 'updated_at'> = {
          full_name: fullName,
          cccd: colMap.cccd ? row.getCell(colMap.cccd).text.trim() : undefined,
          issued_date: colMap.issued_date ? parseExcelDate(row.getCell(colMap.issued_date).value) : undefined,
          issued_place: colMap.issued_place ? row.getCell(colMap.issued_place).text.trim() : undefined,
          address: colMap.address ? row.getCell(colMap.address).text.trim() : undefined,
          position: colMap.position ? row.getCell(colMap.position).text.trim() : undefined,
          phone: colMap.phone ? row.getCell(colMap.phone).text.trim() : undefined,
          email: colMap.email ? row.getCell(colMap.email).text.trim() : undefined,
          is_active: true,
          extra_info: {
            don_vi_cong_tac: colMap.don_vi_cong_tac ? row.getCell(colMap.don_vi_cong_tac).text.trim() : ''
          }
        };

        const resultObj = await createTeacher(teacherData);
        const teacher = resultObj.data;
        const action = resultObj.action;

        if (!teacher) throw new Error('Không thể tạo giáo viên');

        result.success++;
        if (action === 'created') result.created++;
        else result.updated++;

        // 2. Xử lý nhiều loại Nhóm cùng lúc
        for (const gCol of groupCols) {
          const cellValue = row.getCell(gCol.col).text.trim();
          if (!cellValue) continue;

          const names = cellValue.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
          for (const name of names) {
            const cacheKey = `${gCol.category}:${name.toLowerCase()}`;
            let groupId = groupCache.get(cacheKey);

            if (!groupId) {
              const newGroup = await createGroup({ 
                name, 
                type: 'custom', 
                level: 'all', 
                category: gCol.category, 
                is_system: false,
                is_active: true
              });
              if (newGroup) {
                groupId = newGroup.id;
                groupCache.set(cacheKey, groupId);
              }
            }

            if (groupId) {
              await addTeacherToGroup(teacher.id, groupId);
            }
          }
        }
        if (teacher) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`Dòng ${i}: Không thể lưu vào Database.`);
        }
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Dòng ${i}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error('Lỗi importTeachersFromExcel:', err);
    result.errors.push(`Lỗi hệ thống: ${err.message}`);
  }

  return result;
}

export interface PreviewItem {
  rowIndex: number;
  full_name: string;
  cccd?: string;
  phone?: string;
  email?: string;
  position?: string;
  action: 'new' | 'update';
  selected: boolean;
}

/**
 * Quét file Excel và trả về danh sách preview (Mới / Cập nhật)
 */
export async function previewTeachersFromExcel(buffer: any): Promise<{ items: PreviewItem[]; error?: string }> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const colMap: Record<string, number> = {};

    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const h = cell.text.trim().toLowerCase();
      if (h === 'họ và tên') colMap.full_name = colNumber;
      else if (h.includes('cccd')) colMap.cccd = colNumber;
      else if (h.includes('số điện thoại')) colMap.phone = colNumber;
      else if (h.includes('email')) colMap.email = colNumber;
      else if (h.includes('chức danh')) colMap.position = colNumber;
    });

    // Lấy tất cả CCCD hiện có trong DB
    const { supabase } = await import('@/lib/supabase');
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    const db = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
    const { data: existing } = await db.from('teachers').select('cccd');
    const existingCCCDs = new Set((existing || []).map(t => t.cccd).filter(Boolean));

    const items: PreviewItem[] = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const name = colMap.full_name ? row.getCell(colMap.full_name).text.trim() : '';
      if (!name || name.length < 2 || name.includes('(') || name.includes(':')) continue;

      const cccd = colMap.cccd ? row.getCell(colMap.cccd).text.trim() : '';
      const isUpdate = cccd ? existingCCCDs.has(cccd) : false;

      items.push({
        rowIndex: i,
        full_name: name,
        cccd: cccd || undefined,
        phone: colMap.phone ? row.getCell(colMap.phone).text.trim() : undefined,
        email: colMap.email ? row.getCell(colMap.email).text.trim() : undefined,
        position: colMap.position ? row.getCell(colMap.position).text.trim() : undefined,
        action: isUpdate ? 'update' : 'new',
        selected: true,
      });
    }
    return { items };
  } catch (err: any) {
    return { items: [], error: err.message };
  }
}
