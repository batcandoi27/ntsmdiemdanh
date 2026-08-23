export interface HomeroomPresetItem {
  id: string;
  category: string;
  label: string;
  description: string;
  points_delta?: number;
  type?: 'positive' | 'violation' | 'neutral';
  severity?: 'minor' | 'medium' | 'serious';
  suggested_action?: string;
  applicable_form?: 'event' | 'weekly_plan' | 'handbook' | 'intervention' | 'parent_contact';
}

/**
 * Danh mục Gợi ý nhập liệu 1-chạm chuẩn nghiệp vụ THCS
 */
export const HOMEROOM_PRESETS: HomeroomPresetItem[] = [
  // --- 1. KHEN THƯỞNG & VIỆC TỐT (+ ĐIỂM) ---
  {
    id: 'pos_1',
    category: 'Học tập',
    label: '⭐ Phát biểu tích cực (+2đ)',
    description: 'Hăng hái phát biểu xây dựng bài, có tinh thần học tập gương mẫu',
    points_delta: 2,
    type: 'positive',
    severity: 'minor',
    suggested_action: 'Tuyên dương trước lớp trong giờ sinh hoạt',
    applicable_form: 'event'
  },
  {
    id: 'pos_2',
    category: 'Học tập',
    label: '💯 Đạt điểm 10 kiểm tra (+5đ)',
    description: 'Đạt điểm tối đa trong bài kiểm tra định kỳ / đánh giá thường xuyên',
    points_delta: 5,
    type: 'positive',
    severity: 'minor',
    suggested_action: 'Ghi nhận hoa điểm mười thi đua',
    applicable_form: 'event'
  },
  {
    id: 'pos_3',
    category: 'Đạo đức',
    label: '🤝 Giúp bạn tiến bộ (+3đ)',
    description: 'Nhiệt tình phụ đạo, kèm cặp bạn cùng bàn vươn lên trong học tập',
    points_delta: 3,
    type: 'positive',
    severity: 'minor',
    suggested_action: 'Cộng điểm rèn luyện cá nhân và tổ',
    applicable_form: 'event'
  },
  {
    id: 'pos_4',
    category: 'Phong trào',
    label: '🏆 Nhặt được của rơi trả lại (+5đ)',
    description: 'Nhặt được tài sản/tiền bạc trong khuôn viên trường và báo cáo giao nộp',
    points_delta: 5,
    type: 'positive',
    severity: 'minor',
    suggested_action: 'Tuyên dương dưới cờ và thông báo phụ huynh',
    applicable_form: 'event'
  },
  {
    id: 'pos_5',
    category: 'Vệ sinh - Lao động',
    label: '🧹 Trực nhật xuất sắc (+2đ)',
    description: 'Vệ sinh lớp học sạch sẽ, kê bàn ghế ngay ngắn đúng giờ',
    points_delta: 2,
    type: 'positive',
    severity: 'minor',
    suggested_action: 'Cộng điểm thi đua tổ',
    applicable_form: 'event'
  },

  // --- 2. VI PHẠM NỀ NẾP & NHẮC NHỞ (- ĐIỂM) ---
  {
    id: 'vio_1',
    category: 'Kỷ luật',
    label: '⚠️ Nói chuyện riêng (-2đ)',
    description: 'Nói chuyện riêng, mất tập trung nhiều lần trong giờ học',
    points_delta: -2,
    type: 'violation',
    severity: 'minor',
    suggested_action: 'Nhắc nhở và phân công lớp phó kỷ luật theo dõi',
    applicable_form: 'event'
  },
  {
    id: 'vio_2',
    category: 'Học tập',
    label: '📚 Quên bài tập / Đồ dùng (-2đ)',
    description: 'Không làm bài tập về nhà hoặc thiếu sách vở, dụng cụ học tập',
    points_delta: -2,
    type: 'violation',
    severity: 'minor',
    suggested_action: 'Yêu cầu hoàn thành bù và nộp vào buổi học sau',
    applicable_form: 'event'
  },
  {
    id: 'vio_3',
    category: 'Chuyên cần',
    label: '⏰ Đi học muộn (-1đ)',
    description: 'Đến lớp sau hiệu lệnh trống vào học, trễ giờ điểm danh',
    points_delta: -1,
    type: 'violation',
    severity: 'minor',
    suggested_action: 'Nhắc nhở và liên hệ phụ huynh nếu tái phạm 3 lần',
    applicable_form: 'event'
  },
  {
    id: 'vio_4',
    category: 'Tác phong',
    label: '👕 Sai đồng phục / Khăn quàng (-2đ)',
    description: 'Mặc sai quy định đồng phục, không đeo khăn quàng đỏ / bảng tên',
    points_delta: -2,
    type: 'violation',
    severity: 'minor',
    suggested_action: 'Yêu cầu chỉnh đốn tác phong đúng nội quy',
    applicable_form: 'event'
  },
  {
    id: 'vio_5',
    category: 'Kỷ luật nghiêm trọng',
    label: '🚫 Dùng điện thoại trong giờ (-5đ)',
    description: 'Sử dụng điện thoại/thiết bị điện tử khi chưa có sự cho phép của giáo viên',
    points_delta: -5,
    type: 'violation',
    severity: 'medium',
    suggested_action: 'Tạm giữ thiết bị và mời phụ huynh đến nhận bàn giao',
    applicable_form: 'event'
  },

  // --- 3. KẾ HOẠCH TUẦN & TRỌNG TÂM ---
  {
    id: 'plan_1',
    category: 'Kế hoạch tuần',
    label: '📌 Sinh hoạt chủ nhiệm đầu tuần',
    description: 'Đánh giá nề nếp tuần qua, triển khai phong trào thi đua tuần mới',
    applicable_form: 'weekly_plan'
  },
  {
    id: 'plan_2',
    category: 'Kế hoạch tuần',
    label: '🔍 Kiểm tra nề nếp & đồng phục',
    description: 'Kiểm tra đột xuất vệ sinh lớp học, đồng phục, bảng tên và sách vở',
    applicable_form: 'weekly_plan'
  },
  {
    id: 'plan_3',
    category: 'Kế hoạch tuần',
    label: '📞 Liên hệ gia đình học sinh cần hỗ trợ',
    description: 'Trao đổi với phụ huynh học sinh có biểu hiện sa sút học tập hoặc nghỉ học nhiều',
    applicable_form: 'weekly_plan'
  },
  {
    id: 'plan_4',
    category: 'Kế hoạch tuần',
    label: '👥 Họp Ban cán sự & Tổ trưởng',
    description: 'Giao ban nhanh với cán sự lớp để nắm bắt tình hình các tổ',
    applicable_form: 'weekly_plan'
  }
];

/**
 * Mẫu văn bản hoàn chỉnh cho Sổ Chủ Nhiệm Số
 */
export const HANDBOOK_TEMPLATES = {
  strengths: [
    'Đa số học sinh chăm ngoan, lễ phép với thầy cô, hòa đồng giúp đỡ bạn bè. Ban cán sự lớp nhiệt tình, có tinh thần trách nhiệm cao. Đa số phụ huynh quan tâm sâu sát đến việc học của con em.',
    'Học sinh có ý thức tự giác học tập tốt, chấp hành nghiêm túc nội quy nhà trường. Lớp có truyền thống đoàn kết, tích cực tham gia các phong trào thi đua học tốt do Đội TNTP phát động.',
    'Tập thể lớp có nền tảng học lực khá đồng đều, nhiều học sinh có năng khiếu văn nghệ, thể dục thể thao và tư duy logic tốt.'
  ],
  challenges: [
    'Một số học sinh còn mải chơi, chưa tập trung chú ý nghe giảng. Còn vài trường hợp đi học muộn vào các ngày đầu tuần hoặc quên đồ dùng học tập.',
    'Còn một vài học sinh tiếp thu bài chậm, chưa có phương pháp học tập khoa học ở nhà. Điều kiện gia đình một số em còn khó khăn, cha mẹ bận công tác ít có thời gian kèm cặp.',
    'Kỹ năng tự quản của một số tổ trưởng còn hạn chế, cần giáo viên chủ nhiệm hướng dẫn thêm.'
  ],
  measures: [
    '1. Phân công đôi bạn cùng tiến, học sinh khá giỏi kèm học sinh yếu kém.\n2. Duy trì giao ban ban cán sự lớp vào thứ Sáu hàng tuần.\n3. Thường xuyên liên hệ với phụ huynh qua sổ liên lạc điện tử / Zalo để nắm bắt tình hình.\n4. Đổi mới giờ sinh hoạt lớp theo chủ đề sinh động, khích lệ gương sáng việc tốt.',
    '1. Tăng cường kiểm tra nề nếp đầu giờ học.\n2. Phối hợp chặt chẽ với Giáo viên bộ môn để kịp thời uốn nắn học sinh mất tập trung.\n3. Khen thưởng kịp thời các cá nhân và tổ có tiến bộ vượt bậc.'
  ]
};
