import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const wikiDirectory = path.join(process.cwd(), 'content', 'wikis');

export interface WikiDocument {
  slug: string;
  title: string;
  summary: string;
}

export async function listWikiDocuments(): Promise<WikiDocument[]> {
  const files = await readdir(wikiDirectory, { withFileTypes: true });
  const documents = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith('.md'))
      .map(async (file) => {
        const content = await readFile(path.join(wikiDirectory, file.name), 'utf8');
        const lines = content.split(/\r?\n/);
        const title = lines.find((line) => line.startsWith('# '))?.slice(2).trim() ?? file.name;
        const titleIndex = lines.findIndex((line) => line.startsWith('# '));
        const summary = lines.slice(titleIndex + 1).find((line) => line.trim())?.trim() ?? '';

        return {
          slug: file.name.slice(0, -3),
          title,
          summary,
        };
      }),
  );

  return documents.sort((first, second) => first.title.localeCompare(second.title));
}

export async function getWikiContent(slug: string): Promise<string | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null;
  }

  const files = await readdir(wikiDirectory);
  if (!files.includes(`${slug}.md`)) {
    return null;
  }

  return readFile(path.join(wikiDirectory, `${slug}.md`), 'utf8');
}