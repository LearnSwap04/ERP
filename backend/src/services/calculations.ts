/**
 * Pure business-logic functions for attendance and grading.
 * Kept free of I/O so they can be unit-tested in isolation (backend/tests) and reused by the seed.
 */

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE';

export const DEFAULT_ATTENDANCE_THRESHOLD = 75;

export interface AttendanceInput {
  status: AttendanceStatus;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  meetsThreshold: boolean;
}

export function attendancePercentage(
  records: AttendanceInput[],
  threshold: number = DEFAULT_ATTENDANCE_THRESHOLD,
): AttendanceSummary {
  const total = records.length;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const leave = total - present - absent;
  const percentage = total === 0 ? 0 : (present / total) * 100;
  return {
    total,
    present,
    absent,
    leave,
    percentage: round2(percentage),
    meetsThreshold: percentage >= threshold,
  };
}

/**
 * "Bunk calculator": how many classes the student can still miss and remain at/above `threshold`.
 * Given `attended` present out of `total` classes so far, we need attended/(total+m) >= threshold/100.
 * => m <= attended*100/threshold - total.
 */
export function classesCanMiss(
  attended: number,
  total: number,
  threshold: number = DEFAULT_ATTENDANCE_THRESHOLD,
): number {
  if (threshold <= 0) return Number.POSITIVE_INFINITY;
  if (total > 0 && (attended / total) * 100 < threshold) return 0;
  const m = Math.floor((attended * 100) / threshold - total);
  return Math.max(0, m);
}

/** Hours needed to still be allowed to miss `wantToMiss` classes and stay >= threshold. */
export function targetAttendanceForPlan(
  wantToMiss: number,
  threshold: number = DEFAULT_ATTENDANCE_THRESHOLD,
): number {
  if (threshold <= 0) return 0;
  return Math.max(0, Math.ceil((wantToMiss * threshold) / 100));
}

export const GRADE_POINTS: Record<string, number> = {
  S: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 0,
};

/** Map a percentage mark (0-100) to a grade letter. */
export function gradeForPercentage(pct: number): string {
  if (pct >= 90) return 'S';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

export function gradePointForLetter(grade: string): number {
  return GRADE_POINTS[grade] ?? 0;
}

export interface GradeInput {
  credits: number;
  gradePoint: number;
}

/** Semester grade point average, weighted by credits. */
export function sgpa(grades: GradeInput[]): number {
  const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0);
  if (totalCredits === 0) return 0;
  const weighted = grades.reduce((sum, g) => sum + g.credits * g.gradePoint, 0);
  return round2(weighted / totalCredits);
}

/** Cumulative GPA as the unweighted mean of semester SGPAs. */
export function cgpa(semesters: Array<{ sgpa: number }>): number {
  if (semesters.length === 0) return 0;
  const total = semesters.reduce((sum, s) => sum + s.sgpa, 0);
  return round2(total / semesters.length);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}