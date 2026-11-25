import Link from 'next/link';
import Layout from '@/components/Layout';
import { listWikiDocuments } from '@/lib/wikis';
import styles from './wikis.module.css';

export default async function WikisPage() {
  const documents = await listWikiDocuments();

  return (
    <Layout title="Wikis">
      <section className={styles.page}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Knowledge base</p>
          <h1>Wikis</h1>
          <p>Practical notes and troubleshooting guides.</p>
        </header>

        <ul className={styles.list}>
          {documents.map((document) => (
            <li className={styles.item} key={document.slug}>
              <Link className={styles.link} href={`/wikis/${document.slug}`}>
                <span className={styles.icon} aria-hidden="true">description</span>
                <span className={styles.copy}>
                  <span className={styles.title}>{document.title}</span>
                  <span className={styles.summary}>{document.summary}</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">arrow_forward</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}