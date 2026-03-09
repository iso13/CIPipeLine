# CI Pipeline Documentation

**Stack:** Azure DevOps · ESLint · TypeScript · Jest · Cucumber · Playwright · Node.js 20

---

## Overview

This pipeline enforces code quality on every pull request and every push to `main`, then runs the full E2E suite on a weekday schedule. No code reaches `main` without passing all three automated checks and a human review.

| | |
|---|---|
| **CI tool** | Azure DevOps Pipelines |
| **Linter** | ESLint with `@typescript-eslint` |
| **Type check** | `tsc --noEmit` |
| **Unit tests** | Jest with Cobertura coverage (80% threshold) |
| **E2E tests** | Cucumber + Playwright (Chromium) |
| **Branch protected** | `main` |
| **Merge strategy** | Squash merge only |

---

## Pipeline Structure

The pipeline is split into two stages that run under different conditions.

### Stage 1 — Code Quality

Runs on every PR and every direct push to `main`. All three jobs run in parallel.

| Job | What it does |
|---|---|
| **ESLint** | Lints `src/` and `features/` — fails on any error |
| **TypeScript Type Check** | Runs `tsc --noEmit` — fails on any type error |
| **Unit Tests (Jest)** | Runs unit tests, enforces 80% coverage, publishes JUnit + Cobertura results to ADO |

### Stage 2 — E2E Tests

Runs on the weekday morning schedule and on manual triggers. Skipped on PR builds to keep feedback fast. Depends on Stage 1 passing (or being skipped on schedule runs).

| Job | What it does |
|---|---|
| **FeatureForgeAI** | Runs Cucumber + Playwright against the target environment, generates and deploys the HTML report to `automation.fmne.com` |

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
| Build validation | Point at this pipeline, set to **Required** |
| Allow merge commits | **Off** |
| Allow squash merge | **On** |
| Allow rebase | Optional |
| Block direct pushes to main | **On** |

---

## npm Scripts

Add these to `package.json` to match what the pipeline calls:

```json
"scripts": {
  "lint":       "eslint src/ features/ --ext .ts",
  "lint:fix":   "eslint src/ features/ --ext .ts --fix",
  "typecheck":  "tsc --noEmit",
  "test:unit":  "jest --config jest.config.js"
}
```

New dev dependencies required:

```
@typescript-eslint/eslint-plugin
@typescript-eslint/parser
eslint
jest
jest-junit
ts-jest
```

---

## Ways This Process Can Fail

### Expected failures (pipeline working correctly)

| Failure | Result |
|---|---|
| ESLint error | Lint job fails, PR blocked |
| Type error (`tsc --noEmit`) | TypeCheck job fails, PR blocked |
| Failing unit test | UnitTests job fails, PR blocked |
| Coverage below 80% | Jest exits non-zero, PR blocked |

### Process / human failures

| Failure | Impact |
|---|---|
| No reviewer approves | PR sits open — needs team SLA to resolve |
| Branch policy not configured by admin | Pipeline runs but nothing blocks the merge |
| Stale approval not dismissed | New breaking commit accepted under old approval |
| `CodeQuality` stage renamed in YAML | ADO build validation policy references old name silently — gate disappears |

### Infrastructure failures

| Failure | Impact |
|---|---|
| ADO service outage | Pipelines queue until service recovers |
| npm registry outage | `npm ci` fails — mitigated by the `--prefer-offline` cache flag |
| Flaky unit test | Intermittent failures erode trust — quarantine or fix immediately |
| Agent pool exhausted | Runs queue — consider additional agents for busy PRs |

---

## Notifications

### Built-in ADO notifications (no config needed)

- PR author is notified when checks fail or pass
- Assigned reviewers are notified when review is requested
- PR author is notified on approval or change request
- Watchers are notified on merge to `main`
- Commit author is notified when a post-merge `main` check fails

### Recommended additions

- **Slack** — connect the ADO → Slack integration and post `main` branch failures to a `#ci-alerts` channel. A broken `main` is higher severity than a broken PR.
- **README badge** — shows live `main` health at a glance:

```markdown
[![Build Status](https://dev.azure.com/{org}/{project}/_apis/build/status/{pipeline}?branchName=main)](https://dev.azure.com/{org}/{project}/_build/latest?definitionId={id}&branchName=main)
```

---

## Stakeholders

### Current

| Role | Responsibility |
|---|---|
| Developers | Write code, open PRs, fix check failures |
| Reviewers / Tech Leads | Approve PRs, catch logic issues CI cannot |
| ADO Project Admins | Configure branch policies, manage agent pools and secrets |

### As the process evolves

| Scenario | Who to involve |
|---|---|
| Adding deployment stages | DevOps / Platform Engineering |
| Adding E2E gates to PRs | QA Engineers — define what smoke tests are safe to run on every PR |
| Security / compliance requirements | Security team for SAST (CodeQL), dependency scanning; Compliance for audit log retention |
| Growing team | Engineering Manager to set review SLAs and maintain CODEOWNERS |
| Budget / billing | Finance — ADO pipeline minutes scale with team size |

---

## Recommended Next Steps

1. **CODEOWNERS** — auto-assign reviews to the right team when specific paths change
2. **`npm audit` step** — fail on high-severity vulnerabilities in Stage 1
3. **Dependabot** — auto-raise PRs for dependency updates
4. **Matrix testing** — run unit tests across Node 18, 20, and 22 if broad compatibility matters
5. **`strict: true` in tsconfig** — ensures `tsc --noEmit` catches the broadest set of type issues; enable incrementally to clear the existing backlog first
