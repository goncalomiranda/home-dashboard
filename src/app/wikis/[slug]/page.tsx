import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Layout from '@/components/Layout';
import { getWikiContent, listWikiDocuments } from '@/lib/wikis';
import styles from '../wikis.module.css';

interface WikiPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WikiPageProps): Promise<Metadata> {
  const { slug } = await params;
  const documents = await listWikiDocuments();
  const document = documents.find((item) => item.slug === slug);

  return document ? { title: `${document.title} | Wikis` } : {};
}

export default async function WikiPage({ params }: WikiPageProps) {
  const { slug } = await params;
  const content = await getWikiContent(slug);

  if (!content) {
    notFound();
  }

  return (
    <Layout title="Wikis">
      <article className={styles.article}>
        <Link className={styles.backLink} href="/wikis">
          <span className="material-symbols-rounded" aria-hidden="true">arrow_back</span>
          All wikis
        </Link>
        <div className={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </article>
    </Layout>
  );
}