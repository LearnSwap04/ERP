import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { allRequests, approve, create, myRequests, reject, requestSchema } from '../controllers/documents.controller';

const router = Router();

router.get('/my', authenticate, authorize('STUDENT'), myRequests);
router.get('/requests', authenticate, authorize('FACULTY', 'ADMIN'), allRequests);
router.post('/requests', authenticate, authorize('STUDENT'), validateBody(requestSchema), create);
router.post('/requests/:id/approve', authenticate, authorize('ADMIN'), approve);
router.post('/requests/:id/reject', authenticate, authorize('ADMIN'), reject);

export default router;