# Implementation Plan: Create Candidate from Existing Crawled Content

**Date**: 2026-11-26 | **Issue**: [HOME-19](https://mirandags.atlassian.net/browse/HOME-19) (Story, Highest priority)

## Summary

Add an authenticated UI for creating editorial candidates from existing crawled
content. Editors select a crawled-content record, pre-populate a candidate form
with title, source URL, and content, complete or correct the remaining fields,
and save the candidate while retaining the crawled-content record as provenance.

HOME-19 depends on HOME-17 (editorial candidate schema, Done) and HOME-15
(Candidate domain model, Done). It is a prerequisite for HOME-21 (publish a
complete issue). Creation does not require AI extraction; extraction remains a
separate, optional capability.

## Technical Context

**Language/Version**: TypeScript 6.0.3
**Primary Dependencies**: Next.js 16.4.5, React 19.3.0, PostgreSQL via `pg`
**Storage**: `editorial.candidates` and `editorial.candidate_neighbourhoods`,
already created by HOME-17
**Testing**: Node's built-in test runner for domain/application tests; production
build and authenticated browser smoke test
**Target Platform**: Next.js admin application
**Performance Goals**: None specified
**Constraints**:
- Editors must select a crawled-content record to source the candidate.
- Pre-populate title, source URL, and content; allow correction.
- Support all candidate fields: headline, summary, category, neighbourhoods,
start/end dates, venue, location.
- Retain crawled-content record ID as provenance.
- Enforce candidate domain invariants through the application layer.
- Use the existing admin authentication pattern.
- Display validation errors clearly.
- Do not add automated AI extraction or summarization in this story.

## Constitution Check

No project `constitution.md` was found. The plan follows the existing pattern:
keep candidate invariants in the domain model, persistence in the editorial
library, and HTTP/UI concerns in Next.js routes and components. Avoid
duplicating domain rules in the UI or API.

## Applied Guidelines

Use the canonical Editorial terminology in `docs/newsletter-domain-language.md`.
A candidate is sourced from a crawled-content record; the record ID is stored
as provenance. Existing event records should not be silently reinterpreted as
candidates—that migration belongs to separate work.

## Implementation Steps

### Step 1: Add candidate-creation application support
- **Requirements**: REQ-001, REQ-002, REQ-003, REQ-004
- **Design inputs**: HOME-19 acceptance criteria; existing candidate domain and
repository in `src/domain/editorial/candidate.ts` and
`src/lib/editorial/candidates.ts`
- **Description**: Add an authenticated API route to create a candidate from a
crawled-content record. Accept the crawled-content ID, candidate fields
(headline, summary, category, neighbourhoods, start/end dates, venue,
location), and create the candidate with provenance linking to the source
record. Validate all fields and return clear errors. Use the existing
candidate repository pattern. Protect the endpoint with admin authentication.

### Step 2: Add the candidate-creation UI
- **Requirements**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Design inputs**: HOME-19 acceptance criteria; existing admin UI conventions
in `src/app/admin/editorial/page.tsx` and crawled-content view in
`src/app/admin/newsletter/page.tsx`
- **Description**: Add a form-based creation surface under a new route
(e.g., `/admin/editorial/candidates/new` or a modal in the editorial queue
page). Allow selection of a crawled-content record from a list or search.
Pre-populate available fields (title, source URL, content) and allow
correction. Provide form fields for all candidate attributes. Display
section/neighbourhood selection, date inputs, and optional venue/location.
Show validation errors returned by the server. Redirect or notify on success.

### Step 3: Test creation behavior and verify integration
- **Requirements**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Design inputs**: HOME-19 acceptance criteria; candidate domain invariants;
repository `npm test` and `npm run build` scripts
- **Description**: Add focused tests for crawled-content selection, form
pre-population, field validation, server-side candidate creation, error
feedback, and provenance retention. Run the tests and production build.
Smoke-test creating a candidate through the authenticated UI, including form
submission, validation feedback, and persistence/reload verification.

## Project Structure

```text
src/
  app/
    admin/editorial/
      candidates/new/page.tsx       # Candidate creation form
      page.tsx                      # Existing editorial queue
    api/editorial/
      candidates/create/route.ts    # Candidate creation endpoint
  lib/editorial/
    candidates.ts                   # Existing repository (extend)
docs/plans/HOME-19/plan.md
```

Routing and module placement should follow the existing editorial workflow
organization in `src/app/admin/editorial/`.

## Testing Strategy

- **API tests**: Crawled-content selection, field validation, provenance
retention, candidate domain invariants, and admin authentication.
- **UI tests**: Form pre-population, field editing, section/neighbourhood
selection, error display, and submission behavior.
- **Domain tests**: Validation errors follow the candidate model contract (via
existing tests in HOME-15).
- **Build gate**: `npm test` and `npm run build` complete successfully.
- **Runtime smoke test**: Select a crawled-content record, pre-populate form,
edit fields, submit, verify persistence and reload, check provenance in
candidate record.
- **Scope**: No AI extraction, automated candidate suggestion, or bulk import.

## Phase 1: Application Support

- [ ] T001 [Plan:1.1] Add authenticated crawled-content selection and candidate
creation API endpoint.

## Phase 2: Editor UI

- [ ] T002 [Plan:2.1] Add a candidate-creation form with crawled-content
selection, field pre-population, and validation feedback.

## Phase 3: Verification

- [ ] T003 [Plan:3.1] Add focused tests and verify authentication, persistence,
validation, and the production build.
- [ ] T004 [Plan:3.1] Smoke-test the authenticated editor, including form
submission and persistence.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|------------------------|
| REQ-001 | The editor can select an existing crawled-content record. | 1.1, 2.1, 3.1 | Crawled-content selection API and UI |
| REQ-002 | A candidate form is pre-populated with available title, source URL, and content. | 1.1, 2.1, 3.1 | Form pre-population logic and UI |
| REQ-003 | The editor can complete or correct all candidate fields. | 1.1, 2.1, 3.1 | Form field inputs and submission tests |
| REQ-004 | The candidate retains the crawled-content record as provenance. | 1.1, 3.1 | Provenance storage and verification |
| REQ-005 | Creation does not require automated AI extraction. | 1.1, 2.1, 3.1 | Manual form submission without AI steps |
