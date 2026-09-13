import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { create, list, noticeSchema, remove, update } from '../controllers/notices.controller';

const router = Router();

router.get('/', authenticate, list);
router.post('/', authenticate, authorize('ADMIN'), validateBody(noticeSchema), create);
router.put('/:id', authenticate, authorize('ADMIN'), validateBody(noticeSchema.partial()), update);
router.delete('/:id', authenticate, authorize('ADMIN'), remove);

export default router;