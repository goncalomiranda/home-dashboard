'use client';

import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import type { CrawledContent } from '@/types/newsletter';
import type { CandidateSnapshot, Neighbourhood } from '@/domain/editorial/candidate';

const neighbourhoodOptions: Neighbourhood[] = [
    'Clarkson',
    'Lorne Park',
    'Port Credit',
    'Lakeview',
];

interface ApiErrorBody {
    error?: string;
    invalidFields?: string[];
}

class CandidateRequestError extends Error {
    readonly invalidFields: readonly string[];

    constructor(message: string, invalidFields: readonly string[] = []) {
        super(message);
        this.name = 'CandidateRequestError';
        this.invalidFields = invalidFields;
    }
}

async function readResponse<T>(response: Response): Promise<T> {
    const body = await response.json() as T & ApiErrorBody;
    if (!response.ok) {
        throw new CandidateRequestError(
            body.error ?? 'The action could not be completed.',
            body.invalidFields ?? [],
        );
    }
    return body;
}

export default function CreateCandidateFromCrawled() {
    const [crawledContent, setCrawledContent] = useState<CrawledContent[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [success, setSuccess] = useState<CandidateSnapshot | null>(null);

    // Form fields
    const [headline, setHeadline] = useState('');
    const [summary, setSummary] = useState('');
    const [category, setCategory] = useState('');
    const [neighbourhoods, setNeighbourhoods] = useState<Neighbourhood[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [venue, setVenue] = useState('');
    const [location, setLocation] = useState('');

    // Load crawled content
    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/newsletter', { signal: controller.signal })
            .then((response) => readResponse<CrawledContent[]>(response))
            .then((content) => {
                setCrawledContent(content);
                if (content.length > 0) {
                    setSelectedId(content[0].id);
                }
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        cause instanceof Error
                            ? cause
                            : new Error('Failed to load crawled content.'),
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, []);

    // Pre-populate form when crawled content is selected
    const handleSelectContent = useCallback((id: number) => {
        setSelectedId(id);
        const content = crawledContent.find((c) => c.id === id);
        if (content) {
            setHeadline(content.title);
            setSummary(content.content.substring(0, 500));
        }
    }, [crawledContent]);

    const toggleNeighbourhood = useCallback((neighbourhood: Neighbourhood) => {
        setNeighbourhoods((current) =>
            current.includes(neighbourhood)
                ? current.filter((n) => n !== neighbourhood)
                : [...current, neighbourhood],
        );
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) {
            setError(new Error('Please select a crawled content record.'));
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(
                '/api/editorial/candidates/from-crawled',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        crawledContentId: selectedId,
                        headline,
                        summary,
                        category,
                        neighbourhoods,
                        startDate: startDate || undefined,
                        endDate: endDate || undefined,
                        venue: venue || undefined,
                        location: location || undefined,
                    }),
                },
            );

            const result = await readResponse<CandidateSnapshot>(response);
            setSuccess(result);

            // Reset form
            setHeadline('');
            setSummary('');
            setCategory('');
            setNeighbourhoods([]);
            setStartDate('');
            setEndDate('');
            setVenue('');
            setLocation('');
        } catch (cause: unknown) {
            setError(
                cause instanceof Error
                    ? cause
                    : new Error('Failed to create candidate.'),
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                <h1>Create Candidate from Crawled Content</h1>

                {error && (
                    <div
                        style={{
                            padding: '12px',
                            marginBottom: '20px',
                            backgroundColor: '#ffeaea',
                            color: '#d32f2f',
                            borderRadius: '4px',
                        }}
                    >
                        {error.message}
                        {error instanceof CandidateRequestError &&
                            error.invalidFields.length > 0 && (
                                <div style={{ fontSize: '0.9em', marginTop: '8px' }}>
                                    Invalid fields: {error.invalidFields.join(', ')}
                                </div>
                            )}
                    </div>
                )}

                {success && (
                    <div
                        style={{
                            padding: '12px',
                            marginBottom: '20px',
                            backgroundColor: '#e8f5e9',
                            color: '#2e7d32',
                            borderRadius: '4px',
                        }}
                    >
                        Candidate created successfully: {success.candidateId}
                    </div>
                )}

                {loading ? (
                    <div>Loading crawled content...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label>
                                <strong>Select Crawled Content *</strong>
                                <select
                                    value={selectedId || ''}
                                    onChange={(e) =>
                                        handleSelectContent(Number(e.target.value))
                                    }
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                    }}
                                    required
                                >
                                    <option value="">
                                        {crawledContent.length === 0
                                            ? 'No crawled content available'
                                            : 'Choose a crawled content record...'}
                                    </option>
                                    {crawledContent.map((content) => (
                                        <option key={content.id} value={content.id}>
                                            {content.title || content.url}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label>
                                <strong>Headline *</strong>
                                <input
                                    type="text"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                    }}
                                    required
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label>
                                <strong>Summary *</strong>
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={4}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                        fontFamily: 'monospace',
                                    }}
                                    required
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label>
                                <strong>Category *</strong>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g., Event, News, Announcement"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                    }}
                                    required
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <strong>Neighbourhoods *</strong>
                            <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {neighbourhoodOptions.map((neighbourhood) => (
                                    <label
                                        key={neighbourhood}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={neighbourhoods.includes(
                                                neighbourhood,
                                            )}
                                            onChange={() =>
                                                toggleNeighbourhood(neighbourhood)
                                            }
                                        />
                                        {neighbourhood}
                                    </label>
                                ))}
                            </div>
                            {neighbourhoods.length === 0 && (
                                <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '8px' }}>
                                    At least one neighbourhood is required
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <label>
                                <strong>Start Date</strong>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </label>
                            <label>
                                <strong>End Date</strong>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <label>
                                <strong>Venue</strong>
                                <input
                                    type="text"
                                    value={venue}
                                    onChange={(e) => setVenue(e.target.value)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </label>
                            <label>
                                <strong>Location</strong>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="submit"
                                disabled={
                                    submitting ||
                                    !selectedId ||
                                    !headline ||
                                    !summary ||
                                    !category ||
                                    neighbourhoods.length === 0
                                }
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#1976d2',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    opacity:
                                        submitting ||
                                        !selectedId ||
                                        !headline ||
                                        !summary ||
                                        !category ||
                                        neighbourhoods.length === 0
                                            ? 0.5
                                            : 1,
                                }}
                            >
                                {submitting ? 'Creating...' : 'Create Candidate'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setHeadline('');
                                    setSummary('');
                                    setCategory('');
                                    setNeighbourhoods([]);
                                    setStartDate('');
                                    setEndDate('');
                                    setVenue('');
                                    setLocation('');
                                    setError(null);
                                    setSuccess(null);
                                }}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#757575',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Clear Form
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Layout>
    );
}
