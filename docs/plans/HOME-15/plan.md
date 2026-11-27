# Implementation Plan: Implement Candidate Domain Model

**Date**: 2026-11-26 | **Issue**: [HOME-15](https://mirandags.atlassian.net/browse/HOME-15) (Story, Highest priority)

## Summary

Implement an Editorial `Candidate` domain model as framework- and persistence-
independent TypeScript. Model the documented candidate lifecycle and enforce
approval requirements, including the event start-date rule. Rejection must
preserve its reason. Add focused unit tests for valid and invalid transitions.

HOME-15 depends on HOME-14, which is Done. This work blocks HOME-16 (editorial
review queue) and HOME-19 (creating candidates from crawled content).

## Technical Context

**Language/Version**: TypeScript 6.0.3
**Primary Dependencies**: None in the domain module; the application uses Next.js 16.4.5 and PostgreSQL via `pg`.
**Storage**: None; persistence and schema are outside this issue.
**Testing**: Node's built-in test runner with Node 22 TypeScript type stripping; no additional test dependency.
**Target Platform**: TypeScript domain module consumed by the web application
**Performance Goals**: None
**Constraints**:
- Domain code must not import Next.js or PostgreSQL libraries.
- Follow `docs/newsletter-domain-language.md` and the candidate entity and lifecycle in `docs/along-the-lake-ddd-project-brief.md`.
- An approved candidate requires a non-empty headline, summary, category, provenance, and at least one neighbourhood.
- Event candidates require a start date before approval.
- Rejection records a reason; candidate decisions record when they occurred.
- Do not add persistence, API, or UI behavior to this story.

## Constitution Check

No project `constitution.md` was found. The plan keeps business rules inside a
small pure domain module, avoids coupling the model to application or database
frameworks, and limits tests to the required lifecycle behavior.

## Applied Guidelines

Use the canonical Editorial terminology and lifecycle in
`docs/newsletter-domain-language.md` and
`docs/along-the-lake-ddd-project-brief.md`. Existing event records must not be
silently treated as candidates; conversion and persistence belong to separate
work.

## Implementation Steps

### Step 1: Define the Candidate domain model
- **Requirements**: REQ-001, REQ-002, REQ-003
- **Design inputs**: HOME-15; candidate entity, lifecycle, and invariants in `docs/along-the-lake-ddd-project-brief.md`
- **Description**: Add a pure TypeScript model under `src/domain/editorial/`. Represent candidate identity, type, editorial fields, neighbourhoods, provenance, status, timestamps, and event-specific details. Encode the documented lifecycle (`DISCOVERED` → `NEEDS_REVIEW` → `APPROVED` or `REJECTED`) and reject invalid transitions. Approval validates every required field and requires a start date for event candidates. Rejection stores its reason and decision time. Keep framework and persistence concerns out of this module.

### Step 2: Add focused unit tests
- **Requirements**: REQ-004
- **Design inputs**: HOME-15; available repository test tooling and Node runtime
- **Description**: Add tests for successful approval and rejection, approval with each required field missing, event approval without a start date, rejection reason retention, and invalid lifecycle transitions. Establish only the minimal TypeScript-compatible test runner needed if no existing tooling supports these tests.

### Step 3: Verify isolation and behavior
- **Requirements**: REQ-001, REQ-004
- **Design inputs**: HOME-15; `package.json`, TypeScript strict mode in `tsconfig.json`
- **Description**: Run the focused unit tests and `npm run build`. Confirm the domain module's imports do not include Next.js or PostgreSQL, and that type checking succeeds.

## Project Structure

```text
src/
  domain/
    editorial/
      candidate.ts              # Candidate state, fields, invariants, transitions
      candidate.test.mjs        # Focused lifecycle and invariant tests
package.json                    # Add a test script and minimal runner only if needed
```

## Testing Strategy

- **Unit tests**: Exercise valid transitions, required-field failures, the
  event-date invariant, rejection reason retention, and invalid transitions.
- **Isolation check**: Verify the Candidate domain module has no imports from
  Next.js or PostgreSQL.
- **Build gate**: `npm run build` completes successfully.
- **Scope**: No database, API, or UI integration tests are planned for this
  domain-only story.

## Phase 1: Domain Model

- [x] T001 [Plan:1.1] Add the framework- and persistence-independent Candidate model with documented fields, lifecycle, approval invariants, and rejection reason.

## Phase 2: Tests and Verification

- [x] T002 [Plan:2.1] Add focused unit tests using the smallest compatible test setup available in the repository.
- [x] T003 [Plan:3.1] Run unit tests and `npm run build`; verify the domain module imports no Next.js or PostgreSQL libraries.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|------------------------|
| REQ-001 | Domain code does not import Next.js or PostgreSQL libraries. | 1.1, 3.1 | `src/domain/editorial/candidate.ts`; import review |
| REQ-002 | Candidate approval enforces headline, summary, category, provenance, and neighbourhood. | 1.1, 2.1 | Candidate approval validation and unit tests |
| REQ-003 | Event candidates require a start date before approval, and rejection records a reason. | 1.1, 2.1 | Candidate transitions and unit tests |
| REQ-004 | Unit tests cover valid and invalid transitions. | 2.1, 3.1 | Candidate lifecycle test results |
