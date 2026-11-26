# Implementation Plan: Resolve Bootstrap Global Type Conflict

**Date**: 2026-11-26 | **Issue**: [HOME-32](https://mirandags.atlassian.net/browse/HOME-32) (Bug, High priority)

## Summary

Remove the redundant `Window.bootstrap` declaration from
`src/components/BootstrapInitializer.tsx` and use the existing concrete global
type in `src/types/global.d.ts`. Then confirm the production build passes and
smoke-test Bootstrap initialization and UI behavior. This is a type-only
correction; it should not change runtime behavior.

The current TS2717 failure and baseline build command are documented in
`docs/repository-quality-baseline.md`.

## Technical Context

**Language/Version**: TypeScript 6.0.3
**Primary Dependencies**: Next.js 16.3.6, React 19.3.0
**Storage**: Not applicable
**Testing**: `npm run build`; manual browser smoke test (no dedicated test script or application test suite is configured)
**Target Platform**: Next.js web application in a browser
**Performance Goals**: None; no runtime behavior change is intended
**Constraints**:
- Keep `src/types/global.d.ts` as the single source of the global Bootstrap type.
- Do not replace the concrete type with `any` or broaden the change to unrelated build or lint issues.
- `tsconfig.json` includes `**/*.ts`, so the shared declaration participates in TypeScript validation.

## Constitution Check

No project `constitution.md` was found. The plan is limited to resolving the
conflicting declaration, preserves the existing runtime behavior, and does not
add dependencies or abstractions.

## Applied Guidelines

No applicable migration or transformation guidelines were found in this
workspace. The change follows the existing shared global declaration rather
than introducing another type definition.

## Implementation Steps

### Step 1: Remove the duplicate Bootstrap global declaration
- **Requirements**: REQ-001
- **Design inputs**: HOME-32; existing declarations in `src/components/BootstrapInitializer.tsx` and `src/types/global.d.ts`
- **Description**: Delete the component-local `declare global` block that types `Window.bootstrap` as `any`. Keep the existing concrete declaration in `src/types/global.d.ts` unchanged, and leave the initializer's Bootstrap setup behavior unchanged.

### Step 2: Verify build and Bootstrap behavior
- **Requirements**: REQ-002, REQ-003
- **Design inputs**: HOME-32; `src/app/layout.tsx` loads the Bootstrap bundle before interactive code; `src/app/dashboard/page.tsx` renders `BootstrapInitializer`.

#### Plan item 2.1: Verify the production build
Run `npm run build` and confirm TypeScript no longer reports TS2717. Record any
newly surfaced, unrelated failure separately rather than expanding this fix.

#### Plan item 2.2: Smoke-test Bootstrap runtime behavior
Start the app and smoke-test the dashboard: confirm the Bootstrap bundle and
initializer load without browser-console errors, then exercise a Bootstrap
dropdown and tooltip where available.

## Project Structure

```text
src/
  app/
    layout.tsx                         # Existing Bootstrap bundle loading order
    dashboard/page.tsx                 # Renders BootstrapInitializer
  components/
    BootstrapInitializer.tsx           # Remove duplicate global declaration
  types/
    global.d.ts                        # Retain canonical Bootstrap global type
tsconfig.json                           # Includes the shared declaration
```

## Testing Strategy

- **Build gate**: `npm run build` completes successfully and no longer emits TS2717 for `Window.bootstrap`.
- **Runtime smoke test**: Run the app, visit `/dashboard`, verify the Bootstrap bundle is available and the initializer runs without console errors, then verify a dropdown opens and a tooltip appears on an applicable control.
- **Scope**: No new automated-test framework or test files are planned for this focused type-declaration fix.

## Phase 1: Foundational

- [ ] T001 [Plan:1.1] Remove the duplicate `Window.bootstrap` declaration from `src/components/BootstrapInitializer.tsx`, retaining the shared concrete type in `src/types/global.d.ts`.

## Phase 2: Verification

- [ ] T002 [Plan:2.1] Run `npm run build` and confirm there is no TS2717 error for `Window.bootstrap`.
- [ ] T003 [Plan:2.2] Run the dashboard browser smoke test for Bootstrap loading, initialization, dropdown behavior, tooltip behavior, and console errors.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|------------------------|
| REQ-001 | There is one compatible global Bootstrap type declaration. | 1.1 | `src/components/BootstrapInitializer.tsx`, `src/types/global.d.ts` |
| REQ-002 | `npm run build` completes without the TS2717 error. | 2.1 | Production build output |
| REQ-003 | Bootstrap initialization and component behavior are smoke-tested. | 2.2 | Dashboard runtime smoke-test results |
