import { QUEST_BANK, QuestDefinition } from './quest-bank';

export interface QuestSubmission {
  submissionId: string;
  questId: string;
  studentId: string;
  year: number;
  isoWeek: number;
  content: string;
  evidenceUrl: string;
  status: 'draft' | 'submitted' | 'approved' | 'revision_requested';
  submittedAt: string;
  updatedAt: string;
  feedback?: string;
  earnedXp?: number;
  earnedCoins?: number;
}

export function getISOWeekDetails(d: Date = new Date()): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (make Sunday 7)
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

// Simple deterministic hash for consistent pseudo-randomness
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Deterministically assigns 1 fixed quest per week for a student based on studentId, year, and ISO week.
 */
export function getWeeklyAssignedQuest(studentId: string, date: Date = new Date()): {
  quest: QuestDefinition;
  year: number;
  week: number;
} {
  const { year, week } = getISOWeekDetails(date);
  const seedStr = `${studentId}:${year}:${week}`;
  const hashVal = hashString(seedStr);

  // Pick deterministically from the 80 quests in the bank
  const questIndex = hashVal % QUEST_BANK.length;
  const quest = QUEST_BANK[questIndex];

  return { quest, year, week };
}

export function getStoredSubmission(studentId: string, questId: string, year: number, week: number): QuestSubmission | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`quest_sub_${studentId}_${year}_w${week}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return null;
}

export function saveStoredSubmission(submission: QuestSubmission): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `quest_sub_${submission.studentId}_${submission.year}_w${submission.isoWeek}`,
      JSON.stringify(submission)
    );
  } catch (e) {
    console.warn('Failed to save quest submission:', e);
  }
}
