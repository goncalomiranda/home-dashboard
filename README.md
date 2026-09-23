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

- Next.js 15
- React 19
- TypeScript
- PostgreSQL via `pg`
- Material Dashboard styling assets under `public/assets`
- Markdown rendering via `react-markdown`

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL database with the required tables and permissions

## Installation

```bash
npm install
```

## Environment configuration

Create a `.env.local` file in the project root with the database and AI config values used by the app:

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DATABASE=your_db_name

LLM_API_URL=http://localhost:3100/api/v1/knowledge/query-slm
LLM_API_KEY=your_llm_api_key_here
```

The database connection is initialized in `src/lib/db.ts`.

## Database setup

The repo includes `setup-database.sql`, which creates the required tables for:
- `public.crawled_content`
- `core.crawl_jobs`

The app also reads and writes events from `core.event` via the event APIs, so that table must exist in your database as well.

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

This project retains the Material Dashboard 3 styling assets and theme structure, and includes custom application code layered on top of that template.