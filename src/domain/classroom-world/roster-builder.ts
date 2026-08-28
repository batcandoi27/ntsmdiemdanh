import { StudentRosterItem, PetWorldSnapshot, AvatarDetailVM, HouseTourData, HouseFurnitureItem } from './types';
import { getAllBorderCoordinates, getZoneAtCoordinate } from './zoning';
import { DEFAULT_EGG_COLORS } from './constants';

/**
 * Format nhãn hiển thị định danh linh vật trực quan rút gọn: [Mã định danh] (VD: 8A13_01)
 */
export function formatAvatarLabel(studentCode: string, _level?: number): string {
  return studentCode || 'HS';
}

/**
 * Tính toán XP cần thiết để lên cấp tiếp theo
 */
export function calculateRequiredXp(level: number): number {
  return Math.round(100 * Math.pow(1.5, Math.max(0, level)));
}

/**
 * Xây dựng View Model chi tiết cho Rich Hover Card
 */
export function buildAvatarDetailVM(pet: PetWorldSnapshot): AvatarDetailVM {
  const reqXp = calculateRequiredXp(pet.level);
  const needed = Math.max(0, reqXp - pet.currentXp);
  const zoneDef = getZoneAtCoordinate(pet.currentPosition);

  return {
    petId: pet.petId,
    studentCode: pet.studentCode,
    displayLabel: pet.displayCode,
    studentName: pet.studentName,
    gender: pet.gender,
    anonymousName: pet.anonymousName,
    evolutionBranch: pet.evolutionBranch,
    level: pet.level,
    isHatched: pet.isHatched,
    isHibernating: pet.isHibernating,
    eggBaseColor: pet.eggBaseColor,
    currentXp: pet.currentXp,
    requiredXp: reqXp,
    xpNeeded: needed,
    vitalityPercent: pet.vitalityPercent,
    streakDays: pet.streakDays,
    totalCoins: pet.totalCoins,
    competitionScore: pet.competitionScore,
    completedQuestsCount: pet.completedQuestsCount,
    currentZone: zoneDef,
    position: pet.currentPosition,
    nicknameChangesLeft: pet.nicknameChangesLeft,
    evolutionChangesLeft: pet.evolutionChangesLeft,
    eggColorChangesMonth: pet.eggColorChangesMonth,
    rebirthTokensCount: pet.rebirthTokensCount
  };
}

const HOUSE_THEMES = [
  {
    type: 'cozy_wood' as const,
    name: 'Nhà Gỗ Cozy Thần Bí',
    icon: '🌲',
    bgGradient: 'from-amber-950/60 via-slate-900 to-slate-950',
    furnitures: [
      { id: 'f-1', itemCode: 'wood_bed', itemName: 'Giường Gỗ Sồi Ấm Áp', category: 'furniture' as const, icon: '🛏️', description: 'Hồi phục sinh lực +25%' },
      { id: 'f-2', itemCode: 'wood_desk', itemName: 'Bàn Trà Cổ Thụ', category: 'furniture' as const, icon: '🪵', description: 'Tăng 10% tập trung học bài' },
      { id: 'f-3', itemCode: 'magic_carpet', itemName: 'Thảm Lông Thần Thoại', category: 'decor' as const, icon: '🧶', description: 'Ấm áp êm ái cho thú cưng' }
    ]
  },
  {
    type: 'space_pod' as const,
    name: 'Trạm Không Gian Alpha',
    icon: '🚀',
    bgGradient: 'from-indigo-950/60 via-slate-900 to-slate-950',
    furnitures: [
      { id: 'f-4', itemCode: 'cosmic_bed', itemName: 'Giường Ngủ Phi Thuyền', category: 'furniture' as const, icon: '🛸', description: 'Giúp thú cưng hồi phục nhanh' },
      { id: 'f-5', itemCode: 'quantum_pc', itemName: 'Máy Tính Lượng Tử', category: 'furniture' as const, icon: '💻', description: 'Tính toán bài tập siêu tốc' },
      { id: 'f-6', itemCode: 'neon_lamp', itemName: 'Đèn Neon Ma Thuật', category: 'decor' as const, icon: '🏮', description: 'Ánh sáng neon vũ trụ' }
    ]
  },
  {
    type: 'crystal_castle' as const,
    name: 'Lâu Đài Pha Lê Vĩnh Cửu',
    icon: '🏰',
    bgGradient: 'from-purple-950/60 via-slate-900 to-slate-950',
    furnitures: [
      { id: 'f-7', itemCode: 'crystal_throne', itemName: 'Bục Ngai Vàng Pha Lê', category: 'furniture' as const, icon: '🪑', description: 'Tỏa sáng hào quang học tập' },
      { id: 'f-8', itemCode: 'star_crown', itemName: 'Vương Miện Tinh Tú', category: 'jewelry' as const, icon: '👑', description: 'Vinh danh tài năng xuất chúng' },
      { id: 'f-9', itemCode: 'mirror_portal', itemName: 'Gương Thần Ngân Hà', category: 'decor' as const, icon: '🪞', description: 'Phản chiếu ý chí kiên định' }
    ]
  },
  {
    type: 'fairy_garden' as const,
    name: 'Vườn Sinh Thái Cổ Tích',
    icon: '🌿',
    bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-950',
    furnitures: [
      { id: 'f-10', itemCode: 'magic_tree', itemName: 'Cây Tri Thức Phát Sáng', category: 'decor' as const, icon: '🌳', description: 'Tỏa ra hương hoa học tập' },
      { id: 'f-11', itemCode: 'vine_swing', itemName: 'Xích Đu Dây Leo', category: 'furniture' as const, icon: '🪑', description: 'Thư giãn sau giờ học căng thẳng' },
      { id: 'f-12', itemCode: 'lucky_charm', itemName: 'Vòng Tay May Mắn', category: 'jewelry' as const, icon: '📿', description: 'Hộ mệnh chăm ngoan' }
    ]
  }
];

/**
 * Sinh dữ liệu tham quan nhà riêng (House Tour) cho từng học sinh với Bản thiết kế kiến trúc độc bản
 */
export function generateHouseTourData(st: StudentRosterItem | PetWorldSnapshot): HouseTourData {
  const code = 'studentCode' in st ? st.studentCode : st.code;
  const name = 'studentName' in st ? st.studentName : ('fullName' in st ? st.fullName : `Học Sinh ${code}`);
  const anon = st.anonymousName || `Linh Vật ${code}`;
  const gender = st.gender || 'female';
  const level = st.level ?? 1;
  const num = parseInt(code.replace(/\D/g, '') || '1', 10);

  // Phân bổ 4 Theme kiến trúc độc bản xoay vòng
  const theme = HOUSE_THEMES[(num - 1) % HOUSE_THEMES.length];
  const studentId = 'id' in st ? st.id : st.studentId;

  return {
    ownerStudentId: studentId || `std-${code}`,
    ownerStudentCode: code,
    ownerName: name || `Học Sinh ${code}`,
    anonymousName: anon,
    petLevel: level,
    evolutionBranch: st.evolutionBranch || 'cosmic',
    eggBaseColor: st.eggBaseColor || '#9d4edd',
    gender,
    homeCoordinate: 'homePosition' in st ? st.homePosition : { x: 0, y: 0 },
    theme: theme.type,
    themeName: theme.name,
    themeIcon: theme.icon,
    themeBgGradient: theme.bgGradient,
    furnitures: theme.furnitures,
    trophies: level >= 2 ? ['Huy Chương Chăm Chỉ Tuần 1', 'Top 5 Thần Tốc Rèn Luyện'] : ['Chứng Nhận Gia Nhập Làng Lớp Học'],
    heartsCount: 15 + (num * 3),
    visitorCount: 30 + (num * 7),
    welcomeMessage: `Chào mừng bạn ghé thăm ${theme.name} của ${anon}! Chúc bạn học tập thật tốt nhé ⭐`
  };
}

const ANONYMOUS_ADJECTIVES = [
  'Thần Bí', 'Băng Giá', 'Lửa Thiêng', 'Rừng Xanh', 'Ngân Hà', 'Bão Tố', 'Hoàng Kim',
  'Pha Lê', 'Bóng Đêm', 'Ánh Sáng', 'Sấm Sét', 'Biển Sâu', 'Vũ Trụ', 'Thần Thoại'
];

const ANONYMOUS_BEASTS = [
  'Phượng Hoàng', 'Rồng Lửa', 'Kỳ Lân', 'Hổ Trắng', 'Sư Tử Điển', 'Hải Âu', 'Cáo Tuyết',
  'Gấu Bắc Cực', 'Chim Ưng', 'Báo Đốm', 'Thỏ Trắng', 'Hươu Thần', 'Cá Heo', 'Ngựa Bay'
];

/**
 * Sinh danh sách 100% học sinh đầy đủ của lớp:
 * - TOÀN BỘ BẮT ĐẦU TỪ LEVEL 1 (Chuẩn baseline đồng nhất theo chỉ thị)
 * - Tự động phân biệt giới tính Nam / Nữ
 * - Gán Quota mặc định (Bí danh 1 lần, Nhánh 3 lần, Màu trứng 1 lần/tháng, Tẩy tủy 0)
 */
export function generateClassroomRoster(
  className: string = '8A13',
  count: number = 43
): StudentRosterItem[] {
  const prefix = className.replace(/^Lớp\s*/i, '');
  const items: StudentRosterItem[] = [];

  for (let i = 1; i <= count; i++) {
    // Sinh mã ngẫu nhiên 3 chữ số bảo mật (tránh trùng khớp với STT sổ điểm danh lớp học)
    const tagNum = 100 + ((i * 137 + 73) % 890);
    const code = `${prefix}_#${tagNum}`;
    const id = `std-${prefix}-${tagNum}`;

    // Phân biệt giới tính (48% Nữ, 52% Nam tự nhiên)
    const gender: 'male' | 'female' = i % 2 === 0 ? 'female' : 'male';

    // TOÀN BỘ BẮT ĐẦU LEVEL 1 (Theo chỉ thị Master Plan)
    const level = 1;

    const branches: Array<'cosmic' | 'nature' | 'cyber'> = ['cosmic', 'nature', 'cyber'];
    const branch = branches[i % 3];
    const adj = ANONYMOUS_ADJECTIVES[i % ANONYMOUS_ADJECTIVES.length];
    const beast = ANONYMOUS_BEASTS[i % ANONYMOUS_BEASTS.length];
    const anonName = `${beast} ${adj} #${tagNum}`;
    const colorHex = DEFAULT_EGG_COLORS[i % DEFAULT_EGG_COLORS.length].hex;

    items.push({
      id,
      code,
      fullName: `Hiệp Sĩ #${tagNum}`,
      classId: className,
      className,
      gender,
      level,
      currentXp: 20 + (i * 2), // Bắt đầu ở Level 1 với XP khởi đầu
      vitalityPercent: 100,
      streakDays: Math.max(1, (i % 7) + 1),
      totalCoins: 30 + (i * 2),
      competitionScore: 100 + (i * 2),
      completedQuestsCount: Math.max(0, i % 3),
      evolutionBranch: branch,
      eggBaseColor: colorHex,
      anonymousName: anonName,
      // Quota khởi tạo
      nicknameChangesLeft: 1, // Đổi 1 lần duy nhất ban đầu
      evolutionChangesLeft: 3, // Đổi tối đa 3 lần
      eggColorChangesMonth: 1, // Đổi 1 lần mỗi tháng
      rebirthTokensCount: 0    // Phiếu tẩy tủy
    });
  }

  return items;
}

/**
 * Chuyển đổi toàn bộ học sinh trong lớp thành danh sách PetWorldSnapshot
 * Đảm bảo Invariant 1:1, Trứng/Thú Level 1 bắt đầu sinh hoạt tại Quảng trường trung tâm [1..3, 1..3]
 */
export function buildAvatarRoster(
  students: StudentRosterItem[],
  currentPetId?: string,
  myEggColor?: string
): PetWorldSnapshot[] {
  const borderCoords = getAllBorderCoordinates();

  return students.map((st, idx) => {
    // 1. Tọa độ nhà riêng cố định trên 28 ô viền
    const homePos = borderCoords[idx % borderCoords.length];
    const level = st.level ?? 1;
    const isHatched = level >= 1;
    const eggColor = st.id === currentPetId && myEggColor ? myEggColor : (st.eggBaseColor || DEFAULT_EGG_COLORS[idx % DEFAULT_EGG_COLORS.length].hex);
    const gender = st.gender || (idx % 2 === 0 ? 'female' : 'male');

    // 2. Vị trí ban đầu:
    // Phân bổ đều toàn bộ 43 sinh vật của lớp vào không gian mở trung tâm [1..6, 1..6]
    const initPos = isHatched
      ? { x: 1 + (idx % 6), y: 1 + (Math.floor(idx / 6) % 6) }
      : homePos;

    return {
      petId: st.id,
      studentId: st.id,
      studentCode: st.code,
      displayCode: formatAvatarLabel(st.code, level), // Rút gọn '8A13_01'
      studentName: st.fullName,
      gender,
      classId: st.classId,
      anonymousName: st.anonymousName || `Linh Vật #${idx + 1}`,
      evolutionBranch: st.evolutionBranch || 'cosmic',
      level,
      isHatched,
      isHibernating: false,
      eggBaseColor: eggColor,
      homePosition: homePos,
      currentPosition: initPos,
      facingDirection: idx % 2 === 0 ? 1 : -1,
      currentZoneType: getZoneAtCoordinate(initPos).type,
      isMoving: false,
      lastMovedAt: Date.now(),
      currentXp: st.currentXp ?? 25,
      vitalityPercent: st.vitalityPercent ?? 100,
      streakDays: st.streakDays ?? 1,
      totalCoins: st.totalCoins ?? 30,
      competitionScore: st.competitionScore ?? 100,
      completedQuestsCount: st.completedQuestsCount ?? 0,
      nicknameChangesLeft: st.nicknameChangesLeft ?? 1,
      evolutionChangesLeft: st.evolutionChangesLeft ?? 3,
      eggColorChangesMonth: st.eggColorChangesMonth ?? 1,
      rebirthTokensCount: st.rebirthTokensCount ?? 0
    };
  });
}
