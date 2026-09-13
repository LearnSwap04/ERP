import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { create, getById, list, messageSchema, postMessage, ticketCreateSchema, ticketStatusSchema, updateStatus } from '../controllers/communication.controller';

const router = Router();

router.get('/tickets', authenticate, list);
router.post('/tickets', authenticate, authorize('STUDENT'), validateBody(ticketCreateSchema), create);
router.get('/tickets/:id', authenticate, getById);
router.post('/tickets/:id/messages', authenticate, validateBody(messageSchema), postMessage);
router.put('/tickets/:id/status', authenticate, authorize('FACULTY', 'ADMIN'), validateBody(ticketStatusSchema), updateStatus);

export default router;