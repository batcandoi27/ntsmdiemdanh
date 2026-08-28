// =============================================================================
// STUDENT PORTAL TYPES (Đặc tả kiểu dữ liệu Cổng Học Sinh v2.2)
// =============================================================================

export type PetEvolutionBranch = 'cosmic' | 'nature' | 'cyber';

export type QuestCategory = 'academic' | 'habit_life' | 'social_peer' | 'metacognition' | 'life_skills';

export type QuestCadence = 'daily' | 'alternate' | 'weekly_boss';

export type QuestEvidenceType = 'form' | 'image' | 'video' | 'text' | 'hybrid';

export type QuestCompletionStatus = 'auto_completed' | 'verified' | 'revoked';

export interface StudentPet {
  id: string;
  student_id: string;
  class_id: string;
  anonymous_name: string;
  anonymous_avatar_code: string;
  evolution_branch: PetEvolutionBranch;
  level: number; // 0: Egg, 1..4: Cracking, 5..9: Hatchling, 10..19: Winged Teen, 20..29: Titan, 30+: Sovereign
  current_xp: number;
  vitality_percent: number; // 0..100
  streak_days: number;
  last_checkin_date?: string;
  last_activity_at: string;
  is_hibernating: boolean;
  total_coins: number;
  egg_base_color?: string;
  is_hatched?: boolean;
  custom_svg_data?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentPetInventoryItem {
  id: string;
  pet_id: string;
  item_type: 'skin' | 'badge' | 'aura' | 'theme';
  item_code: string;
  item_name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  is_equipped: boolean;
  unlocked_at: string;
}

export interface VerificationAnchors {
  action_anchor: string; // Neo 1: Hành động cụ thể
  temporal_anchor: string; // Neo 2: Thời gian thực
  physical_pet_code: string; // Neo 3: Bí danh Pet trong ảnh/video
  personal_reflection: string; // Neo 4: Cảm xúc 1-2 câu
}

export interface StudentQuest {
  id: string;
  school_id?: string;
  class_id?: string | null;
  subject_code: string; // 'MATH' | 'HOMEROOM' | 'LITERATURE' | 'SCIENCE' | 'ENGLISH' | 'ALL'
  category: QuestCategory;
  cadence: QuestCadence;
  estimated_minutes: number;
  title: string;
  description: string;
  week_timeline_start: number;
  week_timeline_end: number;
  reward_xp: number;
  reward_coins: number;
  google_form_url?: string;
  evidence_type: QuestEvidenceType;
  requires_anchor: boolean;
  is_active: boolean;
  is_completed?: boolean;
  created_by?: string;
  created_at?: string;
}

export interface TeacherQuestOverride {
  id: string;
  class_id: string;
  quest_id: string;
  override_action: 'disable' | 'enable' | 'custom_reward' | 'replace';
  custom_title?: string;
  custom_xp?: number;
  custom_coins?: number;
  teacher_id?: string;
  updated_at: string;
}

export interface StudentQuestCompletion {
  id: string;
  quest_id: string;
  student_id: string;
  class_id: string;
  submission_hash?: string;
  proof_urls?: string[];
  action_anchor?: string;
  temporal_anchor?: string;
  physical_anchor_verified?: boolean;
  personal_reflection?: string;
  score_achieved: number;
  xp_awarded: number;
  coins_awarded: number;
  status: QuestCompletionStatus;
  audit_note?: string;
  audited_by?: string;
  audited_at?: string;
  created_at: string;
  quest_title?: string;
  anonymous_pet_name?: string;
}

export interface StudentWorldPlot {
  id: string;
  class_id: string;
  pet_id: string;
  grid_x: number; // 0..7
  grid_y: number; // 0..7
  plot_theme: string;
  building_item_code: string;
  decorations: Array<{ item_code: string; x: number; y: number }>;
  updated_at: string;
  anonymous_name?: string;
  pet_level?: number;
  pet_branch?: PetEvolutionBranch;
  egg_base_color?: string;
  is_hatched?: boolean;
}

export interface VirtualShopItem {
  id: string;
  item_code: string;
  item_name: string;
  category: 'building' | 'decoration' | 'theme' | 'furniture' | 'jewelry';
  price_coins: number;
  svg_asset_data: string;
  required_level: number;
  is_available: boolean;
}

export interface GoogleSheetsWebhookPayload {
  class_id: string;
  secret_token: string;
  timestamp: string;
  student_code: string;
  quest_code: string;
  score: number;
  max_score?: number;
  proof_image_urls?: string[];
  action_anchor?: string;
  temporal_anchor?: string;
  physical_anchor_text?: string;
  personal_reflection?: string;
  raw_responses?: Record<string, unknown>;
}
