import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createExam, enterMarks, examCreateSchema, examRoster, listExams, marksEntrySchema, myGradeCard } from '../controllers/grades.controller';

const router = Router();

router.get('/my', authenticate, authorize('STUDENT'), myGradeCard);
router.get('/exams', authenticate, listExams);
router.post('/exams', authenticate, authorize('FACULTY', 'ADMIN'), validateBody(examCreateSchema), createExam);
router.get('/exams/:id/students', authenticate, authorize('FACULTY', 'ADMIN'), examRoster);
router.post('/exams/:id/marks', authenticate, authorize('FACULTY', 'ADMIN'), validateBody(marksEntrySchema), enterMarks);

export default router;