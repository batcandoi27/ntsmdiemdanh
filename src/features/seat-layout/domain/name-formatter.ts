// ============================================================================
// SEAT LAYOUT EDITOR - VIETNAMESE NAME FORMATTER & SORTER
// Chuẩn hóa tên 2 từ sư phạm tối ưu & Phân biệt trùng tên bằng viết tắt họ đệm
// ============================================================================

import { EditorStudent } from './types';

/**
 * Trích xuất 2 từ cuối của tên (Đệm cuối + Tên chính)
 * VD: "Đặng Hoàng Gia Bảo" -> "Gia Bảo", "Tạ Quỳnh Anh" -> "Quỳnh Anh"
 */
export function getTwoWordName(fullName: string): string {
  if (!fullName) return '';
  const words = fullName.trim().split(/\s+/);
  if (words.length <= 2) return fullName.trim();
  return `${words[words.length - 2]} ${words[words.length - 1]}`;
}

/**
 * Tạo danh sách kiểm tra trùng tên 2 từ trong lớp
 */
export function buildTwoWordNameCountMap(studentNames: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const name of studentNames) {
    const twoWord = getTwoWordName(name).toLowerCase();
    map.set(twoWord, (map.get(twoWord) || 0) + 1);
  }
  return map;
}

/**
 * Định dạng tên học sinh hiển thị to rõ nhất có thể:
 * - Ưu tiên tên 2 từ (VD: "Đặng Hoàng Gia Bảo" -> "Gia Bảo", "Lê Quế Như" -> "Quế Như")
 * - Nếu trong lớp có học sinh TRÙNG tên 2 từ: Viết tắt các từ họ đệm đầu + 2 từ tên chính
 *   VD: "Lê Thị Hạnh Nguyên" -> "L. T. Hạnh Nguyên", "Trần Lê Vân Anh" -> "T. L. Vân Anh"
 */
export function formatOptimalStudentName(
  fullName: string,
  classStudentNames?: string[] | Set<string> | Map<string, number>
): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const words = trimmed.split(/\s+/);

  if (words.length <= 2) return trimmed;

  const twoWord = `${words[words.length - 2]} ${words[words.length - 1]}`;

  // Kiểm tra xem có bị trùng với học sinh khác trong lớp không
  let isDuplicate = false;
  if (classStudentNames) {
    if (classStudentNames instanceof Map) {
      isDuplicate = (classStudentNames.get(twoWord.toLowerCase()) || 0) > 1;
    } else if (Array.isArray(classStudentNames)) {
      const count = classStudentNames.filter(n => getTwoWordName(n).toLowerCase() === twoWord.toLowerCase()).length;
      isDuplicate = count > 1;
    }
  }

  // Nếu không trùng: Trả về tên 2 từ để chữ to và rõ nhất!
  if (!isDuplicate) {
    return twoWord;
  }

  // Nếu trùng: Viết tắt họ đệm đầu + 2 từ tên chính (VD: "L. T. Hạnh Nguyên")
  const leadingInitials = words
    .slice(0, -2)
    .map(w => `${w.charAt(0).toUpperCase()}.`)
    .join(' ');

  return `${leadingInitials} ${twoWord}`;
}

/**
 * Viết tắt họ và đệm thông thường: "Nguyễn Đăng Khánh" -> "N. Đ. Khánh"
 */
export function formatShortStudentName(fullName: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const words = trimmed.split(/\s+/);

  if (words.length <= 2) return trimmed;

  const lastName = words[words.length - 1];
  const initials = words.slice(0, -1).map(w => `${w.charAt(0).toUpperCase()}.`).join(' ');

  return `${initials} ${lastName}`;
}

/**
 * Trích xuất khóa sắp xếp tiếng Việt:
 * Đặt tên chính (First name) lên đầu để sắp xếp chuẩn A-Z theo quy chế Bộ GD&ĐT
 */
export function getVietnameseSortKey(fullName: string): string {
  if (!fullName) return '';
  const words = fullName.trim().split(/\s+/);
  if (words.length === 0) return '';
  const firstName = words[words.length - 1].toLowerCase();
  const rest = words.slice(0, -1).join(' ').toLowerCase();
  return `${firstName} ${rest}`;
}

/**
 * Sắp xếp danh sách học sinh theo chuẩn tiếng Việt và tự động gắn STT 1, 2, 3...
 */
export function sortStudentsVietnamese(students: EditorStudent[]): EditorStudent[] {
  const sorted = [...students].sort((a, b) => {
    const keyA = getVietnameseSortKey(a.fullName);
    const keyB = getVietnameseSortKey(b.fullName);
    return keyA.localeCompare(keyB, 'vi', { sensitivity: 'base' });
  });

  return sorted.map((st, index) => ({
    ...st,
    stt: index + 1
  }));
}
