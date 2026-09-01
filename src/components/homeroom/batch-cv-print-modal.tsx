"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Users,
  Eye,
  Lock
} from 'lucide-react';
import { StudentCurriculumVitaeService } from '@/services/student-cv-service';
import { Student } from '@/types/models';
import { StudentCurriculumVitae, StudentCVPrintViewModel } from '@/types/student-cv';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface BatchCvPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className?: string;
  teacherName?: string;
}

export function BatchCvPrintModal({
  isOpen,
  onClose,
  classId,
  className,
  teacherName
}: BatchCvPrintModalProps) {
  const [loading, setLoading] = useState(true);
  const [studentsWithCv, setStudentsWithCv] = useState<(Student & { cv?: StudentCurriculumVitae })[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>({
    school_name: 'TRƯỜNG THCS TRẦN BỘI CƠ',
    governing_body: 'ỦY BAN NHÂN DÂN QUẬN 5',
    school_year: '2026-2027'
  });
  const [overflowCount, setOverflowCount] = useState(0);

  useEffect(() => {
    async function loadAllData() {
      if (!isOpen || !classId) return;
      setLoading(true);
      try {
        const [cvRes, schoolRes] = await Promise.all([
          StudentCurriculumVitaeService.getClassCurriculumVitaeList(classId),
          StudentCurriculumVitaeService.getSchoolProfile()
        ]);

        setStudentsWithCv(cvRes.list);
        setSchoolProfile(schoolRes);
      } catch (err) {
        console.error('Error loading batch print data:', err);
        toast.error('Lỗi tải dữ liệu in ấn cả lớp');
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, [isOpen, classId]);

  if (!isOpen) return null;

  const totalStudents = studentsWithCv.length;
  const expectedPages = totalStudents * 2;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      {/* ACTION BAR (Ẩn khi in ấn qua CSS @media print) */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200 print:hidden sticky top-2 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Bản In Sơ Yếu Lý Lịch Toàn Bộ Lớp {className}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Sĩ số: <b className="text-blue-700">{totalStudents} học sinh</b> • Tổng số trang in vật lý: <b className="text-emerald-700">{expectedPages} trang A4</b> (2 trang/em)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || totalStudents === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>In Ngay / Xuất PDF ({expectedPages} trang)</span>
          </button>
        </div>
      </div>

      {/* PRINT CONTAINER (Được tối ưu chuẩn CSS @media print A4 2 trang/học sinh) */}
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl p-6 sm:p-10 border border-slate-200 print:p-0 print:border-none print:shadow-none print:w-full">
        {loading ? (
          <div className="py-24 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">Đang tải và chuẩn bị dữ liệu 86 trang in...</p>
          </div>
        ) : (
          <div className="space-y-12 print:space-y-0">
            {studentsWithCv.map((st, sIdx) => {
              const cv = st.cv?.profile_data;
              const studentName = (cv?.full_name_upper || st.fullName || (st as any).full_name || '').toUpperCase();
              const gender = cv?.gender || st.gender || 'Nam';
              const birthParts = (st.birthday || '').split(/[-/]/);
              const birthDay = cv?.birth_day || birthParts[0] || '...';
              const birthMonth = cv?.birth_month || birthParts[1] || '...';
              const birthYear = cv?.birth_year || birthParts[2] || '.....';
              const stt = String(st.order || sIdx + 1);

              return (
                <div key={st.id} className="student-print-unit" style={{ pageBreakAfter: 'always' }}>
                  {/* ==================== TRANG 1 ==================== */}
                  <div className="cv-page page-1 min-h-[297mm] p-[15mm_15mm_15mm_25mm] relative box-border font-serif text-[13pt] leading-[1.35] text-slate-900 border-b-2 border-dashed border-slate-300 print:border-none print:p-[15mm_15mm_15mm_25mm]">
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-2 border-b-2 border-[#1B365D] pb-2">
                      <div>
                        <div className="font-bold text-[14pt] text-[#1B365D] uppercase tracking-wide">
                          {schoolProfile.school_name}
                        </div>
                        <div className="text-[18pt] font-bold text-[#1B365D] text-center my-1">
                          SƠ YẾU LÝ LỊCH HỌC SINH
                        </div>
                        <div className="text-center text-[13pt] font-bold">
                          Lớp: <b className="text-blue-700">{className}</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NH: <b>{schoolProfile.school_year}</b>
                        </div>
                        <div className="text-[13pt] font-bold text-[#1B365D] mt-1">
                          GVCN: <span className="font-normal text-slate-800">{teacherName || 'Giáo viên chủ nhiệm'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="border-2 border-[#1B365D] bg-[#F0F4F8] rounded-lg w-14 h-12 flex flex-col items-center justify-center font-bold">
                          <div className="text-[10pt] text-[#1B365D]">STT</div>
                          <div className="text-[16pt] text-red-600">{stt}</div>
                        </div>
                        <div className="border border-dashed border-[#1B365D] w-14 h-16 flex items-center justify-center text-[10pt] text-slate-400 text-center">
                          Ảnh<br />3x4
                        </div>
                      </div>
                    </div>

                    {/* Section I */}
                    <div className="font-bold text-[14pt] text-[#1B365D] mt-2 mb-1">
                      I. BẢN THÂN: <span className="text-[11pt] italic font-normal text-slate-500">(Khai khớp với giấy khai sinh và CCCD)</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">1. Họ tên HS (chữ IN HOA):</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 font-bold uppercase text-[#1B365D] px-1">{studentName}</span>
                        <span className="font-bold text-[#1B365D] ml-3 mr-1">Nam/Nữ:</span>
                        <span className="w-14 text-center border-b border-dotted border-blue-300 px-1">{gender}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">2. Ngày sinh:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{birthDay} tháng {birthMonth} năm {birthYear}</span>
                        <span className="font-bold text-[#1B365D] ml-3 mr-1">Là con thứ:</span>
                        <span className="w-12 text-center border-b border-dotted border-blue-300 px-1">{cv?.birth_order || '1'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">3. Dân tộc:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.ethnicity || 'Kinh'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Quốc tịch:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.nationality || 'Việt Nam'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Tôn giáo:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.religion || 'Không'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">4. Số CCCD:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 font-bold font-mono px-1">{cv?.citizen_id || '................................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Ngày cấp:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.citizen_id_issue_date || '................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Nơi cấp:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.citizen_id_issue_place || '................'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-normal text-slate-600 whitespace-nowrap mr-1 ml-3">Mã định danh cá nhân (nếu chưa có CCCD):</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 font-mono px-1">{cv?.personal_id_code || '........................................................'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">5. Nơi sinh (Bệnh viện, trạm y tế):</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.birth_place_hospital || '........................................................'}</span>
                      </div>
                      <div className="flex baseline ml-3">
                        <span className="font-bold text-[#1B365D] mr-1">Xã/Phường:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.birth_place_ward || '................'}</span>
                        <span className="font-bold text-[#1B365D] ml-3 mr-1">Tỉnh/TP:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.birth_place_province || 'TP. Hồ Chí Minh'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">8. Nơi thường trú (Số nhà + đường):</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.permanent_residence?.street_address || '................................................................................'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">9. Chỗ ở hiện nay:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.current_residence?.street_address || cv?.permanent_residence?.street_address || '................................................................................'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">11. Hiện đang ở với ai:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.living_with || 'Cha và Mẹ'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">12. Người trực tiếp quản lý HS:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.direct_guardian?.full_name || cv?.father?.full_name || '................................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Quan hệ:</span>
                        <span className="w-20 border-b border-dotted border-blue-300 px-1">{cv?.direct_guardian?.relationship || 'Cha ruột'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">SĐT:</span>
                        <span className="w-32 border-b border-dotted border-blue-300 font-bold text-blue-700 px-1">{cv?.direct_guardian?.phone || cv?.father?.phone_numbers || '................'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">14. Vấn đề sức khỏe cần lưu ý:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 text-red-600 px-1">{cv?.health_notes || 'Bình thường'}</span>
                      </div>

                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">16. Mã số BHYT:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 font-bold font-mono px-1">{cv?.health_insurance_code || '................................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Nơi KCB:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.health_insurance_hospital || '................................'}</span>
                      </div>
                    </div>

                    {/* Section II */}
                    <div className="font-bold text-[14pt] text-[#1B365D] mt-3 mb-1">
                      II. GIA ĐÌNH:
                    </div>

                    <div className="space-y-1">
                      <div className="flex baseline">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">1. Họ tên cha:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 font-bold px-1">{cv?.father?.full_name || '........................................................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Năm sinh:</span>
                        <span className="w-16 border-b border-dotted border-blue-300 text-center px-1">{cv?.father?.birth_year || '........'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">SĐT:</span>
                        <span className="w-32 border-b border-dotted border-blue-300 font-bold text-blue-700 px-1">{cv?.father?.phone_numbers || '................'}</span>
                      </div>
                      <div className="flex baseline ml-3">
                        <span className="font-bold text-[#1B365D] mr-1">Nghề nghiệp:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.father?.job || '................................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Nơi làm việc:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.father?.workplace || '................................'}</span>
                      </div>

                      <div className="flex baseline mt-1">
                        <span className="font-bold text-[#1B365D] whitespace-nowrap mr-1">2. Họ tên mẹ:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 font-bold px-1">{cv?.mother?.full_name || '........................................................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Năm sinh:</span>
                        <span className="w-16 border-b border-dotted border-blue-300 text-center px-1">{cv?.mother?.birth_year || '........'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">SĐT:</span>
                        <span className="w-32 border-b border-dotted border-blue-300 font-bold text-blue-700 px-1">{cv?.mother?.phone_numbers || '................'}</span>
                      </div>
                      <div className="flex baseline ml-3">
                        <span className="font-bold text-[#1B365D] mr-1">Nghề nghiệp:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.mother?.job || '................................'}</span>
                        <span className="font-bold text-[#1B365D] ml-2 mr-1">Nơi làm việc:</span>
                        <span className="flex-1 border-b border-dotted border-blue-300 px-1">{cv?.mother?.workplace || '................................'}</span>
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-6 text-[10pt] italic text-slate-400">
                      Trang 1 / 2
                    </div>
                  </div>

                  {/* ==================== TRANG 2 ==================== */}
                  <div className="cv-page page-2 min-h-[297mm] p-[15mm_15mm_15mm_25mm] relative box-border font-serif text-[13pt] leading-[1.35] text-slate-900 print:p-[15mm_15mm_15mm_25mm]">
                    <div className="font-bold text-[13pt] text-[#1B365D] mb-1">
                      4. Họ và tên anh, chị, em ruột:
                    </div>

                    <table className="w-full border-collapse border border-[#93C5FD] text-[12pt] mb-3">
                      <thead>
                        <tr className="bg-[#1B365D] text-white">
                          <th className="border border-[#93C5FD] p-1.5 text-center w-10">STT</th>
                          <th className="border border-[#93C5FD] p-1.5 text-left">Họ và tên anh, chị, em ruột</th>
                          <th className="border border-[#93C5FD] p-1.5 text-center w-24">Năm sinh</th>
                          <th className="border border-[#93C5FD] p-1.5 text-left">Nghề nghiệp / Trường lớp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[0, 1, 2, 3, 4].map((i) => {
                          const s = cv?.siblings?.[i];
                          return (
                            <tr key={i} className={i % 2 === 1 ? 'bg-[#F0F4F8]' : ''}>
                              <td className="border border-[#93C5FD] p-1.5 text-center font-bold text-[#1B365D]">{i + 1}/</td>
                              <td className="border border-[#93C5FD] p-1.5">{s?.full_name || '........................................................'}</td>
                              <td className="border border-[#93C5FD] p-1.5 text-center">{s?.birth_year || '...........'}</td>
                              <td className="border border-[#93C5FD] p-1.5">{s?.job_or_school || '........................................................'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="font-bold text-[14pt] text-[#1B365D] text-center my-3 uppercase tracking-wide">
                      PHẦN THAM KHẢO Ý KIẾN PHỤ HUYNH HỌC SINH
                    </div>

                    <div className="font-bold text-[13pt] text-[#1B365D] mb-1">
                      1. Đánh dấu [X] vào những ô phù hợp với tính cách của HS:
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[12pt] mb-3">
                      {[
                        { k: 'kien_nhan', l: 'Kiên nhẫn, chịu khó' },
                        { k: 'hoa_dong', l: 'Hòa đồng, cởi mở' },
                        { k: 'nong_tinh', l: 'Nóng tính' },
                        { k: 'nhay_cam', l: 'Nhạy cảm, Rụt rè' },
                        { k: 'le_phep', l: 'Lễ phép, chừng mực' },
                        { k: 'quan_tam', l: 'Quan tâm người khác' },
                        { k: 'trung_thuc', l: 'Trung thực' },
                        { k: 'huong_ngoai', l: 'Hướng ngoại' },
                        { k: 'huong_noi', l: 'Hướng nội' },
                        { k: 'sang_tao', l: 'Sáng tạo, mơ mộng' },
                        { k: 'thu_dong', l: 'Thụ động, thờ ơ' },
                        { k: 'vo_tu', l: 'Vô tư, hài hước' },
                        { k: 'canh_tranh', l: 'Cạnh tranh, cầu toàn' },
                        { k: 'noi_loan', l: 'Nổi loạn, chống đối' },
                        { k: 'lanh_dao', l: 'Lãnh đạo, ảnh hưởng' },
                        { k: 'other_traits', l: cv?.personalities?.other_traits ? `Khác: ${cv.personalities.other_traits}` : 'Khác: .................' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border border-[#1B365D] text-[10pt] font-bold flex items-center justify-center">
                            {(item.k === 'other_traits' && cv?.personalities?.other_traits) || (cv?.personalities as any)?.[item.k] ? 'X' : ''}
                          </span>
                          <span className="truncate">{item.l}</span>
                        </div>
                      ))}
                    </div>

                    <div className="font-bold text-[13pt] text-[#1B365D] mb-1">
                      2. Hoàn cảnh đặc biệt của gia đình có thể ảnh hưởng đến việc học tập của HS:
                    </div>
                    <div className="p-2 bg-[#F0F4F8] border-l-4 border-[#1B365D] text-[12pt] italic mb-3 min-h-[40px]">
                      {cv?.special_family_circumstances || 'Gia đình nề nếp, cha mẹ luôn phối hợp chặt chẽ cùng nhà trường.'}
                    </div>

                    <div className="flex baseline mb-3">
                      <span className="font-bold text-[#1B365D] mr-1">3. Chữ ký mẫu và khi cần sẽ liên lạc với:</span>
                      <span className="flex-1 border-b border-dotted border-blue-300 font-bold text-blue-800 px-1">
                        {cv?.primary_contact_person === 'father' ? 'Cha' : cv?.primary_contact_person === 'mother' ? 'Mẹ' : 'Giám hộ'} ({cv?.direct_guardian?.phone || cv?.father?.phone_numbers})
                      </span>
                    </div>

                    {/* Signature 3 Boxes */}
                    <div className="grid grid-cols-3 border border-[#1B365D] text-center mt-3 rounded overflow-hidden">
                      <div className="border-r border-[#1B365D] p-3 flex flex-col justify-between h-28">
                        <div>
                          <b className="text-[#1B365D]">CHA</b>
                          <div className="text-[10pt] italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="font-bold text-slate-900">{cv?.father?.full_name}</div>
                      </div>
                      <div className="border-r border-[#1B365D] p-3 flex flex-col justify-between h-28">
                        <div>
                          <b className="text-[#1B365D]">MẸ</b>
                          <div className="text-[10pt] italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="font-bold text-slate-900">{cv?.mother?.full_name}</div>
                      </div>
                      <div className="p-3 flex flex-col justify-between h-28">
                        <div>
                          <b className="text-[#1B365D]">Người giám hộ</b>
                          <div className="text-[10pt] italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="italic text-slate-400">(Nếu có)</div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-6 text-[10pt] italic text-slate-400">
                      Trang 2 / 2
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
