import { Router } from 'express';
import { authorize, authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { allIssues, bookSchema, createBook, issueBook, issueSchema, listBooks, myIssues, returnBook } from '../controllers/library.controller';

const router = Router();

router.get('/books', authenticate, listBooks);
router.post('/books', authenticate, authorize('ADMIN'), validateBody(bookSchema), createBook);
router.post('/books/:id/issue', authenticate, authorize('ADMIN'), validateBody(issueSchema), issueBook);
router.post('/issues/:id/return', authenticate, authorize('ADMIN'), returnBook);
router.get('/my', authenticate, authorize('STUDENT'), myIssues);
router.get('/issues', authenticate, authorize('ADMIN'), allIssues);

export default router;