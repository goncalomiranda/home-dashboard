export interface CrawledContent {
    id: number;
    url: string;
    title: string;
    content: string;
    created_at: string;
}

export interface CrawlJob {
    id: number;
    status: string;
    error: string | null;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
}

export interface Event {
    id: number;
    title: string;
    date_start: string | null;
    date_end: string | null;
    location: string;
    detailed_location: string;
    description: string;
    category: string;
    created_at: string;
    updated_at: string;
}
