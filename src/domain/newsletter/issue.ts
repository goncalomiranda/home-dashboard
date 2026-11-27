import type { Candidate } from '../editorial/candidate';

export type NewsletterIssueStatus =
    | 'DRAFT'
    | 'READY'
    | 'PUBLISHING'
    | 'PUBLISHED'
    | 'FAILED'
    | 'CANCELLED';

export interface NewsletterIssueCreation {
    readonly issueId: string;
    readonly title: string;
    readonly publicationDate: string;
    readonly windowStart: string;
    readonly windowEnd: string;
}

export interface NewsletterIssueItem {
    readonly issueItemId: string;
    readonly candidateId: string;
    readonly headline: string;
    readonly summary: string;
    readonly section: string;
    readonly position: number;
}

export interface NewsletterIssueSection {
    readonly name: string;
    readonly items: readonly NewsletterIssueItem[];
}

export interface NewsletterPublicationReference {
    readonly beehiivUrl: string;
    readonly beehiivExternalId?: string;
    readonly publishedAt: string;
}

export interface NewsletterIssueSnapshot extends NewsletterIssueCreation {
    readonly status: NewsletterIssueStatus;
    readonly sections: readonly NewsletterIssueSection[];
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly publication?: NewsletterPublicationReference;
}

export class NewsletterIssueError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NewsletterIssueError';
    }
}

export class NewsletterIssueInvariantError extends NewsletterIssueError {
    constructor(message: string) {
        super(message);
        this.name = 'NewsletterIssueInvariantError';
    }
}

export class NewsletterIssueTransitionError extends NewsletterIssueError {
    constructor(message: string) {
        super(message);
        this.name = 'NewsletterIssueTransitionError';
    }
}

function isNonEmpty(value: string): boolean {
    return value.trim().length > 0;
}

function isDateOnly(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function toIsoString(at: Date): string {
    if (Number.isNaN(at.getTime())) {
        throw new NewsletterIssueInvariantError('Timestamp must be a valid date.');
    }
    return at.toISOString();
}

function freezeSnapshot(
    snapshot: NewsletterIssueSnapshot,
): NewsletterIssueSnapshot {
    return Object.freeze({
        ...snapshot,
        sections: Object.freeze(snapshot.sections.map((section) =>
            Object.freeze({
                name: section.name,
                items: Object.freeze(section.items.map((item) =>
                    Object.freeze({ ...item }),
                )),
            }),
        )),
        publication: snapshot.publication
            ? Object.freeze({ ...snapshot.publication })
            : undefined,
    });
}

function itemCount(sections: readonly NewsletterIssueSection[]): number {
    return sections.reduce((total, section) => total + section.items.length, 0);
}

export class NewsletterIssue {
    readonly state: NewsletterIssueSnapshot;

    private constructor(state: NewsletterIssueSnapshot) {
        this.state = state;
    }

    static create(
        creation: NewsletterIssueCreation,
        createdAt: Date = new Date(),
    ): NewsletterIssue {
        if (!isNonEmpty(creation.issueId)) {
            throw new NewsletterIssueInvariantError('Issue ID is required.');
        }
        if (!isNonEmpty(creation.title)) {
            throw new NewsletterIssueInvariantError('Issue title is required.');
        }
        for (const [field, value] of [
            ['publicationDate', creation.publicationDate],
            ['windowStart', creation.windowStart],
            ['windowEnd', creation.windowEnd],
        ] as const) {
            if (!isDateOnly(value)) {
                throw new NewsletterIssueInvariantError(
                    `${field} must be a valid ISO date.`,
                );
            }
        }
        if (creation.windowStart > creation.windowEnd) {
            throw new NewsletterIssueInvariantError(
                'Publication window start must not be after its end.',
            );
        }

        const timestamp = toIsoString(createdAt);
        return new NewsletterIssue(freezeSnapshot({
            ...creation,
            status: 'DRAFT',
            sections: [],
            createdAt: timestamp,
            updatedAt: timestamp,
        }));
    }

    addCandidate(candidate: Candidate, section: string): NewsletterIssue {
        this.assertDraft('add candidates');

        const candidateState = candidate.state;
        if (candidateState.status !== 'APPROVED') {
            throw new NewsletterIssueInvariantError(
                'Only approved candidates can be added to an issue.',
            );
        }
        if (!isNonEmpty(section)) {
            throw new NewsletterIssueInvariantError(
                'Issue item section is required.',
            );
        }
        if (this.findItemByCandidateId(candidateState.candidateId)) {
            throw new NewsletterIssueInvariantError(
                'A candidate cannot appear more than once in an issue.',
            );
        }
        const headline = candidateState.headline;
        const summary = candidateState.summary;
        if (!headline || !isNonEmpty(headline)) {
            throw new NewsletterIssueInvariantError(
                'An approved candidate must have a headline.',
            );
        }
        if (!summary || !isNonEmpty(summary)) {
            throw new NewsletterIssueInvariantError(
                'An approved candidate must have a summary.',
            );
        }

        const normalizedSection = section.trim();
        const existingSection = this.state.sections.find(
            (value) => value.name === normalizedSection,
        );
        const newItem: NewsletterIssueItem = {
            issueItemId: globalThis.crypto.randomUUID(),
            candidateId: candidateState.candidateId,
            headline,
            summary,
            section: normalizedSection,
            position: (existingSection?.items.length ?? 0) + 1,
        };
        const sections = existingSection
            ? this.state.sections.map((value) =>
                value.name === normalizedSection
                    ? { ...value, items: [...value.items, newItem] }
                    : value,
            )
            : [
                ...this.state.sections,
                { name: normalizedSection, items: [newItem] },
            ];

        return this.withState({ sections });
    }

    removeItem(issueItemId: string): NewsletterIssue {
        this.assertDraft('remove items');
        const section = this.findSectionForItem(issueItemId);
        const items = section.items
            .filter((item) => item.issueItemId !== issueItemId)
            .map((item, index) => ({ ...item, position: index + 1 }));
        const sections = items.length === 0
            ? this.state.sections.filter((value) => value.name !== section.name)
            : this.state.sections.map((value) =>
                value.name === section.name ? { ...value, items } : value,
            );

        return this.withState({ sections });
    }

    moveItem(issueItemId: string, newPosition: number): NewsletterIssue {
        this.assertDraft('reorder items');
        const section = this.findSectionForItem(issueItemId);
        if (
            !Number.isInteger(newPosition) ||
            newPosition < 1 ||
            newPosition > section.items.length
        ) {
            throw new NewsletterIssueInvariantError(
                `Item position must be between 1 and ${section.items.length}.`,
            );
        }

        const items = [...section.items];
        const currentIndex = items.findIndex(
            (item) => item.issueItemId === issueItemId,
        );
        const [item] = items.splice(currentIndex, 1);
        items.splice(newPosition - 1, 0, item);
        const reorderedItems = items.map((value, index) => ({
            ...value,
            position: index + 1,
        }));
        const sections = this.state.sections.map((value) =>
            value.name === section.name
                ? { ...value, items: reorderedItems }
                : value,
        );

        return this.withState({ sections });
    }

    editItem(
        issueItemId: string,
        headline: string,
        summary: string,
    ): NewsletterIssue {
        this.assertDraft('edit items');
        if (!isNonEmpty(headline) || !isNonEmpty(summary)) {
            throw new NewsletterIssueInvariantError(
                'Issue item headline and summary are required.',
            );
        }
        const section = this.findSectionForItem(issueItemId);
        const sections = this.state.sections.map((value) =>
            value.name === section.name
                ? {
                    ...value,
                    items: value.items.map((item) =>
                        item.issueItemId === issueItemId
                            ? { ...item, headline, summary }
                            : item,
                    ),
                }
                : value,
        );

        return this.withState({ sections });
    }

    markReady(at: Date = new Date()): NewsletterIssue {
        this.assertStatus('DRAFT', 'mark ready');
        if (itemCount(this.state.sections) === 0) {
            throw new NewsletterIssueInvariantError(
                'An issue must contain at least one item before it can be ready.',
            );
        }
        return this.withState({ status: 'READY' }, at);
    }

    returnToDraft(at: Date = new Date()): NewsletterIssue {
        this.assertStatus('READY', 'return to draft');
        return this.withState({ status: 'DRAFT' }, at);
    }

    markPublishing(at: Date = new Date()): NewsletterIssue {
        this.assertStatus('READY', 'begin publishing');
        return this.withState({ status: 'PUBLISHING' }, at);
    }

    markFailed(at: Date = new Date()): NewsletterIssue {
        this.assertStatus('PUBLISHING', 'mark failed');
        return this.withState({ status: 'FAILED' }, at);
    }

    markPublished(
        publication: Omit<NewsletterPublicationReference, 'publishedAt'>,
        at: Date = new Date(),
    ): NewsletterIssue {
        this.assertStatus('PUBLISHING', 'mark published');
        if (!/^https?:\/\//i.test(publication.beehiivUrl)) {
            throw new NewsletterIssueInvariantError(
                'Publication URL must use HTTP or HTTPS.',
            );
        }
        if (
            publication.beehiivExternalId !== undefined &&
            !isNonEmpty(publication.beehiivExternalId)
        ) {
            throw new NewsletterIssueInvariantError(
                'Publication external ID cannot be empty.',
            );
        }

        return this.withState({
            status: 'PUBLISHED',
            publication: {
                ...publication,
                publishedAt: toIsoString(at),
            },
        }, at);
    }

    cancel(at: Date = new Date()): NewsletterIssue {
        this.assertStatus('DRAFT', 'cancel');
        return this.withState({ status: 'CANCELLED' }, at);
    }

    private assertDraft(action: string): void {
        this.assertStatus('DRAFT', action);
    }

    private assertStatus(
        expected: NewsletterIssueStatus,
        action: string,
    ): void {
        if (this.state.status !== expected) {
            throw new NewsletterIssueTransitionError(
                `Cannot ${action} while an issue is ${this.state.status}.`,
            );
        }
    }

    private findItemByCandidateId(candidateId: string): NewsletterIssueItem | undefined {
        return this.state.sections
            .flatMap((section) => section.items)
            .find((item) => item.candidateId === candidateId);
    }

    private findSectionForItem(issueItemId: string): NewsletterIssueSection {
        const section = this.state.sections.find((value) =>
            value.items.some((item) => item.issueItemId === issueItemId),
        );
        if (!section) {
            throw new NewsletterIssueInvariantError(
                `Issue item not found: ${issueItemId}`,
            );
        }
        return section;
    }

    private withState(
        changes: Partial<NewsletterIssueSnapshot>,
        updatedAt: Date = new Date(),
    ): NewsletterIssue {
        return new NewsletterIssue(freezeSnapshot({
            ...this.state,
            ...changes,
            updatedAt: toIsoString(updatedAt),
        }));
    }
}
