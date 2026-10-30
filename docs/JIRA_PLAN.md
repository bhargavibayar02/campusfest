# CampusFest Jira project plan

## Project summary

CampusFest helps students discover and register for campus events and gives organisers, volunteers, and administrators role-appropriate operations tools. All events are free; the application does not collect or process payments. This backlog is a planning/import artifact, not proof that Jira issues have been created or completed.

## Objectives and scope

- Publish searchable event listings with atomic capacity limits and free registration.
- Provide role-specific signup/login, editable account details, and protected workspaces.
- Give organisers event, roster, attendance, and volunteer-management tools.
- Let volunteers apply for event duties and check in attendees when accepted.
- Issue private attendance passes and checked-in-only PDF certificates; email lifecycle notices when SMTP is configured.
- Keep API validation, ownership checks, auditability, documentation, and tests in scope.

Not currently in scope: payment collection, camera-based scanning, native mobile apps, institutional SSO, automated deployment, or a live Jira/GitHub integration.

## Roles and boundaries

| Role | Main workflows | Access boundary |
|---|---|---|
| Student | Browse/register, manage profile, download attendance certificate, submit feedback | Own account and registrations |
| Organiser | Create/publish events, manage roster, check in attendees, review feedback and volunteer applications | Events they own |
| Volunteer | Apply, track application, check in attendees after acceptance | Accepted assignments only; no organiser roster export |
| Administrator | Manage account roles, platform events, audit activity | Platform-wide privileged actions |

Public signup allows student or volunteer accounts, but never organiser or administrator accounts. Organisers are provisioned in development by the bootstrap endpoint or seed script; administrators can change roles through the protected admin workflow.

## Epics and dependencies

| # | Epic | Outcome | Depends on |
|---|---|---|---|
| 1 | Project Setup and Architecture | Workspace, database configuration, UI system, API conventions | — |
| 2 | Authentication and Role Management | Student signup, sessions, profiles, role provisioning, protected routes | 1 |
| 3 | Event Management | Organiser event CRUD, publishing, discovery, filters, and capacity | 1, 2 |
| 4 | Free Registration | Duplicate-safe registration, cancellation, private attendance passes | 2, 3 |
| 5 | Attendance and Certificates | Authorised check-in, attendance history, PDF certificates | 4 |
| 6 | Student and Operations Workspaces | Student profile/activity; organiser and volunteer tools | 2–5 |
| 7 | Email and In-App Notifications | Configurable SMTP lifecycle messages and in-app notices | 2–6 |
| 8 | Administrator Dashboard | Account roles, audit trail, platform metrics | 2, 3 |
| 9 | Feedback and Reports | Attendance-gated feedback, aggregates, CSV export | 4, 5 |
| 10 | Security and Testing | Authorization, capacity, accessibility, and email/certificate tests | 2–9 |
| 11 | Deployment and Documentation | Local setup, environment reference, Jira import, deployment prep | 1–10 |

## Prioritised backlog

Acceptance criteria are suitable for Jira story/task descriptions. Jira keys are assigned by the importing project.

| Priority | Type | Epic | Backlog item | Acceptance criteria |
|---|---|---|---|---|
| P0 | Story | 1 | Run the React/API workspace | Root install, development scripts, production build, and documented configuration work. |
| P0 | Story | 2 | Student and volunteer signup/login | Public signup can create student or volunteer accounts only; passwords are hashed; invalid login is generic; session cookie is HttpOnly. |
| P0 | Story | 2 | Provide role-specific demo accounts | Seed creates organiser, volunteer, student, and administrator accounts with operator-supplied passwords; no password is logged. |
| P0 | Story | 2 | Display and edit account profile | Workspace shows name, email, role, department, and student year; allowed fields can be updated by the owner. |
| P0 | Story | 3 | Create and publish free events | Organisers can create and publish events; the server does not accept or charge an event fee. |
| P0 | Story | 3 | Discover campus events | Only published future events are listed; search/category/date filters and pagination work. |
| P0 | Story | 4 | Register for a free event safely | Duplicate registration is rejected; atomic capacity never oversells; confirmed registration receives a private pass. |
| P0 | Story | 5 | Check in authorised attendees | Only owner/admin/accepted event volunteer can check in; invalid or repeated passes are rejected. |
| P0 | Story | 5 | Generate and download attendance certificates | A checked-in attendee can download a PDF for their own registration; unverified and other users' registrations are denied. |
| P1 | Story | 7 | Send email notifications | Configured SMTP sends welcome, registration, cancellation, volunteer-status, and certificate emails; missing SMTP is reported without losing the underlying action. |
| P1 | Story | 6 | View student registrations and passes | The student sees only their registrations, statuses, passes, certificates, and in-app notifications. |
| P1 | Story | 6 | Manage event roster and attendance | Owner can view/export only their event's roster; CSV neutralises formula prefixes. |
| P1 | Story | 6 | Apply for volunteer duty | Volunteer can apply once; owner can review the application and assign duty/shift/status; accepted volunteers may check in. |
| P1 | Story | 6 | Review and assign event volunteers | Organiser sees applicants for owned events and can accept/decline them with duty and shift; accepted volunteers can check in. |
| P1 | Story | 8 | Manage account roles | Admin-only endpoints update roles/suspend accounts; actions are audited; password hashes never leave the API. |
| P1 | Story | 9 | Submit attendance-eligible feedback | Only checked-in students can submit one 1–5 rating; organiser sees an owned-event aggregate. |
| P1 | Task | 10 | Add MongoDB integration tests | Test auth/resource boundaries, duplicate registration, capacity contention, cancellation, attendance, and certificates against disposable database state. |
| P1 | Task | 10 | Review accessibility and responsive behavior | Keyboard use, focus, contrast, labels, mobile layout, and reduced motion are verified. |
| P1 | Task | 11 | Document local setup and Jira import | Environment variables, role logins, email configuration, import steps, and known gaps match actual behavior. |
| P2 | Story | 5 | Add camera-based check-in | Browser permission-aware scanning calls the same server-side validation as manual code entry. |
| P2 | Task | 11 | Deploy a staging environment | HTTPS, same-origin API routing, CORS, secrets, database access, SMTP, and health checks are verified in staging. |

## Suggested four-week sprint plan

| Sprint | Focus | Candidate scope | Demonstration |
|---|---|---|---|
| 1 | Foundation and roles | Workspace, auth, role seed accounts, account profile | Student signup; seeded organiser and volunteer logins; profile view |
| 2 | Events and registration | Event discovery, organiser publishing, capacity-safe free registration | Publish an event and register a student |
| 3 | Attendance and operations | Attendance passes, volunteer applications/check-in, certificate PDF, SMTP notices | Accepted volunteer checks in an attendee; attendee downloads a certificate |
| 4 | Quality and release preparation | Feedback, admin tools, accessibility, tests, docs, deployment rehearsal | Role-separated demo, test report, risks, Jira backlog review |

Sprint assignments are suggestions only and do not represent historical Jira completion.

## Definition of Ready

- The user/problem and access role are identified.
- Acceptance criteria describe success and denial cases.
- API/data dependencies and external services such as SMTP are identified.
- UI states are specified when a user interaction is involved.
- The story is sized for a sprint or split into smaller stories.
- Security, privacy, and test-data implications are documented.

## Definition of Done

- Implementation preserves server-side authorization and data ownership boundaries.
- Success, loading, empty, and error states are usable and accessible.
- Focused tests cover positive, invalid, and unauthorized behavior.
- `npm test` and `npm run build` pass, or remaining failures are recorded.
- Documentation and `.env.example` match behavior; no secrets are committed.
- A Jira issue is linked only after Jira creates it; no work is represented as completed in an earlier sprint.

## Test and demo checklist

1. Configure `.env`, MongoDB (or the local development fallback), and optional SMTP; run `npm run dev`.
2. Set unique seed passwords and run `npm run seed`.
3. Sign in as organiser and publish a fictional free event.
4. Sign in as student, register, and show the private attendance pass.
5. Apply as volunteer; accept the application as organiser; check in the student.
6. Download the attendance certificate and verify the configured SMTP messages when SMTP is available.
7. Submit post-attendance feedback; verify organiser-owned reporting and role boundaries.
8. Run `npm test` and `npm run build`; show any known limitations clearly.

## Risks and known limitations

| Risk | Mitigation / status |
|---|---|
| MongoDB is unavailable | Development server attempts persistent embedded MongoDB; production requires configured MongoDB. |
| SMTP is not configured or unavailable | Registration/check-in still complete; UI/API reports email delivery status and certificates remain downloadable. |
| No camera scanner | Manual pass entry is available; camera UX remains backlog. |
| Standalone MongoDB cannot provide multi-document transactions | Capacity reservation is atomic and compensation is used; integration testing and transaction review remain. |
| Cross-site cookie restrictions | Use a same-origin API proxy or carefully configured same-site domains and HTTPS. |
| Some organiser/admin/volunteer flows are API-only | Prioritise remaining UI before a production campus launch. |
| Jira import mapping varies by project | Review the CSV preview and map Epic Name/Parent fields before import; no remote import is performed by this repository. |
