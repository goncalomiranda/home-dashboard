import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:3100/api/v1/knowledge/query-slm';
const LLM_API_KEY = process.env.LLM_API_KEY || '';

const EVENT_PROMPT = 'Give me all the events you can find in this format: {"title": "", "date_start": "", "date_end": "", "location": "", "detailed_location": "", "description": "", "category": ""}';

interface ExtractedEvent {
    title: string;
    date_start: string;
    date_end: string;
    location: string;
    detailed_location: string;
    description: string;
    category: string;
}

// POST /api/ai-summary - Extract events from content via LLM
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, type } = body;

        if (!id || !type) {
            return NextResponse.json(
                { error: 'ID and type are required' },
                { status: 400 }
            );
        }

        let content = '';

        if (type === 'content') {
            const result = await query(
                'SELECT title, "content", url FROM public.crawled_content WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return NextResponse.json({ error: 'Content not found' }, { status: 404 });
            }
            const item = result.rows[0];
            content = `Title: ${item.title}\nURL: ${item.url}\n\nContent:\n${item.content}`;
        } else if (type === 'job') {
            const result = await query(
                'SELECT id, status, error, created_at, started_at, finished_at FROM core.crawl_jobs WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return NextResponse.json({ error: 'Job not found' }, { status: 404 });
            }
            const job = result.rows[0];
            content = `Job ID: ${job.id}\nStatus: ${job.status}\nError: ${job.error || 'None'}\nCreated: ${job.created_at}\nStarted: ${job.started_at || 'N/A'}\nFinished: ${job.finished_at || 'N/A'}`;
        }

        // Call local LLM API
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout

        const requestBody = {
            text: content,
            prompt: EVENT_PROMPT,
        };

        console.log('[AI Summary] Sending to LLM API:', LLM_API_URL);
        console.log('[AI Summary] Request prompt:', EVENT_PROMPT);
        console.log('[AI Summary] Request text (first 500 chars):', content.substring(0, 500));

        const llmResponse = await fetch(LLM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': LLM_API_KEY,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!llmResponse.ok) {
            const errText = await llmResponse.text();
            console.error('[AI Summary] LLM API error:', llmResponse.status, errText);
            return NextResponse.json({ error: 'LLM API request failed' }, { status: 502 });
        }

        const rawResponseText = await llmResponse.text();
        console.log('[AI Summary] Raw LLM response:', rawResponseText);

        let llmData;
        try {
            llmData = JSON.parse(rawResponseText);
        } catch {
            console.error('[AI Summary] Failed to parse LLM response as JSON');
            llmData = { response: rawResponseText };
        }

        // Handle nested response shapes: { data: { response } }, { response }, { text }, { answer }
        const responseText: string =
            llmData?.data?.response ||
            llmData?.response ||
            llmData?.data?.text ||
            llmData?.text ||
            llmData?.answer ||
            JSON.stringify(llmData);

        console.log('[AI Summary] llmData keys:', Object.keys(llmData));
        console.log('[AI Summary] Resolved responseText (first 1000 chars):', responseText.substring(0, 1000));

        // Parse events from LLM response
        const events = parseEvents(responseText);
        console.log('[AI Summary] Parsed events count:', events.length);
        console.log('[AI Summary] Parsed events:', JSON.stringify(events, null, 2));
        let savedCount = 0;

        for (const event of events) {
            try {
                await query(
                    `INSERT INTO core.event (title, date_start, date_end, location, detailed_location, description, category)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        event.title || '',
                        event.date_start || null,
                        event.date_end || null,
                        event.location || '',
                        event.detailed_location || '',
                        event.description || '',
                        event.category || '',
                    ]
                );
                savedCount++;
                console.log('[AI Summary] Saved event:', event.title);
            } catch (err) {
                console.error('[AI Summary] Failed to insert event:', err, event);
            }
        }

        const summary = `Extracted ${events.length} event(s) from the content. ${savedCount} saved to database.\n\n` +
            events.map((e, i) => `**${i + 1}. ${e.title}**\n- Date: ${e.date_start || 'N/A'}${e.date_end ? ' to ' + e.date_end : ''}\n- Location: ${e.location || 'N/A'}${e.detailed_location ? ' (' + e.detailed_location + ')' : ''}\n- Category: ${e.category || 'N/A'}\n- ${e.description || ''}`).join('\n\n');

        return NextResponse.json({ summary, events, savedCount });
    } catch (error) {
        console.error('AI Summary error:', error);
        return NextResponse.json(
            { error: 'Failed to generate summary' },
            { status: 500 }
        );
    }
}

function parseEvents(text: string): ExtractedEvent[] {
    const events: ExtractedEvent[] = [];

    // Try parsing as a JSON array
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        if (parsed && typeof parsed === 'object' && parsed.title) {
            return [parsed];
        }
    } catch {
        // Not pure JSON, try extracting JSON from text
    }

    // Extract JSON from markdown code blocks (```json ... ``` or ``` ... ```)
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1].trim());
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object' && parsed.title) return [parsed];
        } catch {
            // not valid JSON in code block, continue
        }
    }

    // Try extracting a JSON array from within the text
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
        try {
            const arr = JSON.parse(arrayMatch[0]);
            if (Array.isArray(arr)) {
                return arr;
            }
        } catch {
            // skip
        }
    }

    // Extract individual JSON objects from text using regex
    const jsonRegex = /\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*\}/g;
    const matches = text.match(jsonRegex);
    if (matches) {
        for (const match of matches) {
            try {
                const obj = JSON.parse(match);
                events.push(obj);
            } catch {
                // skip malformed
            }
        }
    }

    return events;
}
