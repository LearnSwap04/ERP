import { describe, expect, it } from 'vitest';
import {
  cgpa,
  gradeForPercentage,
  gradePointForLetter,
  GRADE_POINTS,
  round2,
  sgpa,
} from '../src/services/calculations';

describe('gradeForPercentage', () => {
  it('maps percentage to grade letters at boundaries', () => {
    expect(gradeForPercentage(90)).toBe('S');
    expect(gradeForPercentage(89.9)).toBe('A');
    expect(gradeForPercentage(80)).toBe('A');
    expect(gradeForPercentage(79)).toBe('B');
    expect(gradeForPercentage(70)).toBe('B');
    expect(gradeForPercentage(60)).toBe('C');
    expect(gradeForPercentage(50)).toBe('D');
    expect(gradeForPercentage(40)).toBe('E');
    expect(gradeForPercentage(39)).toBe('F');
    expect(gradeForPercentage(0)).toBe('F');
  });

  it('grade points follow the S..F scale', () => {
    expect(gradePointForLetter('S')).toBe(10);
    expect(gradePointForLetter('A')).toBe(9);
    expect(gradePointForLetter('E')).toBe(5);
    expect(gradePointForLetter('F')).toBe(0);
    expect(gradePointForLetter('Z')).toBe(0);
    expect(GRADE_POINTS).toMatchObject({ S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0 });
  });
});

describe('sgpa', () => {
  it('returns 0 for no grades', () => {
    expect(sgpa([])).toBe(0);
  });

  it('returns 0 when total credits are zero', () => {
    expect(sgpa([{ credits: 0, gradePoint: 9 }])).toBe(0);
  });

  it('weights grade points by credits', () => {
    // (4*9 + 3*7) / 7 = 57/7 = 8.14
    expect(sgpa([{ credits: 4, gradePoint: 9 }, { credits: 3, gradePoint: 7 }])).toBe(8.14);
  });

  it('registers a failed subject with 0 points against credits', () => {
    const s = sgpa([{ credits: 4, gradePoint: 10 }, { credits: 4, gradePoint: 0 }]);
    expect(s).toBe(5);
  });
});

describe('cgpa', () => {
  it('is the mean of semester SGPAs', () => {
    expect(cgpa([{ sgpa: 8 }, { sgpa: 6 }, { sgpa: 10 }])).toBe(8);
  });

  it('returns 0 for no semesters', () => {
    expect(cgpa([])).toBe(0);
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(8.136)).toBe(8.14);
    expect(round2(7.5)).toBe(7.5);
  });
});