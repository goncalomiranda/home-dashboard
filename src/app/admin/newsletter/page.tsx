'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import type { CrawledContent, CrawlJob, Event } from '@/types/newsletter';
import ReactMarkdown from 'react-markdown';

const emptyEvent = {
  title: '',
  date_start: '',
  date_end: '',
  location: '',
  detailed_location: '',
  description: '',
  category: '',
};

function toEST(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', { timeZone: 'America/New_York' });
}

export default function Newsletter() {
  const [crawledContent, setCrawledContent] = useState<CrawledContent[]>([]);
  const [crawlJobs, setCrawlJobs] = useState<CrawlJob[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<CrawledContent | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: number; type: 'content' | 'job' | 'event' } | null>(null);
  const [aiSummary, setAiSummary] = useState<{ text: string; loading: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Events state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventModal, setEventModal] = useState<{ mode: 'create' | 'edit'; data: typeof emptyEvent; id?: number } | null>(null);
  const [eventSaving, setEventSaving] = useState(false);

  const fetchEvents = useCallback(async (fromOverride?: string, toOverride?: string) => {
    try {
      const params = new URLSearchParams();
      const from = fromOverride !== undefined ? fromOverride : dateFrom;
      const to = toOverride !== undefined ? toOverride : dateTo;
      if (from) params.set('date_from', from);
      if (to) params.set('date_to', to);
      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contentResponse, jobsResponse] = await Promise.all([
        fetch('/api/newsletter'),
        fetch('/api/crawl-jobs'),
      ]);

      if (!contentResponse.ok || !jobsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const contentData = await contentResponse.json();
      const jobsData = await jobsResponse.json();

      setCrawledContent(contentData);
      setCrawlJobs(jobsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
    await fetchEvents();
  };

  const handleViewContent = (item: CrawledContent) => {
    setSelectedContent(item);
  };

  const handleCloseModal = () => {
    setSelectedContent(null);
  };

  const handleDeleteClick = (id: number, type: 'content' | 'job' | 'event') => {
    setDeleteItem({ id, type });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;

    setActionLoading(true);
    setError(null);

    try {
      let url: string;
      if (deleteItem.type === 'content') {
        url = `/api/newsletter/${deleteItem.id}`;
      } else if (deleteItem.type === 'job') {
        url = `/api/crawl-jobs/${deleteItem.id}`;
      } else {
        url = `/api/events/${deleteItem.id}`;
      }

      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to delete item');

      setDeleteItem(null);
      if (deleteItem.type === 'event') {
        await fetchEvents();
      } else {
        await fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteItem(null);
  };

  const handleAiSummary = async (id: number, type: 'content' | 'job') => {
    setAiSummary({ text: '', loading: true });
    setError(null);

    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      setAiSummary({ text: data.summary, loading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAiSummary(null);
    }
  };

  const handleCloseSummary = () => {
    setAiSummary(null);
  };

  const handleCreateEvent = () => {
    setEventModal({ mode: 'create', data: { ...emptyEvent } });
  };

  const handleEditEvent = (event: Event) => {
    setEventModal({
      mode: 'edit',
      id: event.id,
      data: {
        title: event.title,
        date_start: event.date_start ? event.date_start.slice(0, 16) : '',
        date_end: event.date_end ? event.date_end.slice(0, 16) : '',
        location: event.location,
        detailed_location: event.detailed_location,
        description: event.description,
        category: event.category,
      },
    });
  };

  const handleEventModalChange = (field: string, value: string) => {
    if (!eventModal) return;
    setEventModal({ ...eventModal, data: { ...eventModal.data, [field]: value } });
  };

  const handleEventSave = async () => {
    if (!eventModal) return;
    setEventSaving(true);
    setError(null);

    try {
      const url = eventModal.mode === 'create' ? '/api/events' : `/api/events/${eventModal.id}`;
      const method = eventModal.mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventModal.data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save event');
      }

      setEventModal(null);
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setEventSaving(false);
    }
  };

  const handleFilterEvents = () => {
    fetchEvents();
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const handleFilterNextWeekend = () => {
    const today = new Date();
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    saturday.setHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const newFrom = fmt(saturday);
    const newTo = fmt(sunday);
    setDateFrom(newFrom);
    setDateTo(newTo);
    fetchEvents(newFrom, newTo);
  };

  // Re-fetch events when filters are cleared
  useEffect(() => {
    if (!dateFrom && !dateTo && !loading) {
      fetchEvents();
    }
  }, [dateFrom, dateTo, loading, fetchEvents]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-gradient-success';
      case 'running':
      case 'in_progress':
        return 'bg-gradient-info';
      case 'failed':
      case 'error':
        return 'bg-gradient-danger';
      default:
        return 'bg-gradient-secondary';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Simple markdown-like rendering (basic formatting)
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={i} className="mb-3">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="mb-2">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="mb-2">{line.substring(4)}</h3>;
        }
        // Bold
        const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        const italicText = boldText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Links
        const linkText = italicText.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary">$1</a>');
        
        return line ? <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: linkText }} /> : <br key={i} />;
      });
  };

  return (
    <Layout title="Crawled Content & Jobs">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <span className="alert-text text-white">{error}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="row mb-4">
        {/* Crawled Content Table */}
        <div className="col-12">
          <div className="card">
            <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
              <div className="bg-gradient-dark shadow-dark border-radius-lg pt-4 pb-3">
                <h6 className="text-white text-capitalize ps-3">Crawled Content</h6>
              </div>
            </div>
            <div className="card-body px-0 pb-2">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-dark" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : crawledContent.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-secondary mb-0">No crawled content found.</p>
                </div>
              ) : (
                <div className="table-responsive p-0">
                  <table className="table align-items-center mb-0">
                    <thead>
                      <tr>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                          Title
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                          URL
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                          Content Preview
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">
                          Created
                        </th>
                        <th className="text-secondary opacity-7">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crawledContent.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="d-flex px-2 py-1">
                              <div className="d-flex flex-column justify-content-center">
                                <h6 className="mb-0 text-sm">{item.title}</h6>
                              </div>
                            </div>
                          </td>
                          <td>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary mb-0"
                            >
                              {item.url.length > 40 ? `${item.url.substring(0, 40)}...` : item.url}
                            </a>
                          </td>
                          <td>
                            <p className="text-xs font-weight-bold mb-0">
                              {item.content.length > 80
                                ? `${item.content.substring(0, 80)}...`
                                : item.content}
                            </p>
                          </td>
                          <td>
                            <span className="text-secondary text-xs font-weight-bold">
                              {formatDate(item.created_at)}
                            </span>
                          </td>
                          <td className="align-middle">
                            <button
                              onClick={() => handleViewContent(item)}
                              className="btn btn-link text-primary font-weight-bold text-xs mb-0 me-1"
                              title="See full content"
                            >
                              <i className="material-symbols-rounded text-sm">visibility</i>
                            </button>
                            <button
                              onClick={() => handleAiSummary(item.id, 'content')}
                              className="btn btn-link text-info font-weight-bold text-xs mb-0 me-1"
                              title="AI Summary"
                            >
                              <i className="material-symbols-rounded text-sm">auto_awesome</i>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id, 'content')}
                              className="btn btn-link text-danger font-weight-bold text-xs mb-0"
                              title="Delete"
                              disabled={actionLoading}
                            >
                              <i className="material-symbols-rounded text-sm">delete</i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Crawl Jobs Table */}
        <div className="col-12">
          <div className="card">
            <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
              <div className="bg-gradient-dark shadow-dark border-radius-lg pt-4 pb-3">
                <h6 className="text-white text-capitalize ps-3">Crawl Jobs</h6>
              </div>
            </div>
            <div className="card-body px-0 pb-2">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-dark" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : crawlJobs.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-secondary mb-0">No crawl jobs found.</p>
                </div>
              ) : (
                <div className="table-responsive p-0">
                  <table className="table align-items-center mb-0">
                    <thead>
                      <tr>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                          ID
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                          Status
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                          Error
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">
                          Created
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">
                          Started
                        </th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">
                          Finished
                        </th>
                        <th className="text-secondary opacity-7">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crawlJobs.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <div className="d-flex px-2 py-1">
                              <span className="text-xs font-weight-bold">{job.id}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-sm ${getStatusBadgeClass(job.status)}`}>
                              {job.status}
                            </span>
                          </td>
                          <td>
                            <p className="text-xs text-secondary mb-0">
                              {job.error ? (job.error.length > 50 ? `${job.error.substring(0, 50)}...` : job.error) : 'None'}
                            </p>
                          </td>
                          <td>
                            <span className="text-secondary text-xs font-weight-bold">
                              {formatDate(job.created_at)}
                            </span>
                          </td>
                          <td>
                            <span className="text-secondary text-xs font-weight-bold">
                              {formatDate(job.started_at)}
                            </span>
                          </td>
                          <td>
                            <span className="text-secondary text-xs font-weight-bold">
                              {formatDate(job.finished_at)}
                            </span>
                          </td>
                          <td className="align-middle">
                            <button
                              onClick={() => handleAiSummary(job.id, 'job')}
                              className="btn btn-link text-info font-weight-bold text-xs mb-0 me-1"
                              title="AI Summary"
                            >
                              <i className="material-symbols-rounded text-sm">auto_awesome</i>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(job.id, 'job')}
                              className="btn btn-link text-danger font-weight-bold text-xs mb-0"
                              title="Delete"
                              disabled={actionLoading}
                            >
                              <i className="material-symbols-rounded text-sm">delete</i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
              <div className="bg-gradient-dark shadow-dark border-radius-lg pt-4 pb-3 d-flex justify-content-between align-items-center px-3">
                <h6 className="text-white text-capitalize mb-0 ps-0">Events</h6>
                <button className="btn btn-sm btn-white mb-0" onClick={handleCreateEvent}>
                  <i className="material-symbols-rounded text-sm me-1">add</i> New Event
                </button>
              </div>
            </div>
            <div className="card-body px-0 pb-2">
              {/* Date range filter */}
              <div className="d-flex align-items-end gap-3 px-3 pb-3">
                <div>
                  <label className="form-label text-xs text-uppercase text-secondary font-weight-bolder mb-1">From</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label text-xs text-uppercase text-secondary font-weight-bolder mb-1">To</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <button className="btn btn-sm btn-dark mb-0" onClick={handleFilterEvents}>
                  <i className="material-symbols-rounded text-sm me-1">filter_list</i> Filter
                </button>
                <button className="btn btn-sm btn-info mb-0" onClick={handleFilterNextWeekend}>
                  <i className="material-symbols-rounded text-sm me-1">weekend</i> Next Weekend
                </button>
                {(dateFrom || dateTo) && (
                  <button className="btn btn-sm btn-outline-secondary mb-0" onClick={handleClearFilter}>
                    Clear
                  </button>
                )}
              </div>

              {events.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-secondary mb-0">No events found.</p>
                </div>
              ) : (
                <div className="table-responsive p-0">
                  <table className="table align-items-center mb-0">
                    <thead>
                      <tr>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Title</th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Category</th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Date Start</th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Date End</th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Location</th>
                        <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Description</th>
                        <th className="text-secondary opacity-7">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td>
                            <div className="d-flex px-2 py-1">
                              <h6 className="mb-0 text-sm">{event.title}</h6>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-sm bg-gradient-info">{event.category || 'N/A'}</span>
                          </td>
                          <td>
                            <span className="text-secondary text-xs font-weight-bold">{toEST(event.date_start)}</span>
                          </td>
                          <td>
                            <span className="text-secondary text-xs font-weight-bold">{toEST(event.date_end)}</span>
                          </td>
                          <td>
                            <span className="text-xs">{event.location}{event.detailed_location ? ` (${event.detailed_location})` : ''}</span>
                          </td>
                          <td>
                            <p className="text-xs font-weight-bold mb-0">
                              {event.description.length > 60 ? `${event.description.substring(0, 60)}...` : event.description}
                            </p>
                          </td>
                          <td className="align-middle">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="btn btn-link text-warning font-weight-bold text-xs mb-0 me-1"
                              title="Edit"
                            >
                              <i className="material-symbols-rounded text-sm">edit</i>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(event.id, 'event')}
                              className="btn btn-link text-danger font-weight-bold text-xs mb-0"
                              title="Delete"
                              disabled={actionLoading}
                            >
                              <i className="material-symbols-rounded text-sm">delete</i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Modal */}
      {selectedContent && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{selectedContent.title}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <strong>URL:</strong>{' '}
                    <a
                      href={selectedContent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary"
                    >
                      {selectedContent.url}
                    </a>
                  </div>
                  <div className="mb-3">
                    <strong>Created:</strong> {formatDate(selectedContent.created_at)}
                  </div>
                  <hr />
                  <div className="markdown-content prose">
                    <ReactMarkdown>{selectedContent.content}</ReactMarkdown>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleDeleteCancel}
                    disabled={actionLoading}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to delete this {deleteItem.type === 'content' ? 'content item' : deleteItem.type === 'job' ? 'crawl job' : 'event'}?
                    This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDeleteCancel}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteConfirm}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* AI Summary Modal */}
      {aiSummary && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="material-symbols-rounded me-2">auto_awesome</i>
                    AI Summary
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseSummary}
                    disabled={aiSummary.loading}
                  ></button>
                </div>
                <div className="modal-body">
                  {aiSummary.loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Generating summary...</span>
                      </div>
                      <p className="mt-3 text-secondary">Generating AI summary...</p>
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <ReactMarkdown>{aiSummary.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseSummary}
                    disabled={aiSummary.loading}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Event Create/Edit Modal */}
      {eventModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="material-symbols-rounded me-2">{eventModal.mode === 'create' ? 'add_circle' : 'edit'}</i>
                    {eventModal.mode === 'create' ? 'Create Event' : 'Edit Event'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setEventModal(null)} disabled={eventSaving}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-8 mb-3">
                      <label className="form-label">Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventModal.data.title}
                        onChange={(e) => handleEventModalChange('title', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Category</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventModal.data.category}
                        onChange={(e) => handleEventModalChange('category', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Date Start</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={eventModal.data.date_start}
                        onChange={(e) => handleEventModalChange('date_start', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Date End</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={eventModal.data.date_end}
                        onChange={(e) => handleEventModalChange('date_end', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventModal.data.location}
                        onChange={(e) => handleEventModalChange('location', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Detailed Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventModal.data.detailed_location}
                        onChange={(e) => handleEventModalChange('detailed_location', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={eventModal.data.description}
                      onChange={(e) => handleEventModalChange('description', e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEventModal(null)} disabled={eventSaving}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleEventSave}
                    disabled={eventSaving || !eventModal.data.title.trim()}
                  >
                    {eventSaving ? 'Saving...' : eventModal.mode === 'create' ? 'Create' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </Layout>
  );
}
