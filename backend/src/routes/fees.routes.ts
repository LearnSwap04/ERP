import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createStructure, listPayments, listStructure, myFees, pay, receipt, structureCreateSchema } from '../controllers/fees.controller';

const router = Router();

router.get('/structure', authenticate, listStructure);
router.post('/structure', authenticate, authorize('ADMIN'), validateBody(structureCreateSchema), createStructure);
router.get('/my', authenticate, authorize('STUDENT'), myFees);
router.post('/pay', authenticate, authorize('STUDENT'), pay);
router.get('/payments', authenticate, authorize('ADMIN'), listPayments);
router.get('/payments/:id/receipt', authenticate, receipt);

export default router;