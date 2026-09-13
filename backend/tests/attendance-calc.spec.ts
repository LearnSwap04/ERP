import { describe, expect, it } from 'vitest';
import {
  attendancePercentage,
  classesCanMiss,
  DEFAULT_ATTENDANCE_THRESHOLD,
  targetAttendanceForPlan,
} from '../src/services/calculations';

describe('attendancePercentage', () => {
  it('returns zero summary for no records', () => {
    const s = attendancePercentage([]);
    expect(s.total).toBe(0);
    expect(s.percentage).toBe(0);
    expect(s.meetsThreshold).toBe(false);
  });

  it('counts 100% for all-present', () => {
    const s = attendancePercentage([{ status: 'PRESENT' }, { status: 'PRESENT' }]);
    expect(s.percentage).toBe(100);
    expect(s.meetsThreshold).toBe(true);
  });

  it('derives percentage as present over total', () => {
    const s = attendancePercentage([
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'ABSENT' },
    ]);
    expect(s.percentage).toBe(75);
    expect(s.present).toBe(3);
    expect(s.absent).toBe(1);
    expect(s.leave).toBe(0);
    expect(s.meetsThreshold).toBe(true); // 75 >= default 75
  });

  it('flags below-threshold attendance', () => {
    const s = attendancePercentage([
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'ABSENT' },
    ]);
    expect(s.percentage).toBe(80);
    expect(s.meetsThreshold).toBe(true);
    const low = attendancePercentage([{ status: 'PRESENT' }, { status: 'ABSENT' }, { status: 'ABSENT' }]);
    expect(low.meetsThreshold).toBe(false);
  });

  it('treats LEAVE as neither present nor absent', () => {
    const s = attendancePercentage([{ status: 'PRESENT' }, { status: 'LEAVE' }]);
    expect(s.leave).toBe(1);
    expect(s.percentage).toBe(50);
  });

  it('respects a custom threshold', () => {
    const s = attendancePercentage([{ status: 'PRESENT' }, { status: 'ABSENT' }], 90);
    expect(s.meetsThreshold).toBe(false);
  });
});

describe('classesCanMiss (bunk calculator)', () => {
  it('allows zero extra bunk when exactly at threshold', () => {
    expect(classesCanMiss(75, 100, DEFAULT_ATTENDANCE_THRESHOLD)).toBe(0);
  });

  it('allows floor((attended*100/threshold) - total) extra misses', () => {
    // 80/100 at 75% threshold -> can miss 6 more (80/106 = 75.5%), not 7 (74.8%).
    expect(classesCanMiss(80, 100, 75)).toBe(6);
  });

  it('returns 0 when already below threshold', () => {
    expect(classesCanMiss(70, 100, 75)).toBe(0);
    expect(classesCanMiss(70, 95, 75)).toBe(0);
  });

  it('never goes negative with high attendance', () => {
    expect(classesCanMiss(95, 100, 75)).toBe(26);
    expect(classesCanMiss(100, 100, 75)).toBeGreaterThan(0);
  });

  it('handles empty history as zero allowed', () => {
    expect(classesCanMiss(0, 0, 75)).toBe(0);
  });

  it('returns Infinity when threshold is zero (no requirement)', () => {
    expect(classesCanMiss(1, 1, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('targetAttendanceForPlan', () => {
  it('computes how many classes to attend to afford a plan', () => {
    // To skip 4 classes and stay >=75%: attend 3.
    expect(targetAttendanceForPlan(4, 75)).toBe(3);
    expect(targetAttendanceForPlan(0, 75)).toBe(0);
  });
});