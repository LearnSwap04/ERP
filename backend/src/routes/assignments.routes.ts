import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validateBody } from '../middleware/validate';
import { assignmentCreateSchema, create, getById, gradeSubmission, list, submissionGradeSchema, submit } from '../controllers/assignments.controller';

const router = Router();

router.get('/', authenticate, list);
router.post('/', authenticate, authorize('FACULTY', 'ADMIN'), upload.single('file'), validateBody(assignmentCreateSchema), create);
router.get('/:id', authenticate, getById);
router.post('/:id/submit', authenticate, authorize('STUDENT'), upload.single('file'), submit);
router.post('/submissions/:id/grade', authenticate, authorize('FACULTY', 'ADMIN'), validateBody(submissionGradeSchema), gradeSubmission);

export default router;