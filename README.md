# Goncalo Dashboard

This repository is a Next.js dashboard built on top of the Material Dashboard 3 template, customized for a newsletter/content workflow. The app includes a dashboard shell plus an admin area for viewing crawled content, monitoring crawl jobs, and managing events extracted from content.

## Overview

The project combines:
- a Material Dashboard UI shell
- a PostgreSQL-backed content workflow
- a newsletter management/admin page
- API routes for reading and modifying database records
- AI summary generation for crawled content and crawl jobs

## Current app structure

Implemented routes in the app include:
- `/` → redirects to `/dashboard`
- `/dashboard` → main dashboard shell
- `/tables` → example table view
- `/profile` → profile page
- `/sign-in` → sign-in page
- `/admin/newsletter` → content, crawl jobs, and events admin dashboard

## Core features

- View crawled content records from `public.crawled_content`
- View crawl jobs from `core.crawl_jobs`
- Delete content, jobs, and events with confirmation
- Preview article content in a modal
- Render markdown content with `react-markdown`
- Generate AI summaries for content or jobs via `/api/ai-summary`
- Manage events in `core.event` with create/edit/delete actions
- Filter events by date range

## Tech stack

- Next.js 16
- React 19
- TypeScript
- PostgreSQL via `pg`
- Material Dashboard styling assets under `public/assets`
- Markdown rendering via `react-markdown`

## Prerequisites

- Node.js 20.9+
- npm
- PostgreSQL database with the required tables and permissions

## Installation

```bash
npm ci
```

## Environment configuration

Create a `.env.local` file in the project root with the database and AI config values used by the app:

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DATABASE=your_db_name

ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=use_a_long_random_password

LLM_API_URL=http://localhost:3100/api/v1/knowledge/query-slm
LLM_API_KEY=your_llm_api_key_here
```

The database connection is initialized in `src/lib/db.ts`.
The admin UI and API routes require HTTP Basic authentication using `ADMIN_USERNAME`
and `ADMIN_PASSWORD`. The app fails closed with a 503 response if either value is
missing. Use a strong, unique password and deploy the application behind HTTPS.

## Database setup

The repo includes `setup-database.sql`, which creates the required tables for:
- `public.crawled_content`
- `core.crawl_jobs`

The app also reads and writes events from `core.event` via the event APIs, so that table must exist in your database as well.

### Editorial and newsletter migrations

The editorial queue and issue schema require these migrations in order:

1. `migrations/0001_editorial_candidates.sql` expects an existing
   `public.crawled_content` table with an integer `id` primary key. It does not
   create candidates from existing content; that workflow is tracked
   separately in HOME-19.
2. `migrations/0002_newsletter_issues.sql` creates the `newsletter` schema and
   issue, issue-item, and publication tables. It requires the editorial
   candidate schema from migration 0001.

These migrations have no automatic version ledger and must each be applied
only once to each database. They fail if their schemas or constraints already
exist; investigate that condition rather than ignoring it. HOME-9 describes a
migration and backup procedure, but its implementation was not found in this
repository. Confirm the actual operational procedure, database identity,
privileges, and a recoverable backup before changing any shared database.

For example, with PostgreSQL connection settings supplied through `PGHOST`,
`PGPORT`, `PGUSER`, `PGDATABASE`, and a secure `.pgpass` file:

```bash
umask 077
pg_dump --format=custom --file="$HOME/pre-editorial-migration.dump"
psql -X --set=ON_ERROR_STOP=1 --file=migrations/0001_editorial_candidates.sql
psql -X --set=ON_ERROR_STOP=1 --file=migrations/0002_newsletter_issues.sql
```

Do not overwrite an existing backup; choose a unique, secure backup path. First
restore the backup to a **separate non-production database**, check the restore
and apply the migration there. For example, after creating an empty test
database, run `pg_restore --exit-on-error --dbname=<test_database> <backup_file>`.
Never restore over the live database. Compare existing row counts before and
after migration, and confirm the application role can use the `editorial`
schema and read and write its tables. Keep backups outside the repository and,
where appropriate, on separate storage.

An opt-in integration test exercises both migrations, issue-schema constraints,
and the review API against an **empty, disposable** database whose name begins
with `test_` or ends in `_test`. It creates tables and test data and does not
clean them up. Start the application with its `POSTGRES_*` settings pointing
to that same database, then run:

```bash
EDITORIAL_TEST_DATABASE_URL=postgresql://localhost/home_dashboard_test \
EDITORIAL_TEST_BASE_URL=http://localhost:3000 \
node --env-file=.env.local --test tests/editorial-integration.test.mjs
```

The test uses `ADMIN_USERNAME` and `ADMIN_PASSWORD` from the environment.
Never point the test application or test database URL at a live database.

Example schema setup for the tables in this repo:

```sql
CREATE TABLE IF NOT EXISTS public.crawled_content (
  id SERIAL PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core.crawl_jobs (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

Your event table should also exist before using the newsletter admin screen for event management.

## Repository quality baseline

The reproducible install, lint, and production-build baseline is recorded in
[docs/repository-quality-baseline.md](docs/repository-quality-baseline.md).

## Dependabot updates

Dependabot checks npm and GitHub Actions dependencies weekly. To run a version
update check manually on GitHub, open **Insights → Dependency graph →
Dependabot**, select **Recent update jobs** for the ecosystem, and click
**Check for updates**. Dependabot version updates must be enabled and the
configuration must be present on the default branch. See
[GitHub's instructions](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/re-run-dependabot-jobs).

## Run locally

Start the app in development mode:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

For a production build:

```bash
npm run build
npm start
```

## API routes

The project exposes these main API endpoints:

- `GET /api/newsletter` — list crawled content
- `GET /api/crawl-jobs` — list crawl jobs
- `GET /api/events` — list events with optional `date_from` / `date_to` filters
- `POST /api/events` — create an event
- `PUT /api/events/[id]` — update an event
- `DELETE /api/events/[id]` — delete an event
- `POST /api/ai-summary` — generate an AI summary for a content item or job

## Repository highlights

- `src/app/admin/newsletter/page.tsx` — main admin dashboard for content and event management
- `src/app/api/*` — backend endpoints for the dashboard
- `src/lib/db.ts` — Postgres connection helper
- `src/types/newsletter.ts` — shared data typing for crawled records and events
- `public/assets` — original Material Dashboard assets retained for styling

## Notes

- The project is a customized Material Dashboard app, not a generic template-only demo.
- The newsletter admin experience is the main business feature in this repo.
- The app expects a working Postgres instance and valid environment variables for the database and LLM integration to function fully.

## License

The application code in this repository is licensed under the MIT License; see [LICENSE](LICENSE). The retained Material Dashboard 3 assets are Copyright (c) 2017 Creative Tim and are also MIT-licensed. Their copyright and license notice is included in [LICENSE](LICENSE). Other third-party components may be subject to separate licenses.