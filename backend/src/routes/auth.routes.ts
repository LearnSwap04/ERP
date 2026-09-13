import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  forgotPassword,
  forgotSchema,
  login,
  loginSchema,
  logout,
  me,
  refresh,
  refreshSchema,
  resetPassword,
  resetSchema,
} from '../controllers/auth.controller';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshSchema), refresh);
router.post('/logout', validateBody(refreshSchema), logout);
router.post('/forgot-password', validateBody(forgotSchema), forgotPassword);
router.post('/reset-password', validateBody(resetSchema), resetPassword);
router.get('/me', authenticate, me);

export default router;