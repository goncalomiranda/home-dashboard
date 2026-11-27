'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import {
    type CandidateSnapshot,
    type CandidateStatus,
    type Neighbourhood,
} from '@/domain/editorial/candidate';

const neighbourhoodOptions: Neighbourhood[] = [
    'Clarkson',
    'Lorne Park',
    'Port Credit',
    'Lakeview',
];

const statusOptions: CandidateStatus[] = [
    'DISCOVERED',
    'NEEDS_REVIEW',
    'APPROVED',
    'REJECTED',
];

interface CandidateResponse {
    candidates: CandidateSnapshot[];
    categories: string[];
}

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
            body.error ?? 'The editorial action could not be completed.',
            body.invalidFields ?? [],
        );
    }
    return body;
}

function safeSourceUrl(value: string | undefined): string | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:'
            ? url.href
            : null;
    } catch {
        return null;
    }
}

export default function EditorialReviewQueue() {
    const [status, setStatus] = useState<CandidateStatus | ''>('NEEDS_REVIEW');
    const [category, setCategory] = useState('');
    const [neighbourhood, setNeighbourhood] = useState<Neighbourhood | ''>('');
    const [candidates, setCandidates] = useState<CandidateSnapshot[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedIdRef = useRef<string | null>(null);
    const [draft, setDraft] = useState<CandidateSnapshot | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<CandidateRequestError | Error | null>(null);
    const [notice, setNotice] = useState('');
    const [refreshVersion, setRefreshVersion] = useState(0);

    const query = useMemo(() => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (category) params.set('category', category);
        if (neighbourhood) params.set('neighbourhood', neighbourhood);
        return params.toString();
    }, [status, category, neighbourhood]);

    useEffect(() => {
        const controller = new AbortController();

        fetch(`/api/editorial/candidates${query ? `?${query}` : ''}`, {
            signal: controller.signal,
        })
            .then((response) => readResponse<CandidateResponse>(response))
            .then((result) => {
                setCandidates(result.candidates);
                setCategories(result.categories);
                const nextSelection =
                    result.candidates.find(
                        (candidate) => candidate.candidateId === selectedIdRef.current,
                    ) ?? result.candidates[0] ?? null;
                selectedIdRef.current = nextSelection?.candidateId ?? null;
                setSelectedId(selectedIdRef.current);
                setDraft(nextSelection);
                setRejectionReason('');
            })
            .catch((cause: unknown) => {
                if (controller.signal.aborted) return;
                setCandidates([]);
                setCategories([]);
                selectedIdRef.current = null;
                setSelectedId(null);
                setDraft(null);
                setError(
                    cause instanceof Error
                        ? cause
                        : new Error('Failed to load editorial candidates.'),
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [query, refreshVersion]);

    const refresh = useCallback(() => {
        setLoading(true);
        setError(null);
        setRefreshVersion((version) => version + 1);
    }, []);

    const updateDraft = useCallback(
        <K extends keyof CandidateSnapshot>(
            field: K,
            value: CandidateSnapshot[K],
        ) => {
            setDraft((current) =>
                current ? { ...current, [field]: value } : current,
            );
        },
        [],
    );

    const saveDetails = async (): Promise<void> => {
        if (!draft) return;
        const response = await fetch(
            `/api/editorial/candidates/${encodeURIComponent(draft.candidateId)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headline: draft.headline ?? '',
                    summary: draft.summary ?? '',
                    category: draft.category ?? '',
                    neighbourhoods: draft.neighbourhoods ?? [],
                    provenance: draft.provenance ?? { sourceUrl: '' },
                    startDate: draft.startDate ?? '',
                    endDate: draft.endDate ?? '',
                    venue: draft.venue ?? '',
                    location: draft.location ?? '',
                }),
            },
        );
        const updated = await readResponse<CandidateSnapshot>(response);
        setDraft(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setNotice('');
        try {
            await saveDetails();
            setNotice('Candidate details saved.');
            refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause
                    : new Error('Failed to save candidate details.'),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleTransition = async (
        action: 'submit' | 'approve' | 'reject',
    ) => {
        if (!draft) return;
        setSaving(true);
        setError(null);
        setNotice('');
        try {
            await saveDetails();
            const response = await fetch(
                `/api/editorial/candidates/${encodeURIComponent(draft.candidateId)}/${action === 'submit' ? 'submit' : action}`,
                {
                    method: 'POST',
                    headers: action === 'reject'
                        ? { 'Content-Type': 'application/json' }
                        : undefined,
                    body: action === 'reject'
                        ? JSON.stringify({ reason: rejectionReason })
                        : undefined,
                },
            );
            await readResponse<CandidateSnapshot>(response);
            setNotice(
                action === 'submit'
                    ? 'Candidate submitted for review.'
                    : action === 'approve'
                        ? 'Candidate approved.'
                        : 'Candidate rejected.',
            );
            refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause
                    : new Error('The editorial action could not be completed.'),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout title="Editorial review queue">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="mb-3">Filter candidates</h5>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label" htmlFor="candidate-status-filter">
                                        Status
                                    </label>
                                    <select
                                        className="form-select"
                                        id="candidate-status-filter"
                                        value={status}
                                        onChange={(event) => {
                                            setLoading(true);
                                            setError(null);
                                            setNotice('');
                                            setStatus(event.target.value as CandidateStatus | '')
                                        }}
                                    >
                                        <option value="">All statuses</option>
                                        {statusOptions.map((option) => (
                                            <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label" htmlFor="candidate-category-filter">
                                        Category
                                    </label>
                                    <select
                                        className="form-select"
                                        id="candidate-category-filter"
                                        value={category}
                                        onChange={(event) => {
                                            setLoading(true);
                                            setError(null);
                                            setNotice('');
                                            setCategory(event.target.value);
                                        }}
                                    >
                                        <option value="">All categories</option>
                                        {categories.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label" htmlFor="candidate-neighbourhood-filter">
                                        Neighbourhood
                                    </label>
                                    <select
                                        className="form-select"
                                        id="candidate-neighbourhood-filter"
                                        value={neighbourhood}
                                        onChange={(event) => {
                                            setLoading(true);
                                            setError(null);
                                            setNotice('');
                                            setNeighbourhood(event.target.value as Neighbourhood | '')
                                        }}
                                    >
                                        <option value="">All neighbourhoods</option>
                                        {neighbourhoodOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    <strong>{error.message}</strong>
                    {error instanceof CandidateRequestError && error.invalidFields.length > 0 && (
                        <p className="mb-0 mt-1">
                            Please correct: {error.invalidFields.join(', ')}.
                        </p>
                    )}
                </div>
            )}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}

            <div className="row g-4">
                <section className="col-xl-5" aria-labelledby="candidate-list-heading">
                    <div className="card h-100">
                        <div className="card-header pb-0">
                            <h5 id="candidate-list-heading">Candidates</h5>
                            <p className="text-sm text-secondary mb-0">
                                {candidates.length} matching {candidates.length === 1 ? 'candidate' : 'candidates'}
                            </p>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <p role="status">Loading candidates…</p>
                            ) : candidates.length === 0 ? (
                                <p className="text-secondary mb-0">
                                    No candidates match these filters.
                                </p>
                            ) : (
                                <div className="list-group">
                                    {candidates.map((candidate) => (
                                        <button
                                            className={`list-group-item list-group-item-action text-start ${candidate.candidateId === selectedId ? 'active' : ''}`}
                                            key={candidate.candidateId}
                                            type="button"
                                            onClick={() => {
                                                selectedIdRef.current = candidate.candidateId;
                                                setSelectedId(candidate.candidateId);
                                                setDraft(candidate);
                                                setRejectionReason('');
                                            }}
                                        >
                                            <span className="d-flex justify-content-between gap-2">
                                                <strong>{candidate.headline || 'Untitled candidate'}</strong>
                                                <span className="badge bg-secondary">
                                                    {candidate.status.replaceAll('_', ' ')}
                                                </span>
                                            </span>
                                            <span className="d-block small mt-1">
                                                {[candidate.category, candidate.neighbourhoods?.join(', ')]
                                                    .filter(Boolean)
                                                    .join(' · ') || 'Details needed'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="col-xl-7" aria-labelledby="candidate-review-heading">
                    <div className="card">
                        <div className="card-header pb-0">
                            <h5 id="candidate-review-heading">Review candidate</h5>
                        </div>
                        <div className="card-body">
                            {!draft ? (
                                <p className="text-secondary mb-0">
                                    Select a candidate to review its details.
                                </p>
                            ) : (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void handleSave();
                                    }}
                                >
                                    <p className="text-sm text-secondary">
                                        Type: <strong>{draft.candidateType}</strong>
                                        {' · '}Status: <strong>{draft.status.replaceAll('_', ' ')}</strong>
                                    </p>
                                    {safeSourceUrl(draft.provenance?.sourceUrl) ? (
                                        <p>
                                            <a
                                                href={safeSourceUrl(draft.provenance?.sourceUrl) ?? undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Open source page
                                            </a>
                                        </p>
                                    ) : (
                                        <p className="text-warning">No valid source page recorded.</p>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="candidate-headline">Headline</label>
                                        <input
                                            className="form-control"
                                            id="candidate-headline"
                                            value={draft.headline ?? ''}
                                            disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                            onChange={(event) => updateDraft('headline', event.target.value)}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="candidate-summary">Summary</label>
                                        <textarea
                                            className="form-control"
                                            id="candidate-summary"
                                            rows={4}
                                            value={draft.summary ?? ''}
                                            disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                            onChange={(event) => updateDraft('summary', event.target.value)}
                                        />
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label" htmlFor="candidate-category">Category</label>
                                            <input
                                                className="form-control"
                                                id="candidate-category"
                                                value={draft.category ?? ''}
                                                disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                                onChange={(event) => updateDraft('category', event.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label" htmlFor="candidate-source-url">Source URL</label>
                                            <input
                                                className="form-control"
                                                id="candidate-source-url"
                                                type="url"
                                                value={draft.provenance?.sourceUrl ?? ''}
                                                disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                                onChange={(event) =>
                                                    setDraft((current) =>
                                                        current
                                                            ? {
                                                                ...current,
                                                                provenance: {
                                                                    ...current.provenance,
                                                                    sourceUrl: event.target.value,
                                                                },
                                                            }
                                                            : current,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    <fieldset className="mb-3">
                                        <legend className="form-label">Neighbourhoods</legend>
                                        <div className="d-flex flex-wrap gap-3">
                                            {neighbourhoodOptions.map((option) => (
                                                <label className="form-check-label" key={option}>
                                                    <input
                                                        className="form-check-input me-2"
                                                        type="checkbox"
                                                        checked={draft.neighbourhoods?.includes(option) ?? false}
                                                        disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                                        onChange={(event) => {
                                                            const current = draft.neighbourhoods ?? [];
                                                            const next = event.target.checked
                                                                ? [...current, option]
                                                                : current.filter((value) => value !== option);
                                                            updateDraft('neighbourhoods', next);
                                                        }}
                                                    />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {draft.candidateType === 'event' && (
                                        <>
                                            <div className="row">
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label" htmlFor="candidate-start-date">Start date</label>
                                                    <input
                                                        className="form-control"
                                                        id="candidate-start-date"
                                                        type="date"
                                                        value={draft.startDate ?? ''}
                                                        disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                                        onChange={(event) => updateDraft('startDate', event.target.value)}
                                                    />
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label" htmlFor="candidate-end-date">End date</label>
                                                    <input
                                                        className="form-control"
                                                        id="candidate-end-date"
                                                        type="date"
                                                        value={draft.endDate ?? ''}
                                                        disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                                        onChange={(event) => updateDraft('endDate', event.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label" htmlFor="candidate-venue">Venue</label>
                                                    <input
                                                        className="form-control"
                                                        id="candidate-venue"
                                                        value={draft.venue ?? ''}
                                                        disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                                        onChange={(event) => updateDraft('venue', event.target.value)}
                                                    />
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label" htmlFor="candidate-location">Location</label>
                                                    <input
                                                        className="form-control"
                                                        id="candidate-location"
                                                        value={draft.location ?? ''}
                                                        disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || saving}
                                                        onChange={(event) => updateDraft('location', event.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {draft.status === 'REJECTED' && draft.rejectionReason && (
                                        <p className="text-danger">
                                            Rejection reason: {draft.rejectionReason}
                                        </p>
                                    )}

                                    <div className="d-flex flex-wrap gap-2">
                                        {draft.status !== 'APPROVED' && draft.status !== 'REJECTED' && (
                                            <button className="btn btn-outline-dark" type="submit" disabled={saving}>
                                                {saving ? 'Saving…' : 'Save corrections'}
                                            </button>
                                        )}
                                        {draft.status === 'DISCOVERED' && (
                                            <button
                                                className="btn btn-primary"
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void handleTransition('submit')}
                                            >
                                                Submit for review
                                            </button>
                                        )}
                                        {draft.status === 'NEEDS_REVIEW' && (
                                            <>
                                                <button
                                                    className="btn btn-success"
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => void handleTransition('approve')}
                                                >
                                                    Approve
                                                </button>
                                                <div className="input-group">
                                                    <input
                                                        className="form-control"
                                                        aria-label="Rejection reason"
                                                        placeholder="Reason for rejection"
                                                        value={rejectionReason}
                                                        disabled={saving}
                                                        onChange={(event) => setRejectionReason(event.target.value)}
                                                    />
                                                    <button
                                                        className="btn btn-outline-danger"
                                                        type="button"
                                                        disabled={saving || !rejectionReason.trim()}
                                                        onClick={() => void handleTransition('reject')}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
