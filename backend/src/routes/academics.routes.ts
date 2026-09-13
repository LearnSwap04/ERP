import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createSubject,
  createTimetableSlot,
  getTimetable,
  listSubjects,
  subjectDetail,
  subjectSchema,
  syllabusSchema,
  syllabusUpdateSchema,
  timetableSchema,
  updateSyllabusTopic,
  upsertSyllabus,
} from '../controllers/academics.controller';

const router = Router();

router.get('/subjects', authenticate, listSubjects);
router.post('/subjects', authenticate, authorize('ADMIN'), validateBody(subjectSchema), createSubject);
router.get('/subjects/:id', authenticate, subjectDetail);
router.get('/timetable', authenticate, getTimetable);
router.post('/timetable', authenticate, authorize('ADMIN'), validateBody(timetableSchema), createTimetableSlot);
router.post('/subjects/:id/syllabus', authenticate, authorize('FACULTY', 'ADMIN'), validateBody(syllabusSchema), upsertSyllabus);
router.put('/syllabus/:id', authenticate, authorize('FACULTY', 'ADMIN'), validateBody(syllabusUpdateSchema), updateSyllabusTopic);

export default router;