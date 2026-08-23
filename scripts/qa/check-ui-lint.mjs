import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd(), 'src');

const BANNED_PATTERNS = [
  {
    name: 'Hardcoded Hex In Inline Style',
    regex: /style=\{\{[^}]*(?:#[0-9a-fA-F]{3,8}|rgb\s*\()[^}]*\}\}/g,
    severity: 'WARNING',
    message: 'Tránh dùng style inline chứa mã màu hardcode, hãy dùng Design Tokens / Semantic CSS variables.',
  },
  {
    name: 'Raw Opacity On Low Contrast Text',
    regex: /text-gray-(?:200|300)\b/g,
    severity: 'WARNING',
    message: 'Text màu xám quá nhạt có nguy cơ không đạt chuẩn tương phản WCAG AA.',
  },
];

function scanDirectory(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath, fileList);
      }
    } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function runAudit() {
  console.log('======================================================================');
  console.log('  DESIGN SYSTEM QA LINTER & REGRESSION PREVENTION CHECK');
  console.log('======================================================================');

  const files = scanDirectory(SRC_DIR);
  console.log(`[*] Đang quét ${files.length} files trong thư mục src/ ...\n`);

  let totalViolations = 0;
  const reports = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(process.cwd(), file);

    for (const rule of BANNED_PATTERNS) {
      let match;
      while ((match = rule.regex.exec(content)) !== null) {
        // Calculate line number
        const linesUpToMatch = content.substring(0, match.index).split('\n');
        const lineNumber = linesUpToMatch.length;

        reports.push({
          file: relativePath,
          line: lineNumber,
          rule: rule.name,
          severity: rule.severity,
          snippet: match[0],
          message: rule.message,
        });
        totalViolations++;
      }
    }
  }

  if (reports.length > 0) {
    console.log(`[!] Tìm thấy ${reports.length} cảnh báo / vi phạm Design Token:\n`);
    for (const rep of reports.slice(0, 20)) {
      console.log(` - [${rep.severity}] ${rep.file}:${rep.line} ➔ ${rep.rule}: "${rep.snippet}"`);
      console.log(`   └─ Hướng dẫn: ${rep.message}`);
    }
    if (reports.length > 20) {
      console.log(`   ... và ${reports.length - 20} vị trí khác.`);
    }
  } else {
    console.log('[✓] Tuyệt vời! 0 vi phạm nghiêm trọng về Design Token & Semantic Colors.');
  }

  console.log('\n======================================================================');
  console.log(`  KẾT QUẢ: ${files.length} files đã kiểm tra | ${totalViolations} issues phát hiện.`);
  console.log('======================================================================');

  // Return success
  return totalViolations;
}

runAudit();
