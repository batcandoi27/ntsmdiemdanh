// ============================================================================
// SEAT LAYOUT EDITOR - PRINT PREVIEW MODAL (STANDALONE ARCHITECTURE)
// Clean Standalone Print Engine - 100% Khóa Đúng 1 Trang A4 Landscape Duy Nhất
// ============================================================================

import React, { useRef, useMemo } from 'react';
import { ClassroomLayout, TableDef, ID } from '../domain/types';
import { ROLE_OPTIONS } from './seat-context-menu';
import { formatOptimalStudentName, buildTwoWordNameCountMap } from '../domain/name-formatter';
import { getAutoTheme } from '@/design-system/tokens/auto-themes';
import { Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: ClassroomLayout;
  className?: string;
  teacherName?: string;
  totalStudents?: number;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  layout,
  className = '',
  teacherName = 'Giáo viên chủ nhiệm',
  totalStudents = 0
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const { tables, seats, assignments, boardPosition = 'top', teacherDeskSide = 'right' } = layout;

  // Gom các bàn theo Dãy (row)
  const rowsGrouped = useMemo(() => {
    const map = new Map<number, TableDef[]>();
    for (const table of Object.values(tables)) {
      const list = map.get(table.row) || [];
      list.push(table);
      map.set(table.row, list);
    }
    return Array.from(map.entries())
      .sort(([rowA], [rowB]) => rowA - rowB)
      .map(([row, tableList]) => ({
        row,
        tables: tableList.sort((a, b) => a.col - b.col)
      }));
  }, [tables]);

  // Bản đồ đếm tên 2 từ trong lớp để phát hiện trùng lặp
  const twoWordMap = useMemo(() => {
    const allNames = Object.values(assignments).map(a => a.studentName);
    return buildTwoWordNameCountMap(allNames);
  }, [assignments]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // STANDALONE PRINT DISPATCHER
  // Hoàn toàn không sao chép CSS cha, tạo document in độc lập kích thước 297x210mm
  // --------------------------------------------------------------------------
  const handlePrint = async () => {
    const printContent = printRef.current;
    if (!printContent) return;

    let iframe = document.getElementById('seat-layout-standalone-print-frame') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'seat-layout-standalone-print-frame';
      // Đặt iframe ở offscreen có hình học thực tế 297mm x 210mm, KHÔNG dùng visibility: hidden hay 0x0
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = '297mm';
      iframe.style.height = '210mm';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // CSS In Độc Lập Chuyên Biệt - Triệt tiêu 100% rò rỉ CSS cha
    const standalonePrintCSS = `
      @page {
        size: A4 landscape;
        margin: 0;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        width: 297mm !important;
        height: 210mm !important;
        max-width: 297mm !important;
        max-height: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #0f172a;
      }
      .print-page-wrapper {
        width: 297mm !important;
        height: 210mm !important;
        max-width: 297mm !important;
        max-height: 210mm !important;
        padding: 5mm 6mm !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
        background: #ffffff !important;
        break-inside: avoid-page !important;
        break-after: avoid-page !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #1e1b4b;
        padding-bottom: 3px;
        flex-shrink: 0;
      }
      .school-name {
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        color: #1e1b4b;
        letter-spacing: 0.5px;
      }
      .class-badge {
        display: inline-block;
        background: #e0e7ff;
        color: #312e81;
        font-weight: 900;
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 4px;
        border: 1px solid #c7d2fe;
        margin-left: 4px;
      }
      .doc-title {
        font-size: 14px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #020617;
        text-align: center;
      }
      .doc-title-bar {
        width: 50px;
        height: 2px;
        background: #4f46e5;
        margin: 2px auto 0;
        border-radius: 2px;
      }
      .school-year {
        font-size: 10.5px;
        font-weight: 700;
        text-transform: uppercase;
        color: #334155;
        text-align: right;
      }
      .count-badge {
        display: inline-block;
        background: #d1fae5;
        color: #064e3b;
        font-weight: 900;
        font-size: 10.5px;
        padding: 1px 6px;
        border-radius: 4px;
        border: 1px solid #a7f3d0;
        margin-left: 4px;
      }
      .board-section {
        display: grid;
        grid-template-columns: 3fr 6fr 3fr;
        gap: 8px;
        align-items: center;
        font-size: 11px;
        font-weight: 900;
        margin: 3px 0;
        flex-shrink: 0;
      }
      .board-door {
        background: #e0f2fe;
        color: #082f49;
        padding: 4px 8px;
        border-radius: 8px;
        border: 2px solid #7dd3fc;
        text-align: center;
        text-transform: uppercase;
      }
      .board-teacher {
        background: #fef3c7;
        color: #451a03;
        padding: 4px 8px;
        border-radius: 8px;
        border: 2px solid #fcd34d;
        text-align: center;
        text-transform: uppercase;
      }
      .board-main {
        background: #064e3b;
        color: #ffffff;
        padding: 5px 12px;
        border-radius: 8px;
        border: 2px solid #022c22;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-size: 13px;
        font-weight: 900;
      }
      .groups-container {
        display: flex;
        align-items: stretch;
        gap: 8px;
        flex: 1;
        margin: 3px 0;
        min-height: 0;
        overflow: hidden;
      }
      .group-card {
        flex: 1;
        border-radius: 12px;
        padding: 6px;
        border: 2px solid #cbd5e1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 4px;
        height: 100%;
      }
      .group-header {
        text-align: center;
        font-weight: 900;
        font-size: 11.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid;
        padding-bottom: 2px;
      }
      .group-tables-list {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 3px;
        flex: 1;
      }
      .table-box {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 2px;
        background: #ffffff;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 38px;
      }
      .table-seats-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3px;
        height: 100%;
      }
      .table-seats-grid-1 {
        display: grid;
        grid-template-columns: 1fr;
        gap: 3px;
        height: 100%;
      }
      .seat-box {
        border-radius: 6px;
        padding: 2px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        min-height: 34px;
      }
      .seat-female {
        background: #fff1f2;
        border: 1px solid #fecdd3;
      }
      .seat-male {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
      }
      .seat-empty {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
      }
      .gender-icon {
        font-size: 11px;
        line-height: 1;
      }
      .student-name-2words {
        font-size: 11.5px;
        font-weight: 900;
        color: #020617;
        line-height: 1.15;
        text-align: center;
        word-break: break-word;
      }
      .role-badge {
        font-size: 8px;
        font-weight: 900;
        padding: 1px 4px;
        border-radius: 4px;
        border: 1px solid;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .divider-line {
        width: 1px;
        border-right: 1px dashed #cbd5e1;
        align-self: stretch;
        margin: 2px 0;
        flex-shrink: 0;
      }
      .footer-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 9.5px;
        color: #475569;
        border-top: 1px solid #e2e8f0;
        padding-top: 2px;
        flex-shrink: 0;
      }
      .footer-teacher {
        font-weight: 900;
        text-transform: uppercase;
        color: #0f172a;
      }
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Sơ Đồ Chỗ Ngồi - ${className ? `Lớp ${className}` : 'THCS Trần Bội Cơ'}</title>
        <style>${standalonePrintCSS}</style>
      </head>
      <body>
        <div class="print-page-wrapper">
          <!-- 1. Header -->
          <div class="header-row">
            <div>
              <p class="school-name">TRƯỜNG THCS TRẦN BỘI CƠ</p>
              <div style="margin-top: 1px;">
                <span style="font-size: 10.5px; font-weight: bold; color: #475569;">Lớp:</span>
                <span class="class-badge">${className ? `Lớp ${className}` : '6A4'}</span>
              </div>
            </div>

            <div>
              <h2 class="doc-title">SƠ ĐỒ CHỖ NGỒI HỌC SINH</h2>
              <div class="doc-title-bar"></div>
            </div>

            <div style="text-align: right;">
              <p class="school-year">NĂM HỌC 2025 - 2026</p>
              <div style="margin-top: 1px;">
                <span style="font-size: 10.5px; font-weight: bold; color: #475569;">Sĩ số:</span>
                <span class="count-badge">${totalStudents || Object.keys(assignments).length} học sinh</span>
              </div>
            </div>
          </div>

          <!-- 2. Bảng Lớp Học (nếu ở trên) -->
          ${boardPosition === 'top' ? `
            <div class="board-section">
              ${teacherDeskSide === 'right' 
                ? '<div class="board-door">🚪 CỬA LỚP ➔</div>' 
                : '<div class="board-teacher">👩‍🏫 BÀN GIÁO VIÊN</div>'
              }
              <div class="board-main">BẢNG LỚP HỌC</div>
              ${teacherDeskSide === 'right' 
                ? '<div class="board-teacher">👩‍🏫 BÀN GIÁO VIÊN</div>' 
                : '<div class="board-door">🚪 CỬA LỚP ➔</div>'
              }
            </div>
          ` : ''}

          <!-- 3. Sơ đồ các Tổ -->
          <div class="groups-container">
            ${rowsGrouped.map(({ row, tables: rowTables }, idx) => {
              const hexTheme = [
                { bg: '#fff1f2', border: '#fda4af', text: '#881337' },
                { bg: '#f0f9ff', border: '#7dd3fc', text: '#082f49' },
                { bg: '#ecfdf5', border: '#6ee7b7', text: '#064e3b' },
                { bg: '#fffbeb', border: '#fcd34d', text: '#78350f' },
                { bg: '#faf5ff', border: '#d8b4fe', text: '#581c87' },
                { bg: '#f0fdfa', border: '#5eead4', text: '#134e4a' },
                { bg: '#fff7ed', border: '#fdba74', text: '#7c2d12' },
                { bg: '#eef2ff', border: '#a5b4fc', text: '#312e81' },
              ][(row - 1) % 8];
              const isLast = idx === rowsGrouped.length - 1;

              return `
                <div class="group-card" style="background-color: ${hexTheme.bg}; border-color: ${hexTheme.border};">
                  <div class="group-header" style="color: ${hexTheme.text}; border-color: ${hexTheme.border};">
                    TỔ ${row}
                  </div>

                  <div class="group-tables-list">
                    ${rowTables.map((table) => {
                      const tableSeats = table.seatIds.map(id => seats[id]).filter(Boolean);
                      return `
                        <div class="table-box">
                          <div class="${table.seatsCount === 1 ? 'table-seats-grid-1' : 'table-seats-grid-2'}">
                            ${tableSeats.map((seat) => {
                              const assign = assignments[seat.id];
                              if (!assign) {
                                return `
                                  <div class="seat-box seat-empty">
                                    <span style="font-size: 8.5px; font-weight: bold; color: #94a3b8; font-style: italic; margin: auto;">(Trống)</span>
                                  </div>
                                `;
                              }

                              const isFemale = assign.gender === 'female' || assign.gender === 'Nữ';
                              const roleInfo = assign.role ? ROLE_OPTIONS.find(r => r.role === assign.role) : null;
                              const displayName = formatOptimalStudentName(assign.studentName, twoWordMap);

                              let roleHtml = '<div style="height: 1px;"></div>';
                              if (roleInfo && roleInfo.role !== 'none') {
                                roleHtml = `
                                  <div class="role-badge" style="background-color: #fef3c7; color: #78350f; border-color: #fcd34d;">
                                    ${roleInfo.icon} ${roleInfo.label}
                                  </div>
                                `;
                              }

                              return `
                                <div class="seat-box ${isFemale ? 'seat-female' : 'seat-male'}">
                                  <span class="gender-icon">${isFemale ? '👧' : '👦'}</span>
                                  <span class="student-name-2words" title="${assign.studentName}">${displayName}</span>
                                  ${roleHtml}
                                </div>
                              `;
                            }).join('')}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>

                ${!isLast ? '<div class="divider-line"></div>' : ''}
              `;
            }).join('')}
          </div>

          <!-- 4. Bảng Lớp Học (nếu ở dưới) -->
          ${boardPosition === 'bottom' ? `
            <div class="board-section">
              ${teacherDeskSide === 'right' 
                ? '<div class="board-door">🚪 CỬA LỚP ➔</div>' 
                : '<div class="board-teacher">👩‍🏫 BÀN GIÁO VIÊN</div>'
              }
              <div class="board-main">BẢNG LỚP HỌC</div>
              ${teacherDeskSide === 'right' 
                ? '<div class="board-teacher">👩‍🏫 BÀN GIÁO VIÊN</div>' 
                : '<div class="board-door">🚪 CỬA LỚP ➔</div>'
              }
            </div>
          ` : ''}

          <!-- 5. Chân trang -->
          <div class="footer-row">
            <div>
              <p style="font-style: italic;">* Sơ đồ chỗ ngồi áp dụng chính thức trong năm học.</p>
            </div>
            <div>
              <span style="font-style: italic;">${todayStr} — </span>
              <span class="footer-teacher">GVCN: ${teacherName}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Đồng bộ font & layout trước khi gọi print
    try {
      if (doc.fonts) {
        await doc.fonts.ready;
      }
    } catch (_) {}

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      });
    });
  };

  const todayStr = format(new Date(), "'Ngày' dd 'tháng' MM 'năm' yyyy", { locale: vi });

  // Khối Bảng Lớp Học trên Modal màn hình
  const BoardSectionModal = (
    <div className="grid grid-cols-12 gap-2 items-center text-xs font-black select-none my-0.5 shrink-0">
      {teacherDeskSide === 'right' ? (
        <div className="col-span-3 py-1 px-3 bg-sky-100 text-sky-950 rounded-xl border-2 border-sky-300 text-center uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs">
          <span>🚪 CỬA LỚP ➔</span>
        </div>
      ) : (
        <div className="col-span-3 py-1 px-3 bg-amber-100 text-amber-950 rounded-xl border-2 border-amber-300 text-center uppercase tracking-wider font-black shadow-2xs">
          <span>👩‍🏫 BÀN GIÁO VIÊN</span>
        </div>
      )}

      <div className="col-span-6 py-1.5 px-4 bg-emerald-900 text-white rounded-xl uppercase tracking-widest text-center border-2 border-emerald-950 font-black text-sm shadow-sm">
        BẢNG LỚP HỌC
      </div>

      {teacherDeskSide === 'right' ? (
        <div className="col-span-3 py-1 px-3 bg-amber-100 text-amber-950 rounded-xl border-2 border-amber-300 text-center uppercase tracking-wider font-black shadow-2xs">
          <span>👩‍🏫 BÀN GIÁO VIÊN</span>
        </div>
      ) : (
        <div className="col-span-3 py-1 px-3 bg-sky-100 text-sky-950 rounded-xl border-2 border-sky-300 text-center uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs">
          <span>🚪 CỬA LỚP ➔</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl p-5 space-y-3 animate-in zoom-in-95 my-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                Xem Trước & In Sơ Đồ Chỗ Ngồi (A4 Nằm Ngang)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Kiến trúc in Standalone - Đảm bảo chính xác 1 trang A4 duy nhất
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay / Xuất PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Khung tài liệu A4 xem trước trên màn hình */}
        <div
          ref={printRef}
          className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs text-slate-900 font-sans flex flex-col justify-between h-[670px] max-h-[88vh]"
        >
          {/* 1. Header */}
          <div className="flex items-center justify-between border-b-2 border-indigo-950 pb-1 leading-tight shrink-0">
            <div>
              <p className="font-black text-xs uppercase tracking-wider text-indigo-950">
                TRƯỜNG THCS TRẦN BỘI CƠ
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-600 font-bold">Lớp:</span>
                <span className="px-2 py-0.2 rounded-md bg-indigo-100 text-indigo-900 font-black text-[11px] border border-indigo-200">
                  {className ? `Lớp ${className}` : '6A4'}
                </span>
              </div>
            </div>

            <div className="text-center space-y-0.5">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-950">
                SƠ ĐỒ CHỖ NGỒI HỌC SINH
              </h2>
              <div className="w-16 h-0.5 bg-indigo-600 mx-auto rounded-full" />
            </div>

            <div className="text-right">
              <p className="font-bold text-[10.5px] uppercase text-slate-700">
                NĂM HỌC 2025 - 2026
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[10.5px] text-slate-600 font-bold">Sĩ số:</span>
                <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-950 font-black text-[10.5px] border border-emerald-300">
                  {totalStudents || Object.keys(assignments).length} học sinh
                </span>
              </div>
            </div>
          </div>

          {/* 2. BẢNG LỚP HỌC (Nếu thiết kế ở trên thì xem ở trên) */}
          {boardPosition === 'top' && BoardSectionModal}

          {/* 3. Sơ đồ các cột Tổ */}
          <div className="flex items-stretch gap-2.5 my-auto flex-1 py-1 min-h-0">
            {rowsGrouped.map(({ row, tables: rowTables }, idx) => {
              const theme = getAutoTheme((row - 1) % 8);
              const isLast = idx === rowsGrouped.length - 1;

              return (
                <React.Fragment key={row}>
                  <div className={`flex-1 rounded-2xl p-2 border-2 ${theme.border} ${theme.bg} flex flex-col justify-between space-y-1 h-full shadow-2xs`}>
                    <div className={`text-center font-black text-xs uppercase ${theme.titleColor} border-b-2 ${theme.border} pb-0.5 tracking-wider`}>
                      TỔ {row}
                    </div>

                    <div className="flex-1 flex flex-col justify-between gap-1">
                      {rowTables.map((table) => {
                        const tableSeats = table.seatIds.map(id => seats[id]).filter(Boolean);
                        return (
                          <div
                            key={table.id}
                            className="border border-slate-300/80 rounded-xl p-1 bg-white flex-1 flex flex-col justify-center min-h-[42px] shadow-2xs"
                          >
                            <div className={`grid gap-1 h-full ${table.seatsCount === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {tableSeats.map((seat) => {
                                const assign = assignments[seat.id];
                                const isFemale = assign?.gender === 'female' || assign?.gender === 'Nữ';
                                const roleInfo = assign?.role ? ROLE_OPTIONS.find(r => r.role === assign.role) : null;
                                const displayName = assign ? formatOptimalStudentName(assign.studentName, twoWordMap) : '';

                                return (
                                  <div
                                    key={seat.id}
                                    className={`border rounded-lg p-1 text-center flex flex-col items-center justify-between min-h-[38px] ${
                                      assign
                                        ? isFemale
                                          ? "bg-rose-50/95 border-rose-200"
                                          : "bg-sky-50/95 border-sky-200"
                                        : "bg-white/80 border-slate-200 border-dashed"
                                    }`}
                                  >
                                    {assign ? (
                                      <div className="w-full flex flex-col items-center justify-between h-full space-y-0.5">
                                        <span className="text-[11px] leading-none select-none">
                                          {isFemale ? '👧' : '👦'}
                                        </span>

                                        <span
                                          className="font-black text-xs text-slate-950 leading-tight tracking-tight line-clamp-2 px-0.5 w-full text-center"
                                          title={assign.studentName}
                                        >
                                          {displayName}
                                        </span>

                                        {roleInfo && roleInfo.role !== 'none' ? (
                                          <div className={`text-[8px] font-black px-1.5 py-0.2 rounded border leading-tight truncate max-w-full ${roleInfo.badgeClass}`}>
                                            <span>{roleInfo.icon}</span> <span>{roleInfo.label}</span>
                                          </div>
                                        ) : (
                                          <div className="h-0.5" />
                                        )}
                                      </div>
                                    ) : (
                                      <div className="my-auto">
                                        <span className="text-[9px] font-bold text-slate-300 italic">(Trống)</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!isLast && (
                    <div className="self-stretch w-px bg-slate-300/80 border-r border-dashed border-slate-300 my-1 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* 4. BẢNG LỚP HỌC (Nếu thiết kế ở dưới thì xem ở dưới) */}
          {boardPosition === 'bottom' && BoardSectionModal}

          {/* 5. Chân trang */}
          <div className="pt-1 flex justify-between items-end text-[10px] text-slate-600 border-t border-slate-200 shrink-0">
            <div>
              <p className="italic">* Sơ đồ chỗ ngồi áp dụng chính thức trong năm học.</p>
            </div>
            <div className="text-right">
              <span className="italic">{todayStr} — </span>
              <span className="font-black uppercase text-slate-900">GVCN: {teacherName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
