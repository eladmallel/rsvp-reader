# AGENTS.md – Working Guidelines for AI Agent

> **⚠️ IMPORTANT**: Read this file before doing anything on the project.

This document defines how I (the AI agent) should work on the RSVP Reader project. It ensures consistency, quality, and effective collaboration with the human developer.

---

## 1. Communication Style

### Be Concise

- Get to the point quickly without sacrificing critical information
- Avoid verbose explanations when a short answer suffices
- Use bullet points and structured lists for clarity
- When explaining decisions, focus on the **why**, not restating the **what**

### Be Transparent

- Acknowledge mistakes immediately
- Explain when backtracking and why
- Flag uncertainties early (and add them to `OPEN_QUESTIONS.md`)

---

## 2. Git Workflow & Commits

### Keep Commits Small

- Each commit should represent a single logical change
- Prefer many small commits over few large ones
- Commit message format: `<type>: <short description>`
  - Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `style`
  - Example: `feat: add ORP calculation algorithm`

### Never Break CI

- Before committing, always run the full test suite locally:
  ```bash
  npm run test && npm run test:e2e
  ```
- If tests are slow, address this immediately (see Section 3)
- Every commit must leave the codebase in a working state

### Commit Frequently

- Commit after completing each small, working piece
- This creates save points and makes debugging easier
- Push after each meaningful commit for visibility

---

## 3. Test Performance

### Monitor Test Speed

- Tests must run fast to enable frequent execution
- Track test execution time after each test addition
- If tests take >30 seconds for unit tests or >2 minutes for E2E, investigate

### When Tests Slow Down

1. Identify the slow tests using timing output
2. Look for:
   - Unnecessary `await` delays or real timeouts
   - Missing mocks (e.g., real API calls)
   - Heavy setup/teardown that could be shared
   - Tests that could run in parallel but don't
3. Fix strategies:
   - Mock slow external dependencies (APIs, DB)
   - Use `beforeAll` instead of `beforeEach` where safe
   - Split E2E tests into parallel workers
   - Consider test.concurrent for independent tests
4. Maintain near-identical coverage with less time

### Detecting Hanging Tests (IMPORTANT)

**Be impatient with test execution.** If tests appear to hang:

1. **E2E tests**: If you don't see test results printing within 5-10 seconds of starting, something is wrong. Don't wait minutes hoping it will finish.
2. **Unit tests**: Should produce output almost immediately. No output after a few seconds = problem.

**When tests hang, debug immediately:**

1. Check if the dev server/webserver is starting (look for port conflicts, startup errors)
2. Check Playwright config - is it waiting for a server that isn't running?
3. Look at terminal output for errors buried in the noise
4. Try running a single test file to isolate the issue
5. Check for infinite loops, unresolved promises, or missing `await`

**Don't just re-run and hope.** Diagnose the root cause first.

---

## 4. Task Management

### Read PROJECT_PLAN.md First

- Always read `docs/PROJECT_PLAN.md` before starting work
- Find your current task in the Task Breakdown section (Phase 0-7)
- Look for the next unchecked `[ ]` item

### Update After Every Task

- Mark completed tasks with `[x]` immediately
- Add new tasks when you discover them:
  - Refinements to existing designs
  - Additional tests needed
  - Performance improvements
  - Bug fixes
  - UI/UX polish items

### Adding New Tasks

- Insert new tasks in the appropriate phase
- Use consistent numbering (e.g., `2.9a` for insertions)
- Mark priority if urgent with `[!]` prefix

---

## 5. Test-Driven Development (TDD)

### Use TDD Wherever Possible

- Write tests **before** implementation when feasible
- The process:
  1. Write a failing test
  2. Write minimal code to pass
  3. Refactor while keeping tests green
  4. Commit

### Especially Apply TDD For:

- Pure functions (ORP algorithm, timing, tokenizer)
- API endpoints (mock external services)
- State management hooks
- Data transformations

### When TDD Isn't Practical

- UI/visual components (test after with E2E + screenshots)
- Exploratory prototyping (write tests after stabilizing)
- Integration with truly external services (use mocks)

---

## 6. Open Questions

### Track Uncertainties

- When unsure about something, add it to `OPEN_QUESTIONS.md`
- Don't guess or assume on important decisions

### Format for Questions

```markdown
## [Date] Question Title

**Context**: [Brief explanation of the situation]

**Question**: [The specific question or decision needed]

**Options Considered**:

1. Option A - [pros/cons]
2. Option B - [pros/cons]

**My Recommendation**: [If you have one]

**Status**: [ ] Open / [x] Resolved - [Resolution details]
```

### Review Schedule

- Review open questions together at each milestone
- Resolve questions before moving to the next phase
- Mark resolved questions but keep them for reference

---

## 7. UI/UX Quality

### Screenshots Are Required

- Capture screenshots during E2E tests for all key screens
- Add a screenshot review task before completing each feature

### Analyze Every Screenshot

1. Does it match the design tokens in `PROJECT_PLAN.md`?
2. Is the layout correct on mobile (375x667)?
3. Is the layout correct on desktop (1440x900)?
4. Are colors, fonts, and spacing consistent?
5. Does dark mode look correct?
6. Is RTL text (Hebrew) displaying properly?

### Add Tasks for Visual Issues

If screenshots reveal problems:

- Add a new task to fix the issue
- Reference the specific screenshot
- Prioritize based on visibility

---

## 8. Screenshots Organization

### Save All E2E Screenshots

- Save to: `screenshots/<YYYY-MM-DD>/`
- Example: `screenshots/2026-01-15/`

### Naming Convention

```
<test-name>-<viewport>-<theme>-<state>.png
```

Examples:

- `library-mobile-dark-loaded.png`
- `rsvp-desktop-light-playing.png`
- `rating-modal-mobile-dark-5stars.png`

### Directory Structure

```
screenshots/
├── 2026-01-15/
│   ├── library-mobile-dark-loaded.png
│   ├── library-mobile-light-loaded.png
│   ├── rsvp-mobile-dark-playing.png
│   └── ...
└── 2026-01-16/
    └── ...
```

---

## 9. Project Scripts

### Create Scripts for Everything

- All common tasks should have npm scripts
- Location: `package.json` scripts section + standalone scripts in `scripts/`

### Required Scripts

| Script                  | Purpose                          |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start full dev environment       |
| `npm run test`          | Run all unit + integration tests |
| `npm run test:watch`    | Run tests in watch mode          |
| `npm run test:e2e`      | Run Playwright E2E tests         |
| `npm run test:e2e:ui`   | Run E2E with Playwright UI       |
| `npm run test:coverage` | Run tests with coverage report   |
| `npm run lint`          | Run ESLint                       |
| `npm run type-check`    | Run TypeScript type checking     |
| `npm run deploy`        | Deploy to Vercel (production)    |
| `npm run db:migrate`    | Run Supabase migrations          |
| `npm run db:seed`       | Seed database with test data     |

### Standalone Scripts (`scripts/` folder)

- `scripts/setup-dev.sh` – Full development environment setup
- `scripts/deploy-all.sh` – Deploy frontend + run DB migrations
- `scripts/reset-db.sh` – Reset and reseed database
- `scripts/update-types.sh` – Regenerate Supabase TypeScript types

---

## 10. README.md Maintenance

### Keep README Badass

- The README should be a complete guide to the project
- Update it when major changes happen

### Required Sections

1. **Project Overview** – What is RSVP Reader?
2. **Screenshots** – Latest E2E screenshots (embedded, not linked)
3. **Getting Started** – How to run locally
4. **Development** – How to develop
5. **Testing** – How to run tests
6. **Deployment** – How to deploy to production
7. **Architecture** – High-level system overview
8. **Contributing** – Guidelines for contributors

### Screenshot Embedding

Include latest screenshots:

```markdown
## Screenshots

### Mobile - Dark Mode

![Library View](./screenshots/2026-01-15/library-mobile-dark-loaded.png)

### Desktop - Light Mode

![RSVP Reading](./screenshots/2026-01-15/rsvp-desktop-light-playing.png)
```

---

## 11. Working Memory

### Write Working Memory Files

- For complex tasks, create a working memory markdown file
- Location: `docs/working-memory/<task-name>.md`
- Purpose: Track context, decisions, and progress

### When to Use Working Memory

- Multi-step implementations
- Debugging sessions
- Research and exploration
- Any task spanning multiple work sessions

### Working Memory Format

```markdown
# Working Memory: [Task Name]

## Objective

[What you're trying to accomplish]

## Current Status

[Where you are right now]

## Key Context

- [Important fact 1]
- [Important fact 2]

## Decisions Made

| Decision | Rationale |
| -------- | --------- |
| ...      | ...       |

## Next Steps

1. [ ] Step 1
2. [ ] Step 2

## Notes

[Any other relevant information]
```

### Cleanup

- Delete or archive working memory files after task completion
- Keep them if they contain useful reference information

---

## 12. Pre-Flight Checklist

### Before Starting Any Task

1. [ ] Read `AGENTS.md` (this file)
2. [ ] Read `docs/PROJECT_PLAN.md`
3. [ ] Check current task in Task Breakdown
4. [ ] Review `OPEN_QUESTIONS.md` for related items
5. [ ] Create working memory file if needed

### Before Each Commit

1. [ ] All tests pass locally (`npm run test && npm run test:e2e`)
2. [ ] No TypeScript errors (`npm run type-check`)
3. [ ] No lint errors (`npm run lint`)
4. [ ] Commit message follows convention
5. [ ] Change is small and focused

### Before Completing a Feature

1. [ ] All related tasks marked complete in PROJECT_PLAN.md
2. [ ] Tests written and passing
3. [ ] Screenshots captured and analyzed
4. [ ] README updated if needed
5. [ ] Any new open questions documented

---

## 13. Summary of Key Files

| File                       | Purpose                        |
| -------------------------- | ------------------------------ |
| `AGENTS.md`                | This file - working guidelines |
| `docs/PROJECT_PLAN.md`     | Master plan and task list      |
| `OPEN_QUESTIONS.md`        | Tracked uncertainties          |
| `README.md`                | Project documentation          |
| `docs/working-memory/*.md` | Task-specific context          |
| `screenshots/<date>/`      | E2E test screenshots           |

---

**Remember**: Quality over speed. Small commits. Never break CI. When in doubt, ask.
