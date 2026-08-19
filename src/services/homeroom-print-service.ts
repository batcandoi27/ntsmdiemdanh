import { saveAs } from 'file-saver';
import { Student } from '@/types/models';
import { HomeroomClassSettings, HomeroomEvent, HomeroomPlan } from '@/types/homeroom';

async function downloadDocxFromServer(payload: any, filename: string) {
  const response = await fetch('/api/homeroom/export-docx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Lỗi khi tạo file Word từ máy chủ');
  }

  const blob = await response.blob();
  saveAs(blob, filename);
}

// 1. Xuất danh sách lớp
export async function exportClassListDocx(
  className: string,
  academicYear: string,
  teacherName: string,
  students: Student[],
  settings: HomeroomClassSettings
) {
  return downloadDocxFromServer({
    templateId: 'template_class_list',
    className,
    academicYear,
    teacherName,
    students,
    settings
  }, `Danh-sach-lop-${className}-${academicYear}.docx`);
}

// 2. Xuất sổ chủ nhiệm
export async function exportHomeroomHandbookDocx(
  className: string,
  academicYear: string,
  teacherName: string,
  students: Student[],
  settings: HomeroomClassSettings,
  yearlyPlan?: HomeroomPlan | null
) {
  return downloadDocxFromServer({
    templateId: 'template_handbook',
    className,
    academicYear,
    teacherName,
    students,
    settings,
    yearlyPlan
  }, `So-chu-nhiem-lop-${className}-${academicYear}.docx`);
}

// 3. Xuất phiếu liên lạc
export async function exportStudentReportDocx(
  className: string,
  student: Student,
  attendanceStats: any,
  events: HomeroomEvent[],
  teacherName: string,
  feedbackNote?: string
) {
  const studentName = (student as any).full_name || (student as any).name || 'Hoc-sinh';
  return downloadDocxFromServer({
    templateId: 'template_student_report',
    className,
    student,
    attendanceStats,
    events,
    teacherName,
    feedbackNote
  }, `Phieu-lien-lac-${studentName}-${className}.docx`);
}

// 4. Xuất biên bản sự việc
export async function exportIncidentRecordDocx(
  className: string,
  student: Student,
  event: HomeroomEvent,
  teacherName: string
) {
  const studentName = (student as any).full_name || (student as any).name || 'Hoc-sinh';
  return downloadDocxFromServer({
    templateId: 'template_incident',
    className,
    student,
    event,
    teacherName
  }, `Bien-ban-su-viec-${studentName}-${className}.docx`);
}

// 5. Xuất biên bản họp phụ huynh
export async function exportParentMeetingDocx(
  className: string,
  academicYear: string,
  teacherName: string,
  students: Student[],
  meetingTitle?: string
) {
  return downloadDocxFromServer({
    templateId: 'template_parent_meeting',
    className,
    academicYear,
    teacherName,
    students,
    meetingTitle
  }, `Bien-ban-hop-phu-huynh-${className}-${academicYear}.docx`);
}
