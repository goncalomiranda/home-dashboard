# Implementation Plan: Implement NewsletterIssue Aggregate

**Date**: 2026-11-27 | **Issue**: [HOME-23](https://mirandags.atlassian.net/browse/HOME-23) (Story, Highest priority)

## Summary

Implement a framework- and persistence-independent `NewsletterIssue` aggregate
that captures issue metadata, sections, ordered issue items, and lifecycle
state. Enforce approved-candidate admission, per-issue uniqueness, draft-only
item changes, non-empty readiness, and immutability after publication. Preserve
the candidate's editorial content as issue-item snapshots so later candidate
edits do not change the issue.

HOME-23 depends on HOME-14 (domain language and context map), which is Done.
The existing schema is defined in
[`migrations/0002_newsletter_issues.sql`](../../../migrations/0002_newsletter_issues.sql).
The weekly issue editor and publication workflow are separate work; this plan
covers the aggregate and its unit tests only.

## Technical Context

**Language/Version**: TypeScript 6.0.3
**Primary Dependencies**: None in the domain module; application uses Next.js 16.4.5 and PostgreSQL via `pg`
**Storage**: Existing `newsletter.issues`, `newsletter.issue_items`, and `newsletter.publications` schema
**Testing**: Node's built-in test runner with Node TypeScript type stripping
**Target Platform**: TypeScript domain module consumed by the web application
**Performance Goals**: None specified

**Constraints**:
- Keep domain rules in `src/domain/newsletter/`; do not import Next.js or PostgreSQL.
- Match the canonical `NewsletterIssue` lifecycle and invariants in
  [`docs/along-the-lake-ddd-project-brief.md`](../../along-the-lake-ddd-project-brief.md).
- Align issue status, metadata, item snapshot fields, sections, positions, and
  publication reference with the existing migration.
- Use the existing `Candidate` model and accept only candidates whose status
  is `APPROVED`.
- Keep persistence, API routes, and editor UI out of this issue.

## Constitution Check

No project `constitution.md` was found. The plan follows the existing domain
pattern in [`src/domain/editorial/candidate.ts`](../../../src/domain/editorial/candidate.ts):
keep business invariants in a pure aggregate and verify behavior with focused
Node unit tests.

## Applied Guidelines

Use the canonical Newsletter Production language and lifecycle in
[`docs/newsletter-domain-language.md`](../../newsletter-domain-language.md)
and the aggregate definition in
[`docs/along-the-lake-ddd-project-brief.md`](../../along-the-lake-ddd-project-brief.md).
The database schema is a persistence contract, not a substitute for domain
validation.

## Implementation Steps

### Step 1: Define the `NewsletterIssue` aggregate
- **Requirements**: REQ-001, REQ-002, REQ-003, REQ-004
- **Design inputs**: HOME-23 acceptance criteria; the NewsletterIssue definition
  in the DDD project brief; existing candidate model and
  `migrations/0002_newsletter_issues.sql`
- **Description**: Add a pure TypeScript aggregate under
  `src/domain/newsletter/`. Represent issue identity, title, publication date
  and window, status, sections, ordered issue items, and publication reference.
  Add approved candidates as issue-item snapshots, reject duplicate candidates,
  and prevent adding, removing, moving, or editing items outside the draft
  state. Keep positions unique and continuous within each section when items
  are removed or reordered. Reject marking an empty issue ready and prevent
  changes or republishing after publication. Model lifecycle transitions
  consistently with the project brief and schema, including the publication
  handoff and failure states.

### Step 2: Add focused aggregate unit tests
- **Requirements**: REQ-002, REQ-003, REQ-004, REQ-005
- **Design inputs**: HOME-23 acceptance criteria; aggregate operations in the
  DDD project brief; the existing Node test setup
- **Description**: Add `src/domain/newsletter/issue.test.mjs` covering valid
  lifecycle transitions, rejection of non-approved and duplicate candidates,
  snapshot preservation, draft-only item operations, contiguous ordering after
  remove/reorder, empty-issue readiness rejection, and immutability after
  publication. Add the test file to the existing `npm test` command in
  `package.json`.

### Step 3: Verify the aggregate
- **Requirements**: REQ-001, REQ-005
- **Design inputs**: `package.json`; TypeScript strict mode; existing domain
  isolation pattern
- **Description**: Run the focused newsletter aggregate tests and
  `npm run build`. Confirm the aggregate has no Next.js or PostgreSQL imports
  and its state cannot be mutated through returned snapshots.

## Project Structure

```text
src/
  domain/
    editorial/
      candidate.ts                    # Existing approved-candidate model
    newsletter/
      issue.ts                        # NewsletterIssue aggregate and invariants
      issue.test.mjs                  # Lifecycle and invariant unit tests
package.json                          # Include issue.test.mjs in npm test
migrations/
  0002_newsletter_issues.sql          # Existing persistence contract
docs/plans/HOME-23/plan.md
```

## Testing Strategy

- **Unit tests**: Cover valid transitions, approved-only admission, duplicate
  prevention, item snapshot preservation, draft-only item operations,
  continuous section ordering, non-empty readiness, and published immutability.
- **Isolation check**: Confirm the aggregate imports no Next.js or PostgreSQL
  modules.
- **Build gate**: `npm test` and `npm run build` complete successfully.
- **Scope**: No repository, API, UI, database integration, or publication
  provider behavior is planned for HOME-23.

## Phase 1: Domain Aggregate

- [x] T001 [Plan:1.1] Add the framework- and persistence-independent
  `NewsletterIssue` aggregate with issue lifecycle and item invariants.

## Phase 2: Tests and Verification

- [x] T002 [Plan:2.1] Add focused Node unit tests and include them in
  `npm test`.
- [x] T003 [Plan:3.1] Run unit tests and `npm run build`; verify domain
  isolation and immutable snapshots.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|------------------------|
| REQ-001 | The `NewsletterIssue` aggregate models issue data and lifecycle without framework or persistence coupling. | 1.1, 3.1 | `src/domain/newsletter/issue.ts`; import review |
| REQ-002 | Only approved candidates can be added, and each candidate appears at most once per issue. | 1.1, 2.1 | Aggregate admission rules and unit tests |
| REQ-003 | Items can be removed and reordered only while the issue is a draft. | 1.1, 2.1 | Draft-only operations and ordering tests |
| REQ-004 | Empty issues cannot become ready, and published issues cannot be modified or republished. | 1.1, 2.1 | Lifecycle guards and unit tests |
| REQ-005 | Unit tests cover the lifecycle and aggregate invariants. | 2.1, 3.1 | Newsletter aggregate test results |
