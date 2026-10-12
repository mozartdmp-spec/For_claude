import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllArticles, getArticle, fmtDate } from "@/lib/articles";
import { offers } from "@/lib/offers";
import { OfferCard } from "@/components/OfferCard";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => getAllArticles().map((a) => ({ slug: a.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = getArticle((await params).slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    openGraph: { type: "article", title: a.title, description: a.description, publishedTime: a.date, modifiedTime: a.updated },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const url = `${site.url}/stati/${a.slug}/`;
  return (
    <article className="article">
      <h1>{a.title}</h1>
      <p className="article__meta">
        Автор: {a.author}
        {a.reviewer && <> · Проверил: {a.reviewer}</>}
        {" · "}
        {a.updated ? <>Обновлено {fmtDate(a.updated)}</> : fmtDate(a.date)}
      </p>

      {a.headings.length > 2 && (
        <nav className="toc">
          <b>Содержание</b>
          <ol>{a.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
        </nav>
      )}

      <div className="prose" dangerouslySetInnerHTML={{ __html: a.html }} />

      {a.faq.length > 0 && (
        <section className="faq">
          <h2 id="faq">Частые вопросы</h2>
          {a.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      )}

      {offers.length > 0 && (
        <section>
          <h2>Предложения МФО</h2>
          <div className="grid">
            {offers.slice(0, 3).map((o) => <OfferCard key={o.slug} offer={o} placement={`article-${a.slug}`} />)}
          </div>
        </section>
      )}

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: a.title,
        description: a.description,
        datePublished: a.date,
        dateModified: a.updated ?? a.date,
        author: { "@type": "Person", name: a.author },
        publisher: { "@type": "Organization", name: site.name },
        mainEntityOfPage: url,
      }} />
      {a.faq.length > 0 && (
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: a.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }} />
      )}
    </article>
  );
}
