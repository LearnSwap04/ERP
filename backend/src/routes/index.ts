import { Router } from 'express';
import academics from './academics.routes';
import assignments from './assignments.routes';
import attendance from './attendance.routes';
import auth from './auth.routes';
import communication from './communication.routes';
import dashboard from './dashboard.routes';
import documents from './documents.routes';
import fees from './fees.routes';
import grades from './grades.routes';
import library from './library.routes';
import notices from './notices.routes';
import profile from './profile.routes';
import users from './users.routes';

export const apiRouter = Router();

apiRouter.use('/auth', auth);
apiRouter.use('/profile', profile);
apiRouter.use('/users', users);
apiRouter.use('/dashboard', dashboard);
apiRouter.use('/attendance', attendance);
apiRouter.use('/grades', grades);
apiRouter.use('/assignments', assignments);
apiRouter.use('/academics', academics);
apiRouter.use('/fees', fees);
apiRouter.use('/notices', notices);
apiRouter.use('/library', library);
apiRouter.use('/documents', documents);
apiRouter.use('/communication', communication);

apiRouter.get('/', (_req, res) => {
  res.json({ service: 'ERP API', ok: true });
});