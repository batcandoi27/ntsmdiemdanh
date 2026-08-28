import { createClient } from '@supabase/supabase-js';
import { StudentPet, PetEvolutionBranch, StudentQuestCompletion, StudentWorldPlot, VirtualShopItem } from '@/types/student-portal';

// Initialize Supabase admin client for backend operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ANONYMOUS_PREFIXES = [
  'Phượng Hoàng', 'Rồng Lửa', 'Kỳ Lân', 'Sư Tử Vàng', 'Gấu Bắc Cực',
  'Hổ Trắng', 'Đại Bàng', 'Cá Voi Xanh', 'Sói Băng', 'Hươu Thần',
  'Phi Hành Gia', 'Pháp Sư', 'Hiệp Sĩ', 'Chiến Binh', 'Học Giả'
];

const ANONYMOUS_SUFFIXES = [
  'Băng', 'Lửa', 'Sấm Sét', 'Ngân Hà', 'Bão Tố',
  'Ánh Sáng', 'Bóng Đêm', 'Thời Không', 'Rừng Xanh', 'Công Nghệ'
];

export class StudentPortalService {
  /**
   * Tính toán mốc XP cần thiết để đạt cấp độ n
   * Công thức cấp số nhân: XP_n = 100 * (1.5)^(n-1)
   */
  static getXpRequiredForLevel(level: number): number {
    if (level <= 0) return 50; // Mốc ấp trứng
    return Math.round(100 * Math.pow(1.5, level - 1));
  }

  /**
   * Sinh bí danh ngẫu nhiên không trùng lặp (VD: Phượng Hoàng Băng #821)
   */
  static generateAnonymousName(): string {
    const prefix = ANONYMOUS_PREFIXES[Math.floor(Math.random() * ANONYMOUS_PREFIXES.length)];
    const suffix = ANONYMOUS_SUFFIXES[Math.floor(Math.random() * ANONYMOUS_SUFFIXES.length)];
    const code = Math.floor(100 + Math.random() * 900);
    return `${prefix} ${suffix} #${code}`;
  }

  /**
   * Lấy hoặc khởi tạo Thú Cưng SVG ẩn danh cho học sinh
   */
  static async getOrCreateStudentPet(studentId: string, classId: string): Promise<StudentPet> {
    try {
      const { data: existingPet, error: fetchErr } = await supabase
        .from('student_pets')
        .select('*')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .maybeSingle();

      if (existingPet && !fetchErr) {
        return this.evaluatePetDecay(existingPet as StudentPet);
      }

      // Tạo mới thú cưng ở giai đoạn Trứng (Level 0)
      const anonymousName = this.generateAnonymousName();
      const branches: PetEvolutionBranch[] = ['cosmic', 'nature', 'cyber'];
      const defaultBranch = branches[Math.floor(Math.random() * branches.length)];

      const newPetPayload: Partial<StudentPet> = {
        student_id: studentId,
        class_id: classId,
        anonymous_name: anonymousName,
        anonymous_avatar_code: `${defaultBranch}_egg`,
        evolution_branch: defaultBranch,
        level: 0, // Trứng nguyên vẹn
        current_xp: 0,
        vitality_percent: 100,
        streak_days: 1,
        is_hibernating: false,
        total_coins: 10,
        last_activity_at: new Date().toISOString()
      };

      const { data: createdPet, error: insertErr } = await supabase
        .from('student_pets')
        .insert(newPetPayload)
        .select()
        .single();

      if (insertErr || !createdPet) {
        // Fallback in-memory nếu DB chưa sẵn sàng
        return {
          id: 'mock-pet-' + studentId,
          ...newPetPayload
        } as StudentPet;
      }

      // Khởi tạo ô đất trong Metaverse 2D cho học sinh
      await this.initWorldPlot(classId, createdPet.id);

      return createdPet as StudentPet;
    } catch {
      return {
        id: 'mock-pet-' + studentId,
        student_id: studentId,
        class_id: classId,
        anonymous_name: 'Phượng Hoàng Băng #821',
        anonymous_avatar_code: 'cosmic_egg',
        evolution_branch: 'cosmic',
        level: 0,
        current_xp: 0,
        vitality_percent: 100,
        streak_days: 1,
        is_hibernating: false,
        total_coins: 10,
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Đánh giá và áp dụng cơ chế suy thoái / trừ lùi cấp độ khi học sinh lười
   * - 7 ngày không hoạt động: Vitality giảm xuống 50%
   * - 30 ngày không hoạt động: Ngủ đông & Trừ lùi 2 cấp độ
   */
  static async evaluatePetDecay(pet: StudentPet): Promise<StudentPet> {
    const lastActive = new Date(pet.last_activity_at || pet.updated_at || Date.now()).getTime();
    const now = Date.now();
    const daysInactive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

    let updated = false;
    let newVitality = pet.vitality_percent;
    let newLevel = pet.level;
    let isHibernating = pet.is_hibernating;

    if (daysInactive >= 30 && !pet.is_hibernating) {
      // 30 ngày bỏ bê: Ngủ đông và trừ lùi 2 cấp độ
      isHibernating = true;
      newLevel = Math.max(0, pet.level - 2);
      newVitality = 20;
      updated = true;
    } else if (daysInactive >= 7 && pet.vitality_percent > 50) {
      // 7 ngày lười: Vitality giảm xuống 50%
      newVitality = 50;
      updated = true;
    }

    if (updated) {
      pet.vitality_percent = newVitality;
      pet.level = newLevel;
      pet.is_hibernating = isHibernating;

      await supabase
        .from('student_pets')
        .update({
          vitality_percent: newVitality,
          level: newLevel,
          is_hibernating: isHibernating,
          updated_at: new Date().toISOString()
        })
        .eq('id', pet.id);
    }

    return pet;
  }

  /**
   * Cộng XP và Coin với xử lý thăng cấp và hồi phục sinh lực
   */
  static async awardXpAndCoins(
    petId: string,
    xpAward: number,
    coinsAward: number,
    sourceType: string,
    referenceId?: string
  ): Promise<{ newLevel: number; newXp: number; newCoins: number; leveledUp: boolean }> {
    const { data: pet } = await supabase
      .from('student_pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (!pet) {
      return { newLevel: 1, newXp: xpAward, newCoins: coinsAward, leveledUp: false };
    }

    let currentLevel = pet.level;
    let currentXp = pet.current_xp + xpAward;
    let currentCoins = pet.total_coins + coinsAward;
    let leveledUp = false;

    // Kiểm tra thăng cấp
    while (true) {
      const requiredXp = this.getXpRequiredForLevel(currentLevel + 1);
      if (currentXp >= requiredXp) {
        currentLevel += 1;
        currentXp -= requiredXp;
        leveledUp = true;
      } else {
        break;
      }
    }

    // Cập nhật lại sinh lực 100% khi học sinh làm bài tích cực
    await supabase
      .from('student_pets')
      .update({
        level: currentLevel,
        current_xp: currentXp,
        total_coins: currentCoins,
        vitality_percent: 100,
        is_hibernating: false,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', petId);

    // Ghi sổ cái bất biến XP Ledger
    const idempotencyKey = `XP-${petId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await supabase.from('student_xp_ledger').insert({
      student_id: pet.student_id,
      pet_id: petId,
      delta_xp: xpAward,
      delta_coins: coinsAward,
      source_type: sourceType,
      reference_id: referenceId,
      idempotency_key: idempotencyKey
    });

    return {
      newLevel: currentLevel,
      newXp: currentXp,
      newCoins: currentCoins,
      leveledUp
    };
  }

  /**
   * Kiểm tra giới hạn hoàn thành trong ngày (Daily Quest Cap)
   * Mặc định tối đa 4 nhiệm vụ/ngày để chống spam cày điểm
   */
  static async checkDailyCap(studentId: string, maxDailyCap = 4): Promise<{ canSubmit: boolean; completedToday: number }> {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('student_quest_completions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`);

    const completedToday = count || 0;
    return {
      canSubmit: completedToday < maxDailyCap,
      completedToday
    };
  }

  /**
   * Khởi tạo vị trí ô đất Metaverse 2D cho học sinh trong lớp
   */
  static async initWorldPlot(classId: string, petId: string): Promise<void> {
    // Tìm ô đất trống trong lưới 8x8 (0..7)
    const { data: occupiedPlots } = await supabase
      .from('student_world_plots')
      .select('grid_x, grid_y')
      .eq('class_id', classId);

    const occupiedSet = new Set((occupiedPlots || []).map(p => `${p.grid_x},${p.grid_y}`));

    let targetX = 0;
    let targetY = 0;
    let found = false;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!occupiedSet.has(`${c},${r}`)) {
          targetX = c;
          targetY = r;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      await supabase.from('student_world_plots').insert({
        class_id: classId,
        pet_id: petId,
        grid_x: targetX,
        grid_y: targetY,
        plot_theme: 'meadow',
        building_item_code: 'cozy_cabin',
        decorations: []
      });
    }
  }

  /**
   * Lấy danh sách ô đất của cả lớp phục vụ hiển thị Metaverse Làng Lớp Học
   */
  static async getClassWorldPlots(classId: string): Promise<StudentWorldPlot[]> {
    const { data, error } = await supabase
      .from('student_world_plots')
      .select(`
        id, class_id, pet_id, grid_x, grid_y, plot_theme, building_item_code, decorations, updated_at,
        student_pets ( anonymous_name, level, evolution_branch )
      `)
      .eq('class_id', classId);

    if (error || !data) return [];

    return data.map((item: any) => ({
      id: item.id,
      class_id: item.class_id,
      pet_id: item.pet_id,
      grid_x: item.grid_x,
      grid_y: item.grid_y,
      plot_theme: item.plot_theme,
      building_item_code: item.building_item_code,
      decorations: item.decorations || [],
      updated_at: item.updated_at,
      anonymous_name: item.student_pets?.anonymous_name || 'Học sinh ẩn danh',
      pet_level: item.student_pets?.level ?? 1,
      pet_branch: item.student_pets?.evolution_branch || 'cosmic'
    }));
  }

  /**
   * Mua vật phẩm từ Shop và đặt vào ô đất của mình
   */
  static async purchaseShopItem(petId: string, itemCode: string): Promise<{ success: boolean; message: string }> {
    const { data: item } = await supabase.from('virtual_shop_items').select('*').eq('item_code', itemCode).single();
    const { data: pet } = await supabase.from('student_pets').select('*').eq('id', petId).single();

    if (!item || !pet) return { success: false, message: 'Không tìm thấy vật phẩm hoặc thú cưng.' };
    if (pet.total_coins < item.price_coins) return { success: false, message: 'Bạn không đủ Coin để mua vật phẩm này.' };
    if (pet.level < item.required_level) return { success: false, message: `Yêu cầu cấp độ tối thiểu Level ${item.required_level}.` };

    // Trừ coin và cập nhật plot
    await supabase.from('student_pets').update({ total_coins: pet.total_coins - item.price_coins }).eq('id', petId);

    if (item.category === 'building') {
      await supabase.from('student_world_plots').update({ building_item_code: itemCode }).eq('pet_id', petId);
    } else {
      const { data: plot } = await supabase.from('student_world_plots').select('decorations').eq('pet_id', petId).single();
      const currentDecors = plot?.decorations || [];
      currentDecors.push({ item_code: itemCode, x: Math.floor(Math.random() * 3), y: Math.floor(Math.random() * 3) });
      await supabase.from('student_world_plots').update({ decorations: currentDecors }).eq('pet_id', petId);
    }

    return { success: true, message: `Mua thành công ${item.item_name}!` };
  }
}
