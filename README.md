# CampusFest

CampusFest is a college event and fest management app for students, organisers, volunteers, and administrators. It uses a React/Vite frontend, an Express API, and MongoDB. Every event is free to attend; there is no payment provider or checkout flow.

## Features

- Search and browse upcoming campus events; organisers create, publish, and cancel events. Draft/cancelled events can be deleted only when they have no registration, volunteer, or feedback history.
- Student and volunteer public signup, login, account profiles, and role-specific workspaces. Organiser/admin roles cannot be self-selected.
- Free registration with duplicate protection, atomic capacity limits, cancellation, and private attendance passes.
- Organiser participant lists and CSV export; authorised organiser/admin/accepted-volunteer check-in.
- Downloadable PDF attendance certificates after check-in; the certificate is also emailed when SMTP is configured.
- Welcome, registration, cancellation, and volunteer-status email notifications when SMTP is configured; in-app notifications remain available.
- Volunteer applications and event-scoped check-in permissions.
- Attendance-gated feedback and administrator account-role management.
- Jira backlog plan and CSV import template in `docs/`.

## Stack and layout

- Node.js 22+ (Node 20.19+ minimum for the Vite version) and npm workspaces.
- React 19, React Router, Vite, and Lucide React.
- Express 5, Mongoose 8, MongoDB, and PDFKit.
- bcryptjs, JWT, HttpOnly cookies, Zod, and Nodemailer.

```text
api/src/       Express API, MongoDB models, routes, email and certificate services
api/test/      Node test-runner tests
web/src/       React application, styles, and Vitest tests
docs/          Jira project plan, import CSV, and development workflow
.env.example   Environment-variable template; contains no secrets
```

## Run locally

From the project root in PowerShell:

```powershell
npm install
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Put the generated value in `JWT_SECRET` in `.env`. The development API will use `MONGODB_URI` if available; otherwise it attempts to start a local, persistent embedded MongoDB. The embedded database stores local data under `.mongo-data`. Never commit `.env`.

Start the frontend and API together:

```powershell
npm run dev
```

By default, Vite runs at `http://localhost:5173` and the API at `http://localhost:4000`. If port 5173 is occupied, Vite chooses the next available port. Check `http://localhost:4000/api/health` for API readiness.

## Sign in as student, organiser, or volunteer

Public signup at `/register` lets users choose either a student or volunteer account; it never creates an organiser or administrator. To get the seeded demo organiser and volunteer accounts, set four unique development passwords (at least 10 characters; use 12+ for privileged accounts) in `.env`, then seed:

```powershell
npm run seed
```

Use the configured passwords with these email addresses at `/login`:

| Role | Demo email |
|---|---|
| Student | `student.demo@campusfest.test` |
| Organiser | `organiser.demo@campusfest.test` |
| Volunteer | `volunteer.demo@campusfest.test` |
| Administrator | `admin.demo@campusfest.test` |

The seed script creates three fictional upcoming **free** events. It does not print passwords. Organisers can create and publish events from their workspace. Volunteers can browse open opportunities, apply, and check in attendees after an organiser accepts the application. An administrator can promote an existing account to organiser or volunteer from the account-role panel.

Click **My space** after signing in to open the role-specific workspace. The account panel displays the signed-in name, email, role, department, and year of study (for students); name, department, and year can be updated there.

## Email and certificates

Email delivery is optional for local use. To enable it, fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `EMAIL_FROM` in `.env`, then restart the API. Use credentials for an SMTP account you control; do not put them in the frontend or Jira.

CampusFest emails a welcome message after signup, a confirmation after free registration, event-cancellation notices, volunteer-application status updates, and a PDF attendance certificate after successful check-in. Attendees can download the same certificate from their workspace. Without SMTP, registration and check-in still succeed without an email-delivery notice; the certificate remains downloadable.

## Jira import

The project backlog is documented in [docs/JIRA_PLAN.md](./docs/JIRA_PLAN.md), and the import rows are in [docs/JIRA_IMPORT.csv](./docs/JIRA_IMPORT.csv).

1. Create a Jira Software Scrum project (company-managed is recommended for the clearest epic/backlog/sprint demo). You need Jira administrator access to use the site-wide CSV importer.
2. In Jira, open **Settings → System → External system import → CSV**. If Jira presents the new importer, use its CSV import flow. Select `docs/JIRA_IMPORT.csv` and confirm UTF-8/CSV parsing.
3. Map `Work type`, `Summary`, `Description`, `Priority`, and `Labels`. Map `Work item ID` and `Parent` to the corresponding hierarchy fields so the numeric parent IDs attach each story/task to its epic. Confirm the project and create missing work types (`Epic`, `Story`, `Task`) if Jira prompts.
4. Preview the import; confirm there are 32 rows, no validation errors, and stories/tasks are nested under the intended epics. Import only once to avoid duplicate issues.
5. In the backlog, create a sprint, drag in the few demo issues you plan to show, then start the sprint during the demo. Move an issue through the board only when you actually demonstrate or complete that work.

The CSV uses Jira's `Work item ID`/`Parent` hierarchy format and is a one-time import template, not a live integration. Jira issue keys are assigned during import. No statuses, commits, or app changes sync automatically from this repository. Never upload `.env` or paste passwords, SMTP credentials, JWT secrets, or bootstrap keys into Jira.

## Free live staging deployment

The repository includes a free-tier demo setup: Vercel serves the Vite frontend, Render runs the Express API, and MongoDB Atlas stores persistent demo data. This is for demonstrations, not production. Render's free API service can sleep after inactivity, so its first request may take about a minute. Vercel and Atlas free-tier limits and current provider terms apply.

1. Push the project to a GitHub repository. Confirm `.env` and `.mongo-data` are not tracked; never upload credentials.
2. In MongoDB Atlas, create a free cluster, a database user with read/write access only to the CampusFest database, and a database connection string. Add the Render service's outbound IP ranges to the Atlas IP access list when available. If the free service requires a broad IP rule for a short classroom demo, use a unique strong database password and fictional demo data only; remove that rule afterwards.
3. In Vercel, select the standalone **web (Vite)** application and set its Root Directory to `web`. The `web/vercel.json` configuration installs/builds from that directory and keeps `/api/*` same-origin so secure session cookies work. Do not use the root-workspace command `npm run build -w web` when the Root Directory is `web`. Deploy once to obtain the Vercel production URL.
4. In Render, create a Blueprint from the repository using `render.yaml`. Render hosts only the API; Vercel builds the frontend. Keep the Render build command as `npm ci --omit=dev` (do not use `npm run build` there) and start command as `npm run start -w api`. Set `MONGODB_URI` to the Atlas connection string and `FRONTEND_URL` to the exact Vercel production URL (scheme and hostname, no trailing slash). Render generates `JWT_SECRET`. Do not configure SMTP. Wait for `/api/health` to pass and note the Render service's public URL.
5. In `vercel.json`, replace `https://replace-with-your-render-api.onrender.com` with the exact Render service URL, keeping `/api/:path*` at the end. Commit and push that change so Vercel redeploys. The browser then calls the API through Vercel on the same origin; do not set `VITE_API_URL` to the Render URL.
6. Add the exact Vercel production URL to Render's `FRONTEND_URL` if it changed after redeployment. Redeploy the API after changing environment values.
7. Create the first organiser directly in the Atlas database using the one-time local CLI provisioner. In a private local `.env` (never committed), set `NODE_ENV=production`, `MONGODB_URI` to Atlas, and `PROVISION_ORGANISER_NAME`, `PROVISION_ORGANISER_EMAIL`, and a unique `PROVISION_ORGANISER_PASSWORD` (12-128 characters). From the repository root, run `npm run provision:organiser -w api`. The command refuses localhost databases and refuses to overwrite an existing account. Remove those three `PROVISION_ORGANISER_*` values from `.env` after success. Students and volunteers can then sign up from the public site.
8. Verify the public Vercel site, sign-in/sign-out, create/publish a fictional event, student registration, volunteer application/assignment, check-in, and attendee certificate download. Test in a private/incognito browser and confirm API health. Avoid real personal data.

If provisioning locally from your network is blocked by the Atlas access list, temporarily allow your current public IP, run the one-time command, then remove that IP rule. Keep credentials in provider dashboards and the ignored local `.env`, not in Jira, GitHub, screenshots, or chat.

For the Jira staging issue, add the Vercel URL, Render health URL, deployment date, and verification notes as a Jira comment. Move the issue to **Done** only after the public flow has been tested. Jira does not receive deployment status automatically.

Provider instructions: [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite), [Render web services](https://render.com/docs/web-services) and [free service limits](https://render.com/docs/free), [MongoDB Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## API outline

All API responses use `{ "success": true, "data": ... }` or `{ "success": false, "error": ... }`.

| Route | Purpose |
|---|---|
| `GET /api/health` | API health |
| `POST /api/auth/register`, `/login`, `/logout` | Student account and session |
| `GET /api/auth/me`, `PATCH /api/auth/me` | Current account/profile |
| `POST /api/auth/provision-organiser` | Development-only organiser provisioning |
| `GET /api/events`, `GET /api/events/:id` | Published-event discovery |
| `POST /api/events`, `PATCH /api/events/:id`, `POST /api/events/:id/publish` | Organiser event management |
| `POST /api/events/:id/register`, `POST /api/events/registrations/:registrationId/cancel` | Free registration and cancellation |
| `GET /api/dashboard`, `GET /api/dashboard/notifications` | Role-specific workspace data |
| `GET /api/events/:id/participants`, `GET /api/events/:id/participants.csv` | Owner-scoped roster and export |
| `POST /api/events/:id/check-in` | Owner/admin/accepted-volunteer check-in; emails the certificate if SMTP is available |
| `GET /api/events/registrations/:registrationId/certificate` | Attendee-only PDF certificate download after check-in |
| `POST /api/events/:id/feedback` | Feedback from checked-in students |
| `GET /api/events/volunteer/opportunities`, `POST /api/events/volunteer/:id/apply` | Volunteer applications |
| `/api/admin/*` | Administrator-only account/event/audit access |

## Data and security notes

- Event capacity is reserved with an atomic conditional database update. A unique student/event index prevents duplicate active registrations.
- Registration statuses are `confirmed`, `cancelled`, and `attended`. A student can cancel a future registration before the event; cancellation releases the reserved place.
- The API strips old event fee fields and cancels legacy pending-payment registrations on startup. Existing historical documents in a former payments collection are not automatically deleted.
- Attendance passes use random tokens, contain no personal data, and are only returned to the attendee. Certificates can be generated only for that attendee's checked-in registration.
- Password hashes are excluded from normal user queries. Sessions use an HttpOnly, SameSite Strict cookie; public signup cannot choose organiser or administrator roles.
- CORS allows `FRONTEND_URL`; browser-originated mutations are checked. Sensitive authentication routes are rate-limited.
- Inputs are validated by the API, and participant CSV output neutralises spreadsheet formula prefixes.

## Tests and build

```powershell
npm test
npm run build
```

Workspace-focused checks:

```powershell
npm run test -w api
npm run test -w web
```

These tests do not replace integration tests against disposable MongoDB or delivery tests against a configured SMTP server.

## Deployment

Deployment is optional and has not been performed. Follow [Free live staging deployment](#free-live-staging-deployment) for the Vercel/Render/Atlas demo setup. Production needs a managed MongoDB database, HTTPS hosting, and secrets configured in the hosting environment. Set `MONGODB_URI`, a strong `JWT_SECRET`, `NODE_ENV=production`, and `FRONTEND_URL`; set `API_PORT` only if the host does not provide `PORT`. Configure SMTP only if email delivery is wanted. Use a same-origin `/api` reverse proxy for the session cookie.

## Known limitations

- QR passes are available, but camera-based scanning is not implemented; staff can enter the pass code manually.
- Email delivery requires a working SMTP provider and is not integration-tested without one.
- The administrator panel covers role management but not every moderation, analytics, or reporting workflow.
- MongoDB integration tests cover core role boundaries, registration capacity, cancellation, attendance, certificates, volunteer assignment, feedback, and administration; SMTP delivery against a real provider is not tested.
- The policy/legal copy is introductory project copy and should be reviewed before a real institutional launch.
