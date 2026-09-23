# Crawled Content Viewer

This feature displays crawled web content and crawl job status in a Next.js dashboard with AI-powered summaries.

## Features

- ✅ View all crawled content from `public.crawled_content` table
- ✅ View all crawl jobs from `core.crawl_jobs` table
- ✅ Content preview (first 80 characters)
- ✅ "See more" modal with full markdown content rendering (using react-markdown)
- ✅ **Delete records** from both tables with confirmation
- ✅ **AI Summary generation** for both content and jobs
- ✅ Loading indicators
- ✅ Error handling with inline messages
- ✅ Responsive design following Material Dashboard style
- ✅ Job status badges (success, running, failed, etc.)

## Setup Instructions

### 1. Configure Environment Variables

Edit `.env.local` with your PostgreSQL connection details:

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_database_user
POSTGRES_PASSWORD=your_database_password
POSTGRES_DATABASE=goncalo_dashboard

# Optional: For AI Summary feature
OPENAI_API_KEY=your_openai_api_key_here
```

**AI Summary Feature:**
- If you configure `OPENAI_API_KEY`, the AI summary will use OpenAI's GPT-3.5 Turbo
- Without an API key, a mock summary will be generated showing basic statistics

### 2. Verify Database Tables

Ensure these tables exist in your PostgreSQL database:

**public.crawled_content:**
- id (integer, primary key)
- url (varchar)
- title (varchar)
- content (text)
- created_at (timestamp)

**core.crawl_jobs:**
- id (integer, primary key)
- status (varchar)
- error (text, nullable)
- created_at (timestamp)
- started_at (timestamp, nullable)
- finished_at (timestamp, nullable)

If you need to create them, run:

```bash
psql -U your_database_user -d goncalo_dashboard -f setup-database.sql
```

### 3. Start the Development Server

```bash
cd goncalo-dashboard-nextjs
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Access the Crawled Content Page

NavDELETE /api/newsletter/[id]` - Delete a crawled content item
- `GET /api/crawl-jobs` - List all crawl jobs from `core.crawl_jobs`
- `DELETE /api/crawl-jobs/[id]` - Delete a crawl job
- `POST /api/ai-summary` - Generate AI summary for content or job (body: `{id, type: 'content'|'job'}`).

## API Routes

The following API endpoints are available:

- `GET /api/newsletter` - List all crawled content from `public.crawled_content`
- `GET /api/crawl-jobs` - List all crawl jobs from `core.crawl_jobs`

## Features Details
**Actions per row:**
  - 👁️ **See more**: View full content in a modal with markdown rendering
  - ✨ **AI Summary**: Generate an AI-powered summary of the content
  - 🗑️ **Delete**: Remove the record from database (with confirmation)
- Content is rendered with markdown formatting using react-markdown
- URLs are clickable and open in new tab

### Crawl Jobs Table
- Displays job ID, status, error message (if any), and timestamps
- **Actions per row:**
  - ✨ **AI Summary**: Generate an AI-powered summary of the job details
  - 🗑️ **Delete**: Remove the job record from database (with confirmation)
- Color-coded status badges:
  - Green: completed/success
  - Blue: running/in_progress
  - Red: failed/error
  - Gray: other statuses

### AI Summary Feature
- Generates concise summaries using OpenAI GPT-3.5 Turbo (if configured)
- Falls back to basic statistics if no API key is provided
- Displays in a modal with loading indicator
- Works for both content items and crawl jobccess
  - Blue: running/in_progress
  - Red: failed/error
  - Gray: other statuses

### Content Modal
- Shows full markdown-rendered content
- Scrollable for long content
- Displays metadata (URL, creation date)

## Enhanced Markdown Rendering (Optional)

For better markdown rendering, install `react-markdown`:

```bash
npm install react-markdown
```

Then update the page to use it for richer formatting.

## File Structure

```├── route.ts           # GET crawled content
│   │       │   └── [id]/
│   │       │       └── route.ts       # DELETE crawled content
│   │       ├── crawl-jobs/
│   │       │   ├── route.ts           # GET crawl jobs
│   │       │   └── [id]/
│   │       │       └── route.ts       # DELETE crawl job
│   │       └── ai-summary/
│   │           └── route.ts           # POST AI summaryariables
├── .env.example                        # Example env file
├── setup-database.sql                  # Database setup script
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── newsletter/
│   │   │       └── page.tsx           # Main viewer page
│   │   └── api/
│   │       ├── newsletter/
- `react-markdown` - Markdown renderer for React
│   │       │   └── route.ts           # GET crawled content
│   │       └── crawl-jobs/
│   │           └── route.ts           # GET crawl jobs
│   ├── components/
│   │   └── Sidebar.tsx                # Updated with link
│   ├── lib/
│   │   └── db.ts                      # PostgreSQL connection
│   └── types/
│       └── newsletter.ts              # TypeScript interfaces
```

## Dependencies

- `pg` - PostgreSQL client for Node.js
- `@types/pg` - TypeScript types for pg

## Troubleshooting

### Database Connection Errors

If you see database connection errors, verify:
1. PostgreSQL is running
2. Environment variables are correct in `.env.local`
3. The database exists and is accessible
4. The tables have been created

### Table Does Not Exist Error

If you see "relation does not exist" errors:
1. Make sure the schema names are correct (`public.crawled_content` and `core.crawl_jobs`)
2. Verify tables exist: `\dt public.crawled_content` and `\dt core.crawl_jobs` in psql
3. Run the setup SQL script if tables don't exist

### Port Already in Use

If port 3000 is already in use, modify the dev script in `package.json`:

```json
"dev": "next dev -p 4000"
```

## Security Notes

- Never commit `.env.local` to version control
- Use strong passwords for database connections
- Validate and sanitize all user inputs
- Consider adding authentication/authorization in production

