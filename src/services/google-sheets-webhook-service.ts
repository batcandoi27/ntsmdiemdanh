import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsWebhookPayload } from '@/types/student-portal';
import { StudentPortalService } from './student-portal-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MASTER_WEBHOOK_SECRET = process.env.GOOGLE_WEBHOOK_SECRET || 'TBC_MASTER_WEBHOOK_SECRET_2026';

export class GoogleSheetsWebhookService {
  /**
   * Xác thực Webhook Secret Token
   */
  static verifySecret(token: string): boolean {
    return token === MASTER_WEBHOOK_SECRET;
  }

  /**
   * Xử lý Payload Webhook nhận được từ Google Sheets / Forms
   */
  static async processWebhookPayload(payload: GoogleSheetsWebhookPayload): Promise<{
    success: boolean;
    message: string;
    awarded_xp?: number;
    awarded_coins?: number;
    new_level?: number;
  }> {
    // 1. Kiểm tra Secret Token
    if (!this.verifySecret(payload.secret_token)) {
      return { success: false, message: 'Invalid Webhook Secret Token.' };
    }

    if (!payload.class_id || !payload.student_code) {
      return { success: false, message: 'Missing class_id or student_code.' };
    }

    try {
      // 2. Tìm học sinh trong database theo mã học sinh và lớp
      const { data: student } = await supabase
        .from('students')
        .select('id, student_code, full_name')
        .ilike('student_code', payload.student_code.trim())
        .maybeSingle();

      const studentId = student?.id || `fallback-std-${payload.student_code}`;

      // 3. Kiểm tra Daily Quest Cap (tối đa 4 bài/ngày)
      const capCheck = await StudentPortalService.checkDailyCap(studentId, 4);
      if (!capCheck.canSubmit) {
        return {
          success: false,
          message: `Daily Cap Reached: Đã hoàn thành tối đa 4 nhiệm vụ trong ngày hôm nay.`
        };
      }

      // 4. Lấy hoặc tạo Thú cưng ẩn danh cho học sinh
      const pet = await StudentPortalService.getOrCreateStudentPet(studentId, payload.class_id);

      // 5. Kiểm tra Idempotency chống nộp trùng
      const today = new Date().toISOString().split('T')[0];
      const submissionHash = crypto
        .createHash('sha256')
        .update(`${studentId}-${payload.quest_code}-${today}`)
        .digest('hex');

      const { data: existingCompletion } = await supabase
        .from('student_quest_completions')
        .select('id')
        .eq('submission_hash', submissionHash)
        .maybeSingle();

      if (existingCompletion) {
        return {
          success: true,
          message: 'Idempotent: Nhiệm vụ này đã được hoàn thành hôm nay.',
          new_level: pet.level
        };
      }

      // 6. Tính điểm thưởng XP & Coins
      const baseScore = payload.score || 10;
      const xpAward = Math.round(50 * (baseScore / 10));
      const coinsAward = Math.round(10 * (baseScore / 10));

      // 7. Ghi nhận vào hàng đợi Hậu kiểm (Post-Audit)
      const { data: completion } = await supabase
        .from('student_quest_completions')
        .insert({
          quest_id: payload.quest_code || 'quest-default',
          student_id: studentId,
          class_id: payload.class_id,
          submission_hash: submissionHash,
          proof_urls: payload.proof_image_urls || [],
          action_anchor: payload.action_anchor || '',
          temporal_anchor: payload.temporal_anchor || '',
          physical_anchor_verified: Boolean(payload.physical_anchor_text),
          personal_reflection: payload.personal_reflection || '',
          score_achieved: baseScore,
          xp_awarded: xpAward,
          coins_awarded: coinsAward,
          status: 'auto_completed'
        })
        .select()
        .single();

      // 8. Tự động cộng XP & Coins tức thì cho Thú Cưng
      const awardResult = await StudentPortalService.awardXpAndCoins(
        pet.id,
        xpAward,
        coinsAward,
        'quest_completion',
        completion?.id
      );

      // 9. Cập nhật thanh năng lượng Tàu Vũ Trụ Lớp (Co-op Progress)
      await this.addCoopProgress(payload.class_id, xpAward);

      return {
        success: true,
        message: 'Hoàn thành nhiệm vụ thành công!',
        awarded_xp: xpAward,
        awarded_coins: coinsAward,
        new_level: awardResult.newLevel
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi xử lý Webhook: ${err.message}` };
    }
  }

  /**
   * Đổ điểm XP vào thanh năng lượng Tàu Vũ Trụ của lớp
   */
  static async addCoopProgress(classId: string, xpDelta: number): Promise<void> {
    const currentWeekKey = `2026-W${Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % 52}`;

    const { data: existingGoal } = await supabase
      .from('student_coop_goals')
      .select('*')
      .eq('class_id', classId)
      .eq('period_key', currentWeekKey)
      .maybeSingle();

    if (existingGoal) {
      const newXp = existingGoal.current_xp + xpDelta;
      const isUnlocked = newXp >= existingGoal.target_xp;
      await supabase
        .from('student_coop_goals')
        .update({
          current_xp: newXp,
          is_unlocked: isUnlocked,
          unlocked_at: isUnlocked && !existingGoal.is_unlocked ? new Date().toISOString() : existingGoal.unlocked_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingGoal.id);
    } else {
      await supabase.from('student_coop_goals').insert({
        class_id: classId,
        period_key: currentWeekKey,
        target_xp: 3000,
        current_xp: xpDelta,
        reward_description: 'Mở khóa Buổi Chiếu Phim Khoa Học Cuối Tuần'
      });
    }
  }
}
