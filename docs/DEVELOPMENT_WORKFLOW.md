# Development workflow

## Branch naming

Use the real Jira issue key after an issue has been imported or created:

```text
feature/CAMP-123-student-event-registration
bugfix/CAMP-234-release-expired-reservations
docs/CAMP-345-deployment-guide
```

Before Jira assigns keys, use a short descriptive branch such as `feature/event-discovery`; do not invent Jira keys.

## Conventional Commits

Use the Conventional Commits format:

```text
<type>[optional scope]: <imperative summary>
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `ci`, and `chore`.

Examples:

```text
feat(events): add atomic free-seat reservations
fix(attendance): reject duplicate check-in passes
test(auth): cover student role registration
docs(CAMP-123): document student registration
```

Once a Jira key exists, reference it in the subject or footer, for example `feat(CAMP-123): add event discovery`. Use one issue per focused commit where practical. Do not rewrite shared history or manufacture commits to imply work was completed in earlier sprints.

## Pull request checklist

- Link the actual Jira issue.
- Describe observable behavior and any API or data changes.
- Add or update tests, then run `npm test` and `npm run build`.
- Check authorization at the API boundary, not only in the UI.
- Confirm no secrets, real personal data, or `.env` files are staged.
- Document any incomplete flow and deployment/configuration requirements.
