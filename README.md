# FeatureGenAI — CI Pipeline

**Stack:** Azure DevOps · TypeScript · Node.js 20 · Vitest · ESLint · PostgreSQL

---

## Overview

FeatureGenAI is an AI-powered BDD feature generation platform that transforms user stories into structured Cucumber features and scenarios using OpenAI and domain-specific knowledge.

This pipeline enforces code quality on every pull request and every push to `main`, then runs the full integration suite on a weekday schedule. No code reaches `main` without passing all automated checks and a human review.

| | |
|---|---|
| **CI tool** | Azure DevOps Pipelines |
| **Linter** | ESLint |
| **Type check** | `tsc --noEmit` (`npm run check`) |
| **Unit tests** | Vitest — `tests/utils/` + `tests/server/` |
| **Integration tests** | Vitest — `tests/integration/` against real PostgreSQL |
| **Security** | `scripts/security-check.mjs` |
| **Branch protected** | `main` |
| **Merge strategy** | Squash merge only |

---

## Pipeline Structure

### Stage 1 — Code Quality

Runs on every PR and every push to `main`. All four jobs run in parallel.

| Job | Command | What it checks |
|---|---|---|
| **ESLint** | `npm run lint` | Code style and quality across client/ and server/ |
| **TypeScript Type Check** | `npm run check` | Type correctness across shared/, client/, server/ |
| **Unit Tests** | `npm run test:coverage` | Business logic — feature generation, storage, auth, permissions |
| **Security Check** | `npm run security-check` | Dependency vulnerabilities and insecure patterns |

> `FEATUREGEN_FAKE_AI=1` is set in CI so unit tests never make real OpenAI API calls — keeps tests fast, free, and reliable.

### Stage 2 — Integration Tests

Runs on the weekday morning schedule and post-merge pushes to `main`. Skipped on PR builds. Requires a live `DATABASE_URL` from the variable group.

| Job | Command | What it checks |
|---|---|---|
| **Integration Tests** | `npm run test:integration` | Full stack — auth flows, storage, API routes against real PostgreSQL |

---

## Triggers

```
PR opened / updated  →  Stage 1 only  (fast, ~15 min)
Push to main         →  Stage 1 → Stage 2
Weekday schedule     →  Stage 2 only  (Stage 1 skipped)
Manual run           →  Stage 1 → Stage 2
```

---

## Branch Policies (Manual Setup Required)

Branch policies live in ADO — they cannot be expressed in YAML. A project admin must configure these under:

> **Project Settings → Repos → [repo] → Policies → Branch Policies → main**

| Policy | Setting |
|---|---|
| Minimum reviewers | **1 required** |
| Reset votes on new commits | **On** — prevents stale approvals |
| Build validation | Point at this pipeline · set to **Required** |
| Allow merge commits | **Off** |
| Allow squash merge | **On** |
| Block direct pushes to main | **On** |

---

## Variable Group: `FeatureGenAI-Secrets`

Secrets are stored in **ADO Library → Variable Groups** and never committed to this file.

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | Unit Tests, Integration Tests | PostgreSQL connection string (Neon or local) |
| `SESSION_SECRET` | Integration Tests | Signs express-session cookies in auth flow tests |
| `OPENAI_API_KEY` | Integration Tests (optional) | Only needed if `FEATUREGEN_FAKE_AI` is not set |

---

## Ways This Process Can Fail

### Expected failures (pipeline working correctly)

| Failure | Result |
|---|---|
| ESLint error | Lint job fails · PR blocked |
| Type error (`tsc --noEmit`) | TypeCheck job fails · PR blocked |
| Failing unit test | UnitTests job fails · PR blocked |
| Security vulnerability found | SecurityCheck job fails · PR blocked |
| Failing integration test | Stage 2 fails · author notified post-merge |

### Infrastructure failures

| Failure | Impact |
|---|---|
| ADO service outage | Pipelines queue until service recovers |
| npm registry outage | `npm ci` fails — mitigated by `--prefer-offline` cache flag |
| Flaky unit test | Intermittent failures erode trust — quarantine or fix immediately |
| Agent pool exhausted | Runs queue — consider additional agents for busy PRs |
| PostgreSQL unreachable | Integration tests fail — Stage 2 only, does not block PRs |

---

## Notifications

- PR author is notified when checks fail or pass
- Assigned reviewers are notified when review is requested
- PR author is notified on approval or change request
- Watchers are notified on merge to `main`
- Commit author is notified when a post-merge `main` check fails

---

## Stakeholders

| Role | Responsibility |
|---|---|
| Developers | Write code, open PRs, fix check failures |
| Reviewers / Tech Leads | Approve PRs, catch logic issues CI cannot |
| ADO Project Admins | Configure branch policies, manage agent pools and secrets |
