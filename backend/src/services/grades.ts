import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/errorHandler';
import { cgpa, gradeForPercentage, gradePointForLetter, round2, sgpa } from './calculations';

/** Build a student's grade card: per-subject totals + SGPA + trend + CGPA. Shared by grades and documents routes. */
export async function buildGradeCard(userId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) throw new HttpError(404, 'Student profile not found');

  const subjects = await prisma.subject.findMany({
    where: { branch: student.branch, semester: student.semester },
    orderBy: { code: 'asc' },
  });
  const subjectIds = subjects.map((s) => s.id);
  const [exams, past] = await Promise.all([
    prisma.exam.findMany({ where: { subjectId: { in: subjectIds } } }),
    prisma.semesterResult.findMany({ where: { studentId: student.userId }, orderBy: { semester: 'asc' } }),
  ]);

  const allMarks =
    subjectIds.length > 0
      ? await prisma.marks.findMany({ where: { studentId: student.userId, examId: { in: exams.map((e) => e.id) } } })
      : [];

  const perSubject = subjects.map((subj) => {
    const subjExams = exams.filter((e) => e.subjectId === subj.id);
    const totalMax = subjExams.reduce((s, e) => s + e.maxMarks, 0);
    const totalObtained = subjExams.reduce((s, e) => s + (allMarks.find((m) => m.examId === e.id)?.obtained ?? 0), 0);
    const percentage = totalMax === 0 ? 0 : round2((totalObtained / totalMax) * 100);
    const grade = gradeForPercentage(percentage);
    return {
      subjectId: subj.id,
      code: subj.code,
      name: subj.name,
      credits: subj.credits,
      totalMax,
      totalObtained,
      percentage,
      grade,
      gradePoint: gradePointForLetter(grade),
    };
  });

  const currentSgpa = sgpa(
    perSubject.map((p) => ({ credits: p.credits, gradePoint: p.gradePoint })),
  );
  const trend = [...past.map((p) => ({ semester: p.semester, sgpa: p.sgpa })), { semester: student.semester, sgpa: currentSgpa }];

  return {
    student,
    subjects: perSubject,
    currentSgpa,
    currentSemester: student.semester,
    past: past.map((p) => ({ semester: p.semester, sgpa: p.sgpa })),
    trend,
    cgpa: cgpa(trend),
  };
}