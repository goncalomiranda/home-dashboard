BEGIN;

CREATE SCHEMA newsletter;

ALTER TABLE editorial.candidates
    ADD CONSTRAINT candidates_id_status_key UNIQUE (id, status);

CREATE TABLE newsletter.issues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL CHECK (btrim(title) <> ''),
    publication_date date NOT NULL,
    window_start date NOT NULL,
    window_end date NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT',
            'READY',
            'PUBLISHING',
            'PUBLISHED',
            'FAILED',
            'CANCELLED'
        )),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (window_start <= window_end)
);

CREATE TABLE newsletter.issue_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id uuid NOT NULL REFERENCES newsletter.issues(id) ON DELETE CASCADE,
    candidate_id text NOT NULL,
    candidate_status text NOT NULL DEFAULT 'APPROVED'
        CHECK (candidate_status = 'APPROVED'),
    headline_snapshot text NOT NULL CHECK (btrim(headline_snapshot) <> ''),
    summary_snapshot text NOT NULL CHECK (btrim(summary_snapshot) <> ''),
    section text NOT NULL CHECK (btrim(section) <> ''),
    position integer NOT NULL CHECK (position > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (candidate_id, candidate_status)
        REFERENCES editorial.candidates(id, status),
    UNIQUE (issue_id, candidate_id),
    UNIQUE (issue_id, section, position)
);

CREATE TABLE newsletter.publications (
    issue_id uuid PRIMARY KEY REFERENCES newsletter.issues(id) ON DELETE CASCADE,
    beehiiv_url text NOT NULL
        CHECK (beehiiv_url ~* '^https?://'),
    beehiiv_external_id text UNIQUE
        CHECK (beehiiv_external_id IS NULL OR btrim(beehiiv_external_id) <> ''),
    published_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
