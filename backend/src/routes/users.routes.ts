import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { create, createUserSchema, list, update, updateUserSchema } from '../controllers/users.controller';

const router = Router();

router.use(authenticate, authorize('ADMIN'));
router.get('/', list);
router.post('/', validateBody(createUserSchema), create);
router.put('/:id', validateBody(updateUserSchema), update);

export default router;