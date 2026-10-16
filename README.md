# TaskFlow - Smart Task Management System

A full-stack task manager built for the Thiranex student assignment. Users register, log in, and manage their own tasks (create, edit, delete, prioritize, set deadlines, track status) from a responsive dashboard.

## Main features
- Registration and login with hashed passwords (bcryptjs) and an HTTP-only cookie session
- Task CRUD with title, description, priority, status, due date and category
- Search, filter (status, priority, overdue, due date), sort (newest, oldest, deadline, priority) and pagination
- Dashboard: total/pending/in-progress/completed/overdue counts, completion progress, status distribution, recent tasks and upcoming deadlines (all from the database, updated without reloading)
- Task details view with overdue indicator, profile editing, password change, account deletion
- Responsive layout (sidebar on desktop, slide-in menu and bottom-sheet dialogs on mobile), toasts, empty and error states, 404 page
- Security: Helmet, rate limiting, server-side validation, parameterized SQL, per-user authorization on every task query

## Tech stack
HTML, CSS, vanilla JavaScript (Fetch API) | Node.js, Express | SQLite-compatible libSQL (local file in development, Turso in production) | bcryptjs, jsonwebtoken, helmet, express-rate-limit

## Folder structure
```
task-management-app/
  public/        pages (index, login, register, dashboard, tasks, profile, 404), css/, js/
  routes/        authRoutes, taskRoutes, dashboardRoutes, profileRoutes
  middleware/    authMiddleware.js
  database/      schema.sql, db.js
  utils/         validation.js, taskHelpers.js
  app.js (Express app)  server.js (local start)  api/index.js (Vercel entry)  vercel.json  package.json  .env.example
```

## Prerequisites
Node.js 18+ and npm.

## Installation
```
npm install
copy .env.example .env      (Windows)   |   cp .env.example .env   (Mac/Linux)
```
Edit `.env` and set `JWT_SECRET` to a long random string. Generate one with:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Environment variables
| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` or `production` (production enables secure cookies) |
| `PORT` | Server port (default 3000) |
| `JWT_SECRET` | Secret for signing session tokens (32+ characters, required) |
| `DATABASE_PATH` | Local SQLite file used in development (default `./database/taskflow.db`) |
| `TURSO_DATABASE_URL` | Production database URL (`libsql://...`). When set, it replaces the local file |
| `TURSO_AUTH_TOKEN` | Token for the Turso database |

## Database initialization
Automatic. On startup `database/schema.sql` creates the `users` and `tasks` tables and indexes if they do not exist.

## Run
```
npm start
```
Open http://localhost:3000

## API
All responses are JSON: `{ success, message, ... }`. Private routes need the login cookie. Mutating requests must send `Content-Type: application/json`.

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create account (fullName, email, password, confirmPassword, acceptTerms) |
| POST | /api/auth/login | Log in (email, password) |
| POST | /api/auth/logout | Log out and invalidate old tokens |
| GET | /api/auth/me | Current user |
| POST | /api/auth/change-password | currentPassword, newPassword, confirmPassword |
| GET | /api/tasks | List. Query: q, status, priority, overdue=true, due=YYYY-MM-DD, category, sort=newest/oldest/deadline/priority, page, limit |
| GET | /api/tasks/:id | One task |
| POST | /api/tasks | Create (title, description, priority, status, dueDate, category) |
| PUT | /api/tasks/:id | Update |
| PATCH | /api/tasks/:id/status | Change status |
| DELETE | /api/tasks/:id | Delete |
| GET | /api/dashboard/stats | Counts, completion rate, recent and upcoming tasks |
| GET | /api/profile | Profile |
| PUT | /api/profile | Update fullName, email |
| DELETE | /api/profile | Delete account (password required) |
| GET | /api/health | Health check |

Status codes: 200, 201, 400 (invalid input), 401 (not logged in), 404 (missing or not yours), 409 (duplicate email), 415, 429, 500.

## Testing
Manual checklist (run it and tick each item):
1. Register; invalid email and weak password are rejected; duplicate email gives 409; wrong password fails with a generic message.
2. Create, edit, change status, complete and delete tasks; invalid input is rejected; data survives a refresh and logout/login.
3. Open /dashboard.html while logged out: redirected to login. Call /api/tasks without logging in: 401.
4. Register a second user: they cannot see, edit or delete the first user's tasks (requests for them return 404).
5. Check desktop and phone widths, empty states, filters, sorting and pagination.

## Deployment (Vercel + Turso)
Vercel functions have a read-only, temporary filesystem, so a local SQLite file would lose data. Production therefore uses **Turso** (hosted SQLite-compatible database); the code switches automatically when `TURSO_DATABASE_URL` is set.

1. Create a Turso account and a database. Copy its URL (`libsql://...`) and create an auth token.
2. Push this project to GitHub (never commit `.env` or `.db` files).
3. On vercel.com: Add New > Project, import the GitHub repo, keep the default settings.
4. Before deploying, add Environment Variables: `JWT_SECRET` (long random string), `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
5. Deploy. Open `/api/health`, then register, add a task, refresh and log out/in to confirm data persists.

## Known limitations
- Rate-limit counters are kept in memory per serverless instance, so limits are approximate on Vercel.
- On Vercel the HTML pages are served as static files; the API still blocks all unauthenticated data access, and the pages redirect to login when there is no session.
## Known limitations
- The session token is a JWT in a cookie, valid for 7 days; logging out or changing the password invalidates it everywhere.
- No password-reset, email verification or remember-me flow.
- No real-time updates (WebSockets were optional and not implemented).
- SQLite supports a single server instance; scaling out needs a managed database.
- Protected pages are guarded on the server, and all data is guarded by the API.
