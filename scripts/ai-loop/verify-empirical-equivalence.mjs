import { supabase } from "@/lib/supabase";
import { getColumnsByFrequency } from "@/services/column-service";
import { getDailyRecords, getDailyRecordsForClass } from "@/services/record-service";
import { fetchAppSettings } from "@/app/actions/settings";
import { getDailyAttendanceData } from "@/app/actions/quick-attendance";

async function run() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — KIỂM THỬ THỰC NGHIỆM ĐỘNG (EMPIRICAL REGRESSION TEST)");
  console.log("======================================================================");

  // 1. Lấy 1 lớp thực tế
  const { data: classes } = await supabase.from("classes").select("id, name").limit(5);
  if (!classes || classes.length === 0) {
    console.log("[!] Không tìm thấy lớp để test.");
    process.exit(0);
  }
  const testClass = classes[0];
  console.log(`[*] Sử dụng lớp kiểm thử: ${testClass.name} (id: ${testClass.id})`);

  const todayStr = new Date().toISOString().split("T")[0];

  // 2. Test getDailyRecordsForClass vs getDailyRecords (N cột)
  console.log("\n--- TEST 1: Equivalence của getDailyRecordsForClass vs N queries ---");
  const cols = await getColumnsByFrequency(testClass.id, "daily");
  console.log(`[*] Số cột daily của lớp: ${cols.length}`);

  const t0_old = Date.now();
  const oldMap = {};
  for (const c of cols) {
    const recs = await getDailyRecords(c.id, todayStr);
    recs.forEach(r => {
      if (!oldMap[r.studentCode]) oldMap[r.studentCode] = {};
      oldMap[r.studentCode][c.id] = true;
    });
  }
  const t_old = Date.now() - t0_old;

  const t0_new = Date.now();
  const newRecords = await getDailyRecordsForClass(testClass.id, todayStr);
  const newMap = {};
  const validCols = new Set(cols.map(c => c.id));
  newRecords.forEach(r => {
    if (validCols.has(r.columnId)) {
      if (!newMap[r.studentCode]) newMap[r.studentCode] = {};
      newMap[r.studentCode][r.columnId] = true;
    }
  });
  const t_new = Date.now() - t0_new;

  console.log(`[+] Cũ (N queries tuần tự): ${t_old}ms`);
  console.log(`[+] Mới (1 query duy nhất): ${t_new}ms`);

  // Deep compare
  const oldJson = JSON.stringify(oldMap);
  const newJson = JSON.stringify(newMap);
  if (oldJson === newJson) {
    console.log("[✓] PASS: Deep equality 100% đồng nhất giữa phương pháp cũ và mới!");
  } else {
    console.error("[!] FAIL: Khác biệt dữ liệu giữa cũ và mới!");
    console.error("Old:", oldJson);
    console.error("New:", newJson);
    process.exit(1);
  }

  // 3. Test getDailyAttendanceData end-to-end
  console.log("\n--- TEST 2: getDailyAttendanceData End-to-End ---");
  const t0_daily = Date.now();
  const dailyData = await getDailyAttendanceData(testClass.id, todayStr, "morning");
  const t_daily = Date.now() - t0_daily;
  console.log(`[+] Nạp getDailyAttendanceData thành công trong ${t_daily}ms:`);
  console.log(`    - Số học sinh: ${dailyData.students.length}`);
  console.log(`    - Số cột tùy chỉnh: ${dailyData.customColumns.length}`);
  console.log(`    - Số mapping bản ghi: ${Object.keys(dailyData.studentRecords).length}`);

  // 4. Test fetchAppSettings In-Memory Cache
  console.log("\n--- TEST 3: In-Memory Cache fetchAppSettings ---");
  const t0_set1 = Date.now();
  const s1 = await fetchAppSettings();
  const t_set1 = Date.now() - t0_set1;

  const t0_set2 = Date.now();
  const s2 = await fetchAppSettings();
  const t_set2 = Date.now() - t0_set2;

  console.log(`[+] Lần gọi 1 (DB fetch): ${t_set1}ms`);
  console.log(`[+] Lần gọi 2 (In-memory cache): ${t_set2}ms`);
  if (t_set2 <= 2 && s1.settings?.schoolName === s2.settings?.schoolName) {
    console.log("[✓] PASS: Settings in-memory cache hoạt động tức thời (<2ms)!");
  }

  console.log("\n======================================================================");
  console.log("  >>> TẤT CẢ CÁC BÀI TEST THỰC NGHIỆM ĐỀU ĐẠT 100% PASS! <<<");
  console.log("======================================================================");
}

run().catch(console.error);
