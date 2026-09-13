import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { me, updateMe, updateProfileSchema } from '../controllers/profile.controller';

const router = Router();

router.get('/me', authenticate, me);
router.put('/me', authenticate, validateBody(updateProfileSchema), updateMe);

export default router;