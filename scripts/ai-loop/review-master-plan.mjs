import fs from 'node:fs';
import path from 'node:path';
import { sendToChatGPTWeb } from './bridge-client.mjs';

async function reviewPlan() {
  console.log('🚀 Submitting Master Plan to ChatGPT Web Luna for formal architectural review...');
  const taskId = 'TASK-MULTI-COLUMN-ACTIVITY-MONITOR-001';

  const planPath = path.join(process.cwd(), '.ai', 'plans', '20261001_020500_PLAN_TASK-MULTI-COLUMN-MONITOR_MASTER-PLAN.md');
  const planContent = fs.readFileSync(planPath, 'utf8');

  const reviewPrompt = `
Bạn là Senior Principal Software Architect & Reviewer độc lập trong hệ thống Triad-AI Development Loop Orchestrator.
Dưới đây là BẢN KẾ HOẠCH MASTER (Master Plan) được lập cho nhiệm vụ:
"Nâng cấp Sổ theo dõi: Chế độ Một lần Nhiều cột & Xuất Báo Cáo Ma Trận Hoạt Động" (Mã Task: ${taskId}).

Nội dung Kế hoạch Master:
\`\`\`markdown
${planContent}
\`\`\`

YÊU CẦU ĐÁNH GIÁ THẨM ĐỊNH TỪ CHATGPT WEB LUNA:
1. Đánh giá tính hoàn thiện, khả thi và độ chặt chẽ của Kế hoạch Master theo 7 nguyên tắc kiến trúc (7 Pillars) và 3 Phase triển khai.
2. Xác nhận schema migration và API contracts có bất kỳ rủi ro nào đối với dữ liệu hiện tại không.
3. Đưa ra các chỉ dẫn chi tiết cụ thể cho Antigravity thực thi Phase 1, Phase 2, Phase 3 ngay trong đợt triển khai này.
4. Đưa ra KẾT LUẬN THẨM ĐỊNH (FINAL VERDICT): APPROVED_FOR_EXECUTION để Antigravity tiến hành code toàn diện.
`;

  try {
    const response = await sendToChatGPTWeb(reviewPrompt, taskId);
    console.log('✅ Plan review response received from ChatGPT Web Luna!');

    const outDir = path.join(process.cwd(), '.ai', 'reviews');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const reviewFile = path.join(outDir, `20261001_021000_REVIEW_${taskId}_PLAN_APPROVAL.md`);
    fs.writeFileSync(reviewFile, response, 'utf8');
    console.log(`📄 Saved Plan Review to: ${reviewFile}`);

    return { success: true, path: reviewFile, response };
  } catch (err) {
    console.error('❌ Plan review failed:', err);
    return { success: false, error: err.message };
  }
}

reviewPlan().then(res => {
  if (!res.success) {
    process.exit(1);
  }
  console.log('🎉 Plan review completed successfully.');
});
