import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { bunkCalculator, mark, markSchema, myAttendance, myClasses, rollCall } from '../controllers/attendance.controller';

const router = Router();

router.get('/my', authenticate, authorize('STUDENT'), myAttendance);
router.get('/bunk', authenticate, authorize('STUDENT'), bunkCalculator);
router.get('/classes', authenticate, authorize('FACULTY', 'ADMIN'), myClasses);
router.get('/roll', authenticate, authorize('FACULTY', 'ADMIN'), rollCall);
router.post('/mark', authenticate, authorize('FACULTY', 'ADMIN'), validateBody(markSchema), mark);

export default router;