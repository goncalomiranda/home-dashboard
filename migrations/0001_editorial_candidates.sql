BEGIN;

CREATE SCHEMA editorial;

CREATE TABLE editorial.candidates (
    id text PRIMARY KEY CHECK (btrim(id) <> ''),
    candidate_type text NOT NULL CHECK (btrim(candidate_type) <> ''),
    headline text,
    summary text,
    category text,
    status text NOT NULL DEFAULT 'DISCOVERED'
        CHECK (status IN ('DISCOVERED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED')),
    provenance jsonb,
    crawled_content_id integer REFERENCES public.crawled_content(id),
    start_date date,
    end_date date,
    venue text,
    location text,
    discovered_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    rejection_reason text,
    CHECK (provenance IS NULL OR jsonb_typeof(provenance) = 'object'),
    CHECK (status <> 'REJECTED' OR
        (rejection_reason IS NOT NULL AND btrim(rejection_reason) <> ''))
);

CREATE TABLE editorial.candidate_neighbourhoods (
    candidate_id text NOT NULL REFERENCES editorial.candidates(id) ON DELETE CASCADE,
    neighbourhood text NOT NULL
        CHECK (neighbourhood IN ('Clarkson', 'Lorne Park', 'Port Credit', 'Lakeview')),
    PRIMARY KEY (candidate_id, neighbourhood)
);

CREATE INDEX candidates_status_discovered_at_idx
    ON editorial.candidates (status, discovered_at, id);
CREATE INDEX candidate_neighbourhoods_neighbourhood_idx
    ON editorial.candidate_neighbourhoods (neighbourhood, candidate_id);

COMMIT;
