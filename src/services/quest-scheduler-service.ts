import { createClient } from '@supabase/supabase-js';
import { StudentQuest, TeacherQuestOverride } from '@/types/student-portal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const DEFAULT_PRESET_QUESTS: Partial<StudentQuest>[] = [
  {
    id: 'quest-math-01',
    subject_code: 'MATH',
    category: 'academic',
    cadence: 'daily',
    estimated_minutes: 5,
    title: 'Khởi Động Ngày Mới: 3 Bài Toán Tư Duy Nhanh',
    description: 'Thử sức với 3 bài toán tính nhanh hoặc câu đố logic để rèn luyện não bộ.',
    week_timeline_start: 1,
    week_timeline_end: 35,
    reward_xp: 30,
    reward_coins: 5,
    evidence_type: 'form',
    requires_anchor: true,
    is_active: true
  },
  {
    id: 'quest-habit-01',
    subject_code: 'HOMEROOM',
    category: 'habit_life',
    cadence: 'daily',
    estimated_minutes: 3,
    title: 'Góc Học Tập Gọn Gàng & Check-in 20h00',
    description: 'Sắp xếp bàn học sạch sẽ và bấm check-in tự giác học bài đúng giờ buổi tối.',
    week_timeline_start: 1,
    week_timeline_end: 35,
    reward_xp: 25,
    reward_coins: 5,
    evidence_type: 'image',
    requires_anchor: true,
    is_active: true
  },
  {
    id: 'quest-meta-01',
    subject_code: 'ALL',
    category: 'metacognition',
    cadence: 'alternate',
    estimated_minutes: 8,
    title: 'Vượt Khó: Sửa Lại 1 Lỗi Sai Trong Bài Kiểm Tra',
    description: 'Chọn 1 câu đã từng làm sai, giải lại đúng và ghi 1 câu giải thích tại sao mình sai.',
    week_timeline_start: 1,
    week_timeline_end: 35,
    reward_xp: 60,
    reward_coins: 15,
    evidence_type: 'form',
    requires_anchor: true,
    is_active: true
  },
  {
    id: 'quest-peer-01',
    subject_code: 'HOMEROOM',
    category: 'social_peer',
    cadence: 'weekly_boss',
    estimated_minutes: 15,
    title: 'Đôi Bạn Cùng Tiến Ẩn Danh: Giảng Bài Cho Bạn',
    description: 'Hướng dẫn 1 bạn trong lớp hiểu bài và nhận mã OTP xác nhận bí mật từ bạn.',
    week_timeline_start: 2,
    week_timeline_end: 35,
    reward_xp: 100,
    reward_coins: 25,
    evidence_type: 'form',
    requires_anchor: true,
    is_active: true
  },
  {
    id: 'quest-science-01',
    subject_code: 'SCIENCE',
    category: 'academic',
    cadence: 'alternate',
    estimated_minutes: 10,
    title: 'Khoa Học Đời Sống: Khám Phá 1 Hiện Tượng Tự Nhiên',
    description: 'Chụp ảnh hoặc quay video 30s giải thích 1 hiện tượng khoa học quanh ngôi nhà của em.',
    week_timeline_start: 3,
    week_timeline_end: 35,
    reward_xp: 50,
    reward_coins: 10,
    evidence_type: 'hybrid',
    requires_anchor: true,
    is_active: true
  },
  {
    id: 'quest-mindmap-01',
    subject_code: 'LITERATURE',
    category: 'academic',
    cadence: 'weekly_boss',
    estimated_minutes: 15,
    title: 'Sơ Đồ Tư Duy AI / Canva Tóm Tắt Bài Học',
    description: 'Thiết kế 1 sơ đồ Mindmap tóm tắt tác phẩm văn học hoặc nhân vật lịch sử.',
    week_timeline_start: 4,
    week_timeline_end: 35,
    reward_xp: 80,
    reward_coins: 20,
    evidence_type: 'image',
    requires_anchor: true,
    is_active: true
  }
];

export class QuestSchedulerService {
  /**
   * Tính tuần học hiện tại trong năm học (1..35)
   */
  static getCurrentAcademicWeek(): number {
    const now = new Date();
    // Giả lập tuần học dựa trên ngày trong năm (1..35)
    const startOfYear = new Date(now.getFullYear(), 8, 5); // Khai giảng 05/09
    const diffDays = Math.max(0, Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
    const week = Math.floor(diffDays / 7) + 1;
    return Math.min(35, Math.max(1, week));
  }

  /**
   * Lấy danh sách nhiệm vụ khả dụng cho lớp học kết hợp Teacher Overrides
   */
  static async getAvailableQuests(classId: string, studentId: string): Promise<StudentQuest[]> {
    const currentWeek = this.getCurrentAcademicWeek();

    try {
      // 1. Lấy danh sách quest từ DB
      const { data: dbQuests } = await supabase
        .from('student_quest_bank')
        .select('*')
        .eq('is_active', true)
        .lte('week_timeline_start', currentWeek)
        .gte('week_timeline_end', currentWeek);

      const questsPool: StudentQuest[] = (dbQuests && dbQuests.length > 0)
        ? dbQuests as StudentQuest[]
        : DEFAULT_PRESET_QUESTS.map(q => ({
            id: q.id!,
            subject_code: q.subject_code || 'ALL',
            category: q.category || 'academic',
            cadence: q.cadence || 'daily',
            estimated_minutes: q.estimated_minutes || 5,
            title: q.title || '',
            description: q.description || '',
            week_timeline_start: q.week_timeline_start || 1,
            week_timeline_end: q.week_timeline_end || 35,
            reward_xp: q.reward_xp || 50,
            reward_coins: q.reward_coins || 10,
            evidence_type: q.evidence_type || 'form',
            requires_anchor: q.requires_anchor ?? true,
            is_active: true
          }));

      // 2. Lấy Teacher Overrides của lớp (nếu có)
      const { data: overrides } = await supabase
        .from('teacher_quest_overrides')
        .select('*')
        .eq('class_id', classId);

      const overrideMap = new Map<string, TeacherQuestOverride>();
      (overrides || []).forEach((ov: any) => overrideMap.set(ov.quest_id, ov));

      // 3. Lấy các nhiệm vụ học sinh đã hoàn thành hôm nay
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('student_quest_completions')
        .select('quest_id')
        .eq('student_id', studentId)
        .gte('created_at', `${today}T00:00:00.000Z`);

      const completedQuestIds = new Set((completions || []).map((c: any) => c.quest_id));

      // 4. Hợp nhất danh sách và áp dụng Teacher Overrides
      const resolvedQuests: StudentQuest[] = [];

      for (const quest of questsPool) {
        const ov = overrideMap.get(quest.id);

        if (ov && ov.override_action === 'disable') {
          continue; // Giáo viên đã tắt nhiệm vụ này
        }

        const isCompleted = completedQuestIds.has(quest.id);

        resolvedQuests.push({
          ...quest,
          title: ov?.custom_title || quest.title,
          reward_xp: ov?.custom_xp || quest.reward_xp,
          reward_coins: ov?.custom_coins || quest.reward_coins,
          is_completed: isCompleted
        });
      }

      return resolvedQuests;
    } catch {
      return DEFAULT_PRESET_QUESTS.map(q => ({
        id: q.id!,
        subject_code: q.subject_code || 'ALL',
        category: q.category || 'academic',
        cadence: q.cadence || 'daily',
        estimated_minutes: q.estimated_minutes || 5,
        title: q.title || '',
        description: q.description || '',
        week_timeline_start: 1,
        week_timeline_end: 35,
        reward_xp: q.reward_xp || 50,
        reward_coins: q.reward_coins || 10,
        evidence_type: q.evidence_type || 'form',
        requires_anchor: true,
        is_active: true,
        is_completed: false
      }));
    }
  }

  /**
   * Giáo viên Override nhiệm vụ (Bật/Tắt, Đổi điểm thưởng)
   */
  static async saveTeacherOverride(
    classId: string,
    questId: string,
    action: 'disable' | 'enable' | 'custom_reward' | 'replace',
    customTitle?: string,
    customXp?: number,
    customCoins?: number
  ): Promise<boolean> {
    const payload = {
      class_id: classId,
      quest_id: questId,
      override_action: action,
      custom_title: customTitle,
      custom_xp: customXp,
      custom_coins: customCoins,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('teacher_quest_overrides')
      .upsert(payload, { onConflict: 'class_id,quest_id' });

    return !error;
  }
}
