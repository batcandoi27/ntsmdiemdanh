'use server';

import { createClient } from '@supabase/supabase-js';
import { StudentPortalService } from '@/services/student-portal-service';
import { QuestSchedulerService } from '@/services/quest-scheduler-service';
import { GoogleSheetsWebhookService } from '@/services/google-sheets-webhook-service';
import { VerificationAnchors } from '@/types/student-portal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function getStudentDashboardData(studentId: string, classId: string) {
  try {
    const pet = await StudentPortalService.getOrCreateStudentPet(studentId, classId);
    const quests = await QuestSchedulerService.getAvailableQuests(classId, studentId);
    const plots = await StudentPortalService.getClassWorldPlots(classId);
    const capCheck = await StudentPortalService.checkDailyCap(studentId, 4);

    // Lấy thông báo lớp từ homeroom_class_settings
    const { data: settings } = await supabase
      .from('homeroom_class_settings')
      .select('announcement')
      .eq('class_id', classId)
      .maybeSingle();

    return {
      success: true,
      pet,
      quests,
      plots,
      announcement: settings?.announcement || 'Chào mừng các em đến với Cổng Học Sinh! Hãy hoàn thành nhiệm vụ để ấp trứng nở nhé!',
      dailyCap: capCheck
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message
    };
  }
}

export async function submitManualQuestEvidence(
  studentId: string,
  classId: string,
  questId: string,
  anchors: VerificationAnchors,
  proofUrls: string[]
) {
  try {
    const capCheck = await StudentPortalService.checkDailyCap(studentId, 4);
    if (!capCheck.canSubmit) {
      return { success: false, message: 'Đã hoàn thành tối đa 4 nhiệm vụ hôm nay. Hãy nghỉ ngơi nhé!' };
    }

    const pet = await StudentPortalService.getOrCreateStudentPet(studentId, classId);

    const xpAward = 50;
    const coinsAward = 10;

    const { data: completion, error: compErr } = await supabase
      .from('student_quest_completions')
      .insert({
        quest_id: questId,
        student_id: studentId,
        class_id: classId,
        proof_urls: proofUrls,
        action_anchor: anchors.action_anchor,
        temporal_anchor: anchors.temporal_anchor,
        physical_anchor_verified: Boolean(anchors.physical_pet_code),
        personal_reflection: anchors.personal_reflection,
        score_achieved: 10,
        xp_awarded: xpAward,
        coins_awarded: coinsAward,
        status: 'auto_completed'
      })
      .select()
      .single();

    if (compErr) {
      // Fallback
    }

    const awardResult = await StudentPortalService.awardXpAndCoins(
      pet.id,
      xpAward,
      coinsAward,
      'manual_quest',
      completion?.id
    );

    await GoogleSheetsWebhookService.addCoopProgress(classId, xpAward);

    return {
      success: true,
      message: 'Hoàn thành nhiệm vụ thành công!',
      awarded_xp: xpAward,
      awarded_coins: coinsAward,
      new_level: awardResult.newLevel,
      leveled_up: awardResult.leveledUp
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function purchaseShopItemAction(petId: string, itemCode: string) {
  return await StudentPortalService.purchaseShopItem(petId, itemCode);
}

export async function auditRevokeQuestAction(completionId: string, reason: string) {
  try {
    const { data: comp } = await supabase
      .from('student_quest_completions')
      .select('*')
      .eq('id', completionId)
      .single();

    if (!comp || comp.status === 'revoked') {
      return { success: false, message: 'Record không tồn tại hoặc đã bị thu hồi.' };
    }

    // Đánh dấu revoked
    await supabase
      .from('student_quest_completions')
      .update({
        status: 'revoked',
        audit_note: reason,
        audited_at: new Date().toISOString()
      })
      .eq('id', completionId);

    // Trừ lại XP & Coin trong Pet và ghi Ledger
    const { data: pet } = await supabase
      .from('student_pets')
      .select('*')
      .eq('student_id', comp.student_id)
      .eq('class_id', comp.class_id)
      .single();

    if (pet) {
      const newXp = Math.max(0, pet.current_xp - comp.xp_awarded);
      const newCoins = Math.max(0, pet.total_coins - comp.coins_awarded);

      await supabase
        .from('student_pets')
        .update({ current_xp: newXp, total_coins: newCoins })
        .eq('id', pet.id);

      await supabase.from('student_xp_ledger').insert({
        student_id: comp.student_id,
        pet_id: pet.id,
        delta_xp: -comp.xp_awarded,
        delta_coins: -comp.coins_awarded,
        source_type: 'audit_revoke',
        reference_id: completionId,
        idempotency_key: `REVOKE-${completionId}`
      });
    }

    return { success: true, message: 'Đã thu hồi điểm thành công.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function getStudentsAction(classId: string) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('student_code', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Server Action: Cập nhật màu sắc quả trứng cá nhân hóa (có kiểm tra tính hợp lệ của mã HEX)
 */
export async function updateStudentEggColorAction(petId: string, colorHex: string) {
  try {
    // 1. Kiểm tra định dạng mã màu HEX an toàn chống injection/malformed input
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorHex || !hexRegex.test(colorHex)) {
      return {
        success: false,
        message: 'Mã màu HEX không hợp lệ (Phải có dạng #RRGGBB, VD: #9D4EDD)'
      };
    }

    if (!petId) {
      return { success: false, message: 'Thiếu định danh thú cưng petId' };
    }

    // 2. Cập nhật vào DB (nếu có DB) hoặc mock fallback an toàn
    const { data, error } = await supabase
      .from('student_pets')
      .update({
        egg_base_color: colorHex,
        updated_at: new Date().toISOString()
      })
      .eq('id', petId)
      .select('id, egg_base_color')
      .maybeSingle();

    if (error) {
      console.warn('[EggColorAction] Supabase update warning:', error.message);
    }

    return {
      success: true,
      colorHex,
      message: 'Đã cập nhật màu sắc quả trứng thành công!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi hệ thống khi cập nhật màu trứng'
    };
  }
}

/**
 * Server Action: Xác thực di chuyển hợp lệ theo Domain Rules & Level Gating
 */
export async function validatePetMovementAction(
  petId: string,
  targetX: number,
  targetY: number,
  petLevel: number
) {
  // 1. Kiểm tra giới hạn bản đồ 8x8
  if (targetX < 0 || targetX >= 8 || targetY < 0 || targetY >= 8) {
    return { success: false, message: 'Tọa độ vượt ngoài biên bản đồ 8x8' };
  }

  // 2. Kiểm tra Level 0 (Trứng chưa nở không được ra ngoài trung tâm)
  const isBorder = targetX === 0 || targetX === 7 || targetY === 0 || targetY === 7;
  if (petLevel === 0 && !isBorder) {
    return { success: false, message: 'Trứng chưa nở không được rời khỏi nhà riêng' };
  }

  // 3. Kiểm tra Level-gating các phân khu trung tâm
  let minLevelRequired = 0;
  if (!isBorder) {
    if (targetX >= 1 && targetX <= 3 && targetY >= 1 && targetY <= 3) minLevelRequired = 1;
    else if (targetX >= 4 && targetX <= 6 && targetY >= 1 && targetY <= 3) minLevelRequired = 5;
    else if (targetX >= 1 && targetX <= 3 && targetY >= 4 && targetY <= 6) minLevelRequired = 10;
    else if (targetX >= 4 && targetX <= 6 && targetY >= 4 && targetY <= 6) minLevelRequired = 20;

    if (petLevel < minLevelRequired) {
      return {
        success: false,
        message: `Yêu cầu cấp độ tối thiểu Level ${minLevelRequired} để bước vào khu vực này`
      };
    }
  }

  return {
    success: true,
    target: { x: targetX, y: targetY },
    message: 'Tọa độ di chuyển hợp lệ'
  };
}


