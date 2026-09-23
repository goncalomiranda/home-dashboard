-- The tables should already exist in your database:
-- public.crawled_content
-- core.crawl_jobs

-- If you need to create them, use these schemas:

-- Create the crawled_content table
CREATE TABLE IF NOT EXISTS public.crawled_content (
  id SERIAL PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_crawled_content_created_at ON public.crawled_content(created_at DESC);

-- Create the crawl_jobs table
CREATE TABLE IF NOT EXISTS core.crawl_jobs (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created_at ON core.crawl_jobs(created_at DESC);

