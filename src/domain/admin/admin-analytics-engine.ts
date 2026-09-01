/**
 * ADMIN & EXECUTIVE OPERATIONS ANALYTICS ENGINE (BGH & MONITOR)
 * Domain Engine v2.0 for High-Performance Educational Administration
 *
 * Adheres to:
 * - INV-DATA-02: Optimistic Concurrency & Data Integrity
 * - INV-PERF-04: O(N) Streamlined Aggregation, Zero Division Safety, Zero Memory Leaks
 * - INV-VAL-05: Strict Type Standardization & Defensive Defaults
 * - INV-SEC-06: Multi-Tenant School Isolation (`school_id NOT NULL`) & RBAC Enforcement
 */

export type StudentRiskLevel = "NORMAL" | "ATTENTION" | "HIGH_RISK" | "CRITICAL";

export interface AttendanceRecordItem {
  studentId: string;
  studentName: string;
  className: string;
  grade: string | number;
  status: "PRESENT" | "ABSENT_UNEXCUSED" | "ABSENT_EXCUSED" | "LATE" | "VIOLATION";
  date: string;
  reason?: string;
}

export interface StudentRiskProfile {
  studentId: string;
  studentName: string;
  displayName: string;
  className: string;
  grade: string;
  unexcusedCount: number;
  excusedCount: number;
  lateCount: number;
  violationCount: number;
  riskScore: number;
  riskLevel: StudentRiskLevel;
  interventionRecommended: boolean;
}

export interface AttendanceOverviewStats {
  totalActiveStudents: number;
  activeSchoolDays: number;
  totalExpectedStudentDays: number;
  totalPresentStudentDays: number;
  absentUnexcusedCount: number;
  absentExcusedCount: number;
  totalAbsentCount: number;
  lateCount: number;
  violationCount: number;
  attendanceRate: number;
  previousAttendanceRate?: number;
  rateDelta?: number;
  rateDeltaDirection: "UP" | "DOWN" | "EQUAL";
}

export interface GradeAggregatedStats {
  gradeKey: string;
  gradeName: string;
  totalStudents: number;
  attendanceRate: number;
  absentUnexcused: number;
  absentExcused: number;
  late: number;
  violation: number;
  riskStudentsCount: number;
}

export interface SparklineTrendResult {
  series: number[];
  movingAverage: number[];
  direction: "IMPROVING" | "STABLE" | "WORSENING";
  min: number;
  max: number;
  latest: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  mean: number;
  stdDev: number;
  zScore: number;
  severity: "NONE" | "LOW" | "MODERATE" | "SEVERE";
  message: string;
}

export interface AuditTrailRecord {
  id: string;
  action: string;
  actorId: string;
  actorRole: string;
  schoolId: string;
  timestampIso: string;
  timestampGmt7: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. PRIVACY & ANONYMIZATION UTILITY (MEETING / PROJECTOR SAFE)
// ---------------------------------------------------------------------------
export function maskStudentName(fullName: string): string {
  if (!fullName || typeof fullName !== "string") return "Học sinh";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const name = parts[0];
    return name.length > 2 ? `${name[0]}**` : name;
  }
  return parts
    .map((p, idx) => {
      if (idx === 0 || idx === parts.length - 1) {
        return p.length > 2 ? `${p.slice(0, 2)}**` : `${p[0]}*`;
      }
      return "*";
    })
    .join(" ");
}

// ---------------------------------------------------------------------------
// 2. ATTENDANCE & ABSENCE AGGREGATION (ZERO DIVISION PROTECTED)
// ---------------------------------------------------------------------------
export function calculateAttendanceOverview(
  records: AttendanceRecordItem[],
  totalActiveStudents: number,
  activeSchoolDays: number,
  previousPeriodRate?: number
): AttendanceOverviewStats {
  const safeStudents = Math.max(0, Math.floor(totalActiveStudents || 0));
  const safeDays = Math.max(0, Math.floor(activeSchoolDays || 0));
  const totalExpected = safeStudents * safeDays;

  let absentUnexcused = 0;
  let absentExcused = 0;
  let late = 0;
  let violation = 0;

  if (Array.isArray(records)) {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!r || !r.status) continue;
      switch (r.status) {
        case "ABSENT_UNEXCUSED":
          absentUnexcused++;
          break;
        case "ABSENT_EXCUSED":
          absentExcused++;
          break;
        case "LATE":
          late++;
          break;
        case "VIOLATION":
          violation++;
          break;
      }
    }
  }

  const totalAbsent = absentUnexcused + absentExcused;
  const presentDays = Math.max(0, totalExpected - totalAbsent);

  // Defensive Zero Division Check
  let attendanceRate = 100;
  if (totalExpected > 0) {
    attendanceRate = Math.min(100, Math.max(0, Number(((presentDays / totalExpected) * 100).toFixed(2))));
  } else if (totalAbsent > 0) {
    attendanceRate = 0;
  }

  let rateDelta: number | undefined;
  let rateDeltaDirection: "UP" | "DOWN" | "EQUAL" = "EQUAL";

  if (typeof previousPeriodRate === "number" && !isNaN(previousPeriodRate)) {
    rateDelta = Number((attendanceRate - previousPeriodRate).toFixed(2));
    if (rateDelta > 0.05) rateDeltaDirection = "UP";
    else if (rateDelta < -0.05) rateDeltaDirection = "DOWN";
    else rateDeltaDirection = "EQUAL";
  }

  return {
    totalActiveStudents: safeStudents,
    activeSchoolDays: safeDays,
    totalExpectedStudentDays: totalExpected,
    totalPresentStudentDays: presentDays,
    absentUnexcusedCount: absentUnexcused,
    absentExcusedCount: absentExcused,
    totalAbsentCount: totalAbsent,
    lateCount: late,
    violationCount: violation,
    attendanceRate,
    previousAttendanceRate: previousPeriodRate,
    rateDelta,
    rateDeltaDirection,
  };
}

// ---------------------------------------------------------------------------
// 3. STUDENT EARLY-WARNING RISK SCORING
// ---------------------------------------------------------------------------
export function calculateStudentRiskProfiles(
  records: AttendanceRecordItem[],
  options: { anonymize?: boolean; minThresholdScore?: number } = {}
): StudentRiskProfile[] {
  const map = new Map<string, {
    studentId: string;
    studentName: string;
    className: string;
    grade: string;
    unexcused: number;
    excused: number;
    late: number;
    violation: number;
  }>();

  if (Array.isArray(records)) {
    for (const r of records) {
      if (!r || !r.studentId) continue;
      let entry = map.get(r.studentId);
      if (!entry) {
        entry = {
          studentId: r.studentId,
          studentName: r.studentName || "Chưa đặt tên",
          className: r.className || "Chưa gán",
          grade: String(r.grade || "Khác"),
          unexcused: 0,
          excused: 0,
          late: 0,
          violation: 0,
        };
        map.set(r.studentId, entry);
      }

      if (r.status === "ABSENT_UNEXCUSED") entry.unexcused++;
      else if (r.status === "ABSENT_EXCUSED") entry.excused++;
      else if (r.status === "LATE") entry.late++;
      else if (r.status === "VIOLATION") entry.violation++;
    }
  }

  const profiles: StudentRiskProfile[] = [];
  const minThreshold = options.minThresholdScore ?? 0;

  for (const entry of Array.from(map.values())) {
    // Weighted scoring formula: Unexcused (3x), Excused (1x), Late (0.5x), Violation (2x)
    const rawScore =
      entry.unexcused * 3.0 +
      entry.excused * 1.0 +
      entry.late * 0.5 +
      entry.violation * 2.0;

    const riskScore = Number(rawScore.toFixed(1));

    let riskLevel: StudentRiskLevel = "NORMAL";
    if (riskScore >= 10.0 || entry.unexcused >= 3) {
      riskLevel = "CRITICAL";
    } else if (riskScore >= 6.0 || entry.unexcused >= 2) {
      riskLevel = "HIGH_RISK";
    } else if (riskScore >= 3.0 || entry.late >= 3) {
      riskLevel = "ATTENTION";
    }

    if (riskScore >= minThreshold) {
      profiles.push({
        studentId: entry.studentId,
        studentName: entry.studentName,
        displayName: options.anonymize ? maskStudentName(entry.studentName) : entry.studentName,
        className: entry.className,
        grade: entry.grade,
        unexcusedCount: entry.unexcused,
        excusedCount: entry.excused,
        lateCount: entry.late,
        violationCount: entry.violation,
        riskScore,
        riskLevel,
        interventionRecommended: riskLevel === "HIGH_RISK" || riskLevel === "CRITICAL",
      });
    }
  }

  // Deterministic sorting: Highest risk score first, then alphabetically
  profiles.sort((a, b) => {
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    return a.studentName.localeCompare(b.studentName, "vi");
  });

  return profiles;
}

// ---------------------------------------------------------------------------
// 4. MULTI-GRADE AGGREGATION & LEADERBOARDS (O(N) STREAMLINED)
// ---------------------------------------------------------------------------
export function aggregateGradeStatistics(
  records: AttendanceRecordItem[],
  studentRoster: Array<{ studentId: string; grade: string | number; className: string }>
): GradeAggregatedStats[] {
  const gradeMap = new Map<string, {
    gradeKey: string;
    gradeName: string;
    studentIds: Set<string>;
    absentUnexcused: number;
    absentExcused: number;
    late: number;
    violation: number;
  }>();

  // 1. Populate Roster
  if (Array.isArray(studentRoster)) {
    for (const s of studentRoster) {
      const gKey = String(s.grade || "Khối khác").trim();
      if (!gradeMap.has(gKey)) {
        gradeMap.set(gKey, {
          gradeKey: gKey,
          gradeName: gKey.startsWith("Khối") ? gKey : `Khối ${gKey}`,
          studentIds: new Set<string>(),
          absentUnexcused: 0,
          absentExcused: 0,
          late: 0,
          violation: 0,
        });
      }
      gradeMap.get(gKey)!.studentIds.add(s.studentId);
    }
  }

  // 2. Aggregate Records in O(N)
  if (Array.isArray(records)) {
    for (const r of records) {
      const gKey = String(r.grade || "Khối khác").trim();
      let gEntry = gradeMap.get(gKey);
      if (!gEntry) {
        gEntry = {
          gradeKey: gKey,
          gradeName: gKey.startsWith("Khối") ? gKey : `Khối ${gKey}`,
          studentIds: new Set<string>(),
          absentUnexcused: 0,
          absentExcused: 0,
          late: 0,
          violation: 0,
        };
        gradeMap.set(gKey, gEntry);
      }

      if (r.status === "ABSENT_UNEXCUSED") gEntry.absentUnexcused++;
      else if (r.status === "ABSENT_EXCUSED") gEntry.absentExcused++;
      else if (r.status === "LATE") gEntry.late++;
      else if (r.status === "VIOLATION") gEntry.violation++;
    }
  }

  const result: GradeAggregatedStats[] = [];

  for (const [key, val] of Array.from(gradeMap.entries())) {
    const totalStudents = val.studentIds.size || 1;
    // Approximating rate assuming standard 5-day cycle if not detailed
    const totalPossible = totalStudents * 5;
    const totalAbsent = val.absentUnexcused + val.absentExcused;
    const rate = totalPossible > 0
      ? Math.max(0, Math.min(100, Number((((totalPossible - totalAbsent) / totalPossible) * 100).toFixed(2))))
      : 100;

    result.push({
      gradeKey: key,
      gradeName: val.gradeName,
      totalStudents: val.studentIds.size,
      attendanceRate: rate,
      absentUnexcused: val.absentUnexcused,
      absentExcused: val.absentExcused,
      late: val.late,
      violation: val.violation,
      riskStudentsCount: val.absentUnexcused >= 2 ? 1 : 0,
    });
  }

  // Natural grade sort (10, 11, 12, etc.)
  result.sort((a, b) => a.gradeKey.localeCompare(b.gradeKey, undefined, { numeric: true }));

  return result;
}

// ---------------------------------------------------------------------------
// 5. SPARKLINE TREND SMOOTHING & DIRECTION DETECTOR
// ---------------------------------------------------------------------------
export function generateSparklineTrends(series: number[], windowSize = 3): SparklineTrendResult {
  const sanitized = (Array.isArray(series) ? series : []).map((val) => (typeof val === "number" && !isNaN(val) ? val : 0));
  if (sanitized.length === 0) {
    return {
      series: [0],
      movingAverage: [0],
      direction: "STABLE",
      min: 0,
      max: 0,
      latest: 0,
    };
  }

  const movingAverage: number[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const windowSlice = sanitized.slice(start, i + 1);
    const avg = windowSlice.reduce((sum, v) => sum + v, 0) / windowSlice.length;
    movingAverage.push(Number(avg.toFixed(2)));
  }

  const min = Math.min(...sanitized);
  const max = Math.max(...sanitized);
  const latest = sanitized[sanitized.length - 1];

  let direction: "IMPROVING" | "STABLE" | "WORSENING" = "STABLE";
  if (sanitized.length >= 2) {
    const firstHalf = sanitized.slice(0, Math.floor(sanitized.length / 2));
    const secondHalf = sanitized.slice(Math.floor(sanitized.length / 2));
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / (secondHalf.length || 1);

    const diff = secondAvg - firstAvg;
    if (diff > 0.5) direction = "IMPROVING";
    else if (diff < -0.5) direction = "WORSENING";
  }

  return {
    series: sanitized,
    movingAverage,
    direction,
    min,
    max,
    latest,
  };
}

// ---------------------------------------------------------------------------
// 6. STATISTICAL ANOMALY DETECTION (Z-SCORE)
// ---------------------------------------------------------------------------
export function detectAttendanceAnomalies(
  historicalRates: number[],
  currentRate: number,
  thresholdStdDev = 2.0
): AnomalyDetectionResult {
  const validRates = (historicalRates || []).filter((r) => typeof r === "number" && !isNaN(r) && r >= 0 && r <= 100);

  if (validRates.length < 3) {
    return {
      isAnomaly: false,
      mean: currentRate,
      stdDev: 0,
      zScore: 0,
      severity: "NONE",
      message: "Chưa đủ dữ liệu lịch sử để phát hiện bất thường (cần >= 3 chu kỳ).",
    };
  }

  const mean = validRates.reduce((s, v) => s + v, 0) / validRates.length;
  const variance = validRates.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / validRates.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    const isDifferent = Math.abs(currentRate - mean) > 5;
    return {
      isAnomaly: isDifferent,
      mean: Number(mean.toFixed(2)),
      stdDev: 0,
      zScore: isDifferent ? 99 : 0,
      severity: isDifferent ? "MODERATE" : "NONE",
      message: isDifferent ? "Tỷ lệ chuyên cần thay đổi đột biến so với mức bất biến lịch sử." : "Bình thường",
    };
  }

  const zScore = (currentRate - mean) / stdDev;
  const absZ = Math.abs(zScore);
  const isAnomaly = absZ >= thresholdStdDev;

  let severity: "NONE" | "LOW" | "MODERATE" | "SEVERE" = "NONE";
  if (absZ >= 3.0) severity = "SEVERE";
  else if (absZ >= 2.0) severity = "MODERATE";
  else if (absZ >= 1.5) severity = "LOW";

  let message = "Tỷ lệ chuyên cần nằm trong giới hạn phương sai thông thường.";
  if (isAnomaly) {
    if (zScore < 0) {
      message = `CẢNH BÁO: Tỷ lệ chuyên cần giảm đột biến (Z-Score: ${zScore.toFixed(2)}, lệch ${Math.abs(currentRate - mean).toFixed(1)}%). Cần kiểm tra ngay dịch bệnh hoặc thời tiết xấu.`;
    } else {
      message = `Tỷ lệ chuyên cần tăng vượt bậc so với trung bình (Z-Score: +${zScore.toFixed(2)}).`;
    }
  }

  return {
    isAnomaly,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    zScore: Number(zScore.toFixed(2)),
    severity,
    message,
  };
}

// ---------------------------------------------------------------------------
// 7. MULTI-TENANT & RBAC SECURITY INVARIANT (INV-SEC-06)
// ---------------------------------------------------------------------------
export class MultiTenantSecurityViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MultiTenantSecurityViolation";
  }
}

export function enforceAdminTenantAndRBAC(
  actor: { id: string; role: string; schoolId?: string },
  targetSchoolId: string
): { authorized: boolean; effectiveSchoolId: string } {
  if (!targetSchoolId || typeof targetSchoolId !== "string" || targetSchoolId.trim().length === 0) {
    throw new MultiTenantSecurityViolation("INV-SEC-06: school_id NOT NULL vi phạm - targetSchoolId không được rỗng.");
  }

  if (!actor || !actor.id) {
    throw new MultiTenantSecurityViolation("INV-SEC-06: Người dùng chưa xác thực (Missing actor identity).");
  }

  const role = (actor.role || "").toUpperCase();
  const allowedRoles = ["ADMIN", "BGH", "PRINCIPAL", "SUPER_ADMIN"];

  if (!allowedRoles.includes(role)) {
    throw new MultiTenantSecurityViolation(`INV-SEC-06: Vai trò '${actor.role}' không có quyền truy cập Trang Quản Trị & Điều Hành BGH.`);
  }

  if (actor.schoolId && actor.schoolId !== targetSchoolId && role !== "SUPER_ADMIN") {
    throw new MultiTenantSecurityViolation(`INV-SEC-06: Vi phạm ranh giới trường học (Actor school ${actor.schoolId} !== Target school ${targetSchoolId}).`);
  }

  return {
    authorized: true,
    effectiveSchoolId: targetSchoolId,
  };
}

// ---------------------------------------------------------------------------
// 8. AUDIT TRAIL JOURNAL ENTRY GENERATOR (INV-AUDIT-01)
// ---------------------------------------------------------------------------
export function createAuditTrailEntry(
  action: string,
  actor: { id: string; role: string },
  schoolId: string,
  metadata: Record<string, unknown> = {}
): AuditTrailRecord {
  const now = new Date();
  const id = `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestampIso = now.toISOString();
  const timestampGmt7 = now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  return {
    id,
    action,
    actorId: actor.id,
    actorRole: actor.role,
    schoolId,
    timestampIso,
    timestampGmt7,
    metadata,
  };
}
