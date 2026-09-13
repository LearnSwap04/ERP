# Student ERP (`erp`)

A full-stack Student ERP: students track attendance, grades, timetable, assignments, fees, library, notices, and documents; faculty mark attendance, enter marks, and post/grade assignments; admins manage users, notices, fee structure, library, and document approvals.

> **Angular 21** (standalone components, Signals, zoneless) frontend at the repo root · **Express 5 + TypeScript** REST API in [`backend/`](backend) · **PostgreSQL 16** via [Prisma](https://prisma.io), run through Docker Compose.

---

## Architecture at a glance

| Component  | Stack |
|---|---|
| Frontend   | Angular 21 standalone + Signals, Angular Material (M3), Tailwind CSS v4 (component-scoped), ng2-charts / Chart.js |
| Backend    | Node.js + Express 5 + TypeScript (strict) |
| Database   | PostgreSQL 16 (`docker-compose.yml`) |
| ORM        | Prisma 6 (typed client, migrations) |
| Auth       | JWT access + refresh tokens (bcryptjs hashing, refresh rotation) |
| Validation | zod (request schemas) |
| Uploads    | multer → `backend/uploads/` (assignments, documents) |
| PDFs       | pdfkit (fee receipts, bonafide/transcript) |
| Tests      | Vitest — pure functions: attendance %/bunk + SGPA/CGPA |

**Why PostgreSQL + Prisma over MongoDB?** An ERP is shaped by relational, transactional data (fees ↔ payments, exams ↔ marks, users ↔ profiles). PostgreSQL gives referential integrity, joins, and ACID transactions for money/payment flows; Prisma provides a fully typed client and declarative migrations. MongoDB was rejected for its lack of joins and weak transaction story around payments/marks. (The prompt offered this tradeoff explicitly; the decision is documented here.)

---

## Prerequisites

- [Node.js](https://nodejs.org) 20+ (npm 11 used in CI)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the local PostgreSQL container)
- Angular CLI is not required globally — the repo pins `@angular/cli` in `devDependencies` (`npx ng …`).

---

## Quick start

In **two terminals** (or use the two commands from the repo root):

### 1. Database

```bash
docker compose up -d db
```

This starts PostgreSQL 16 on `localhost:5432` (db `erp`, user/password `erp`/`erp` — see `docker-compose.yml`).

### 2. Backend (`backend/`)

```bash
npm install          # respects backend/.npmrc
npm run generate     # prisma generate
npm run migrate      # prisma migrate dev
npm run seed         # demo data (admin/faculty/students, marks, fees, books, tickets…)
npm run dev          # tsx watch → http://localhost:4000
```

Smoke check: `curl http://localhost:4000/health` → `{"ok":true}`.

### 3. Frontend (repo root)

```bash
npm install
ng serve            # → http://localhost:4200
```

Open `http://localhost:4200`, sign in with a demo account (below).

---

## Demo accounts

All seeded users use password **`demo123`**.

| Role | Email | What they can do |
|---|---|---|
| Admin | `admin@erp.test` | dashboards, manage users, notices, fee structure, library, approve document requests |
| Faculty | `faculty1@erp.test` | mark attendance (roll call), enter marks, post + grade assignments, view assigned students' dashboards |
| Student | `student1@erp.test` | own attendance (incl. bunk calculator), grades/SGPA/CGPA, timetable, assignments, fees, library, notices, documents, support tickets |

The login page has **quick-fill demo buttons** for each role.

The forgot-password flow is email-free: the reset link is **logged to the backend terminal** (real SMTP is a future swap).

---

## Environment variables

### Backend — `backend/.env` (copy from `backend/.env.example`)

```env
DATABASE_URL="postgresql://erp:erp@localhost:5432/erp"
PORT=4000
CLIENT_ORIGIN="http://localhost:4200"
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
ACCESS_TOKEN_TTL=900          # seconds (JWT access token lifetime)
REFRESH_TOKEN_TTL_DAYS=7
UPLOAD_DIR=uploads
ATTENDANCE_THRESHOLD=75     # % below which attendance is flagged "low"
```

### Frontend — `src/environments/environment.ts`

```ts
export const environment = { production: false, apiUrl: 'http://localhost:4000/api' };
```

`angular.json` swaps in `environment.prod.ts` for production builds.

---

## API overview

All routes are under `http://localhost:4000/api`. Protected routes require `Authorization: Bearer <accessToken>`; the frontend interceptor attaches it and refreshes transparently on 401.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me` |
| Dashboard | `GET /dashboard/summary` (role-aware) |
| Attendance   | `GET /attendance/my`, `GET /attendance/bunk`, `GET /attendance/classes`, `GET /attendance/roll?subjectId&date`, `POST /attendance/mark` |
| Grades       | `GET /grades/my`, `GET /grades/exams`, `POST /grades/exams`, `GET /grades/exams/:id/students`, `POST /grades/exams/:id/marks` |
| Assignments  | `GET/POST /assignments`, `POST /assignments/:id/submit`, `POST /assignments/submissions/:id/grade` |
| Fees         | `GET/POST /fees/structure`, `GET /fees/my`, `POST /fees/pay`, `GET /fees/payments`, `GET /fees/payments/:id/receipt` (PDF) |
| Notices      | `GET/POST /notices`, `PUT/DELETE /notices/:id` |
| Library      | `GET/POST /library/books`, `POST /library/books/:id/issue`, `POST /library/issues/:id/return`, `GET /library/my`, `GET /library/issues` |
| Documents    | `GET /documents/my`, `GET/POST /documents/requests`, `POST /documents/requests/:id/approve|reject` (generates PDF) |
| Communication| `GET/POST /tickets`, `GET /tickets/:id`, `POST /tickets/:id/messages`, `PUT /tickets/:id/status` |
| Academics    | `GET/POST /academics/subjects`, `GET /academics/subjects/:id`, `GET/POST /academics/timetable`, `POST /academics/subjects/:id/syllabus`, `PUT /academics/syllabus/:id` |
| Users (admin)| `GET/POST /users`, `PUT /users/:id` |
| Profile      | `GET/PUT /profile/me` |

Role enforcement is server-side (`authorize(...roles)` middleware) and mirrored client-side by route guards + the `appHasRole` directive.

---

## Tests

Unit tests target the pure calculation logic (single source of truth on the server):

```bash
# Backend  — attendance %/bunk + SGPA/CGPA
cd backend && npm test          # vitest run

# Frontend — smoke tests for the app shell
ng test                         # vitest via @angular/build:unit-test
```

> **Note:** the prompt asked for Jasmine/Karma; the Angular 21 scaffold already ships Vitest, so tests run under Vitest on **both** sides instead. Purely a runner choice — the test logic itself is straightforward pure-function assertions.

---

## Folder overview

```
├─ src/app/                    # Angular frontend
│  ├─ core/                    #   services (api, auth, toast), interceptor, guards, models
│  ├─ shared/                  #   stat-card, empty-state, page-header, has-role directive
│  ├─ features/
│  │  ├─ auth/                 #   login, forgot-password
│  │  ├─ shell/                #   toolbar + sidenav (nav filtered by role)
│  │  ├─ dashboard/            #   role dispatcher
│  │  ├─ student/              #   attendance, grades, assignments, fees, notices, library,
│  │  │                        #   documents, academics (timetable/syllabus), communication
│  │  ├─ faculty/              #   roll call, marks entry, post/grade assignments
│  │  └─ admin/                #   users, notices, fees, library, documents
│  └─ …
├─ backend/                    # Express API
│  ├─ prisma/schema.prisma     #   data model
│  ├─ prisma/seed.ts           #   demo data
│  ├─ src/routes|controllers/  #   per-resource
│  ├─ src/services/            #   business logic + pure calc functions
│  ├─ src/middleware/          #   auth, roleGuard, validate (zod), upload, errorHandler
│  ├─ src/utils/pdf.ts         #   pdfkit helpers
│  └─ tests/                   #   vitest specs
├─ docker-compose.yml          # PostgreSQL 16
└─ README.md
```

---

## Known future swaps / out of scope

- **Real email** (SMTP) for password reset + notifications (currently logged to the terminal).
- **Object storage** (S3) instead of the local `backend/uploads/` disk store.
- **Real payment gateway** (fees `pay` currently marks an item paid without a gateway).
- Production PostgreSQL config / HTTPS / Dockerized backend.
- Web haptics & in-browser notifications (a separate, earlier session topic) — kept out of this build.

## License note

Private project — no license declared.