# Repository quality baseline

## Scope

This baseline fulfills `HOME-12`. It records reproducible installation, lint,
production-build, and framework-tooling results without fixing unrelated
application defects.

- Baseline date: 2026-11-26
- Base commit: `bff3132` (`master`)
- Repository: `goncalomiranda/home-dashboard`
- OS: macOS 25.6.0, arm64
- Node.js: 22.23.0
- npm: 10.9.8
- Validation checkout: isolated clean worktree created from `origin/master`

## Installation

### Initial result

Command:

```bash
npm ci
```

Exit code: `1`

The manifest and committed lockfile were not synchronized. In particular,
`remark-gfm@4.0.1` appeared in `package.json` but was absent from
`package-lock.json`, along with its dependency graph. npm rejected the clean
install before installing packages.

### Lockfile repair

Command:

```bash
npm install --package-lock-only --ignore-scripts
```

The declared dependency versions were unchanged. The lockfile received the
missing `remark-gfm` graph and dependency-version metadata required by the
existing manifest.

The clean install was then rerun:

```bash
npm ci
```

Exit code: `0`

Result: 477 packages added. npm reported 11 audit findings: 7 moderate, 3 high,
and 1 critical. It also warned that ESLint 9.39.5 is no longer supported.
These findings were not modified as part of the baseline task.

## Lint

Command:

```bash
npm run lint -- --no-cache
```

Exit code: `1`

Summary: 5 errors and 30 warnings across 10 files.

### Errors

| File | Rule | Count | Result |
|------|------|-------|--------|
| `src/app/admin/newsletter/page.tsx` | `react-hooks/immutability`, `react-hooks/set-state-in-effect` | 2 | `fetchData` is used before declaration; an effect triggers state updates synchronously |
| `src/app/profile/page.tsx` | `react/no-unescaped-entities` | 2 | Apostrophes are not escaped as JSX entities |
| `src/components/ClientOnly.tsx` | `react-hooks/set-state-in-effect` | 1 | An effect synchronously sets mounted state |

Follow-up: [HOME-31](https://mirandags.atlassian.net/browse/HOME-31) covers the
React hook violations. [HOME-33](https://mirandags.atlassian.net/browse/HOME-33)
covers the JSX entity violations.

### Warning groups

| Scope | Warnings | Rules or observation |
|-------|----------|----------------------|
| `src/app/dashboard/page.tsx` | 18 | `@next/next/no-img-element` |
| `src/app/layout.tsx` | 5 | `@next/next/no-page-custom-font`, `@next/next/no-css-tags` |
| `src/app/tables/page.tsx` | 2 | `@next/next/no-img-element` |
| `src/app/admin/newsletter/page.tsx` | 1 | `react-hooks/exhaustive-deps` |
| Other files | 4 | Unused disable directives and anonymous default export |

Warnings do not fail the current lint command but remain part of the quality
baseline.

## Production build

Command:

```bash
npm run build
```

Exit code: `1`

Next.js 16.3.6 successfully compiled the application with Turbopack. The
build then failed during TypeScript validation:

```text
src/components/BootstrapInitializer.tsx(9,5): error TS2717:
Subsequent property declarations must have the same type.
Property 'bootstrap' has a conflicting type.
```

`BootstrapInitializer.tsx` declares `Window.bootstrap` as `any`, while
`src/types/global.d.ts` defines a concrete Bootstrap interface. The build stops
at this duplicate declaration.

Follow-up: [HOME-32](https://mirandags.atlassian.net/browse/HOME-32).

## Framework and lint tooling alignment

Both packages declare compatible major versions:

| Package | `package.json` | Locked version |
|---------|----------------|----------------|
| `next` | `^16.3.6` | `16.3.6` |
| `eslint-config-next` | `^16.3.6` | `16.3.6` |

The two locked versions are aligned at 16.3.6. The installed
`eslint-config-next` peer requirements accept ESLint 9 (`eslint >= 9.0.0`) and
TypeScript 3.3.1 or newer. The repository currently locks ESLint 9.39.5 and
TypeScript 6.0.3.

The caret ranges permit a later `npm install` to select newer compatible
versions, but `npm ci` uses the committed lockfile and is now reproducible. No
dependency version was upgraded in `HOME-12`.

The README previously identified the stack as Next.js 15 and Node.js 18+.
This baseline updates those facts to Next.js 16 and Node.js 20.9+, matching the
installed Next.js package's runtime requirement.

## Completion assessment

`HOME-12` meets its baseline purpose:

- Dependencies install reproducibly from the repaired lockfile.
- Current lint and production-build results are recorded with exit codes.
- Next.js and `eslint-config-next` versions are reviewed and aligned.
- Existing application failures are linked to separate Jira work.

The remaining failures are intentionally not hidden or fixed in this task.
