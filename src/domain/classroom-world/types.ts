export type ZoneType = 'residential' | 'central_plaza' | 'library_hub' | 'arena_lab' | 'cosmic_forest';
export type StudentGender = 'male' | 'female';

export interface GridCoordinate {
  x: number; // 0..7
  y: number; // 0..7
}

export interface ZoneDefinition {
  type: ZoneType;
  name: string;
  vietnameseName: string;
  icon: string;
  minLevel: number;
  description: string;
  bgColorClass: string;
  borderColorClass: string;
  glowColor: string;
}

export interface HouseFurnitureItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: 'furniture' | 'decor' | 'jewelry' | 'wall';
  icon: string;
  description: string;
  placedAt?: string;
}

export type HouseThemeType = 'cozy_wood' | 'space_pod' | 'crystal_castle' | 'fairy_garden';

export interface HouseTourData {
  ownerStudentId: string;
  ownerStudentCode: string;
  ownerName: string;
  anonymousName: string;
  petLevel: number;
  evolutionBranch: 'cosmic' | 'nature' | 'cyber';
  eggBaseColor?: string;
  gender: StudentGender;
  homeCoordinate: GridCoordinate;
  theme: HouseThemeType;
  themeName: string;
  themeIcon: string;
  themeBgGradient: string;
  furnitures: HouseFurnitureItem[];
  trophies: string[];
  heartsCount: number;
  visitorCount: number;
  welcomeMessage: string;
}

export interface StudentRosterItem {
  id: string;
  code: string; // VD: '8A13_01'
  fullName: string;
  classId: string;
  className: string;
  gender?: StudentGender;
  level?: number;
  currentXp?: number;
  vitalityPercent?: number;
  streakDays?: number;
  totalCoins?: number;
  competitionScore?: number;
  completedQuestsCount?: number;
  evolutionBranch?: 'cosmic' | 'nature' | 'cyber';
  eggBaseColor?: string;
  anonymousName?: string;
  // Quota & Rebirth Token System
  nicknameChangesLeft?: number;
  evolutionChangesLeft?: number;
  eggColorChangesMonth?: number;
  rebirthTokensCount?: number;
}

export interface PetWorldSnapshot {
  petId: string;
  studentId: string;
  studentCode: string; // VD: '8A13_01'
  displayCode: string; // Format: '8A13_01' (Rút gọn)
  studentName?: string;
  gender: StudentGender;
  classId: string;
  anonymousName: string;
  evolutionBranch: 'cosmic' | 'nature' | 'cyber';
  level: number;
  isHatched: boolean;
  isHibernating: boolean;
  eggBaseColor?: string;
  homePosition: GridCoordinate;
  currentPosition: GridCoordinate;
  targetPosition?: GridCoordinate;
  facingDirection: 1 | -1; // 1: Right, -1: Left
  currentZoneType: ZoneType;
  isMoving: boolean;
  lastMovedAt: number;
  currentXp: number;
  vitalityPercent: number;
  streakDays: number;
  totalCoins: number;
  competitionScore: number;
  completedQuestsCount: number;
  // Quota & Rebirth
  nicknameChangesLeft: number;
  evolutionChangesLeft: number;
  eggColorChangesMonth: number;
  rebirthTokensCount: number;
}

export interface AvatarDetailVM {
  petId: string;
  studentCode: string;
  displayLabel: string;
  studentName?: string;
  gender: StudentGender;
  anonymousName: string;
  evolutionBranch: 'cosmic' | 'nature' | 'cyber';
  level: number;
  isHatched: boolean;
  isHibernating: boolean;
  eggBaseColor?: string;
  currentXp: number;
  requiredXp: number;
  xpNeeded: number;
  vitalityPercent: number;
  streakDays: number;
  totalCoins: number;
  competitionScore: number;
  completedQuestsCount: number;
  currentZone: ZoneDefinition;
  position: GridCoordinate;
  nicknameChangesLeft: number;
  evolutionChangesLeft: number;
  eggColorChangesMonth: number;
  rebirthTokensCount: number;
}

export interface WorldTileMetadata {
  coordinate: GridCoordinate;
  isBorder: boolean;
  zone: ZoneDefinition;
  ownerStudentId?: string;
  ownerPetId?: string;
  buildingItemCode?: string;
}
