import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticles, getArticle, fmtDate } from "@/lib/articles";
import { offers } from "@/lib/offers";
import { creditCards } from "@/lib/cards";
import { loanRow, creditRow } from "@/lib/rows";
import { OfferRows, RiskWarning } from "@/components/OfferRows";
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

/** Статьи про карты показывают кредитки, остальные — займы. */
const isCardTopic = (tags: string[]) => tags.some((t) => /карт|льготн/i.test(t));

export default async function ArticlePage({ params }: Props) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const url = `${site.url}/stati/${a.slug}/`;
  const placement = `article-${a.slug}`;
  const rows = isCardTopic(a.tags)
    ? creditCards.slice(0, 3).map((c) => creditRow(c, placement))
    : offers.slice(0, 3).map((o) => loanRow(o, placement));

  return (
    <div className="with-aside">
      <article className="article with-aside__main">
        <nav className="breadcrumbs" aria-label="Навигационная цепочка">
          <Link href="/">Главная</Link> / <Link href="/stati/">Гайды</Link>
        </nav>
        <h1>{a.title}</h1>
        <div className="byline">
          <div><span>Автор</span>{a.author}</div>
          {a.reviewer && <div><span>Проверил</span>{a.reviewer}</div>}
          <div><span>{a.updated ? "Обновлено" : "Опубликовано"}</span>{fmtDate(a.updated ?? a.date)}</div>
        </div>

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

        {rows.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2>{isCardTopic(a.tags) ? "Кредитные карты" : "Предложения МФО"}</h2>
            <RiskWarning />
            <OfferRows rows={rows} />
          </section>
        )}
      </article>

      <aside className="with-aside__side">
        {a.headings.length > 2 && (
          <nav className="card toc" aria-label="Содержание статьи">
            <b>Содержание</b>
            <ol>{a.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
          </nav>
        )}
        <div className="card card--dark">
          <h3>Посчитайте свою переплату</h3>
          <p>С учётом законных ограничений по ставке и переплате.</p>
          <Link href="/kalkulyator/" className="btn btn--soft btn--block">Открыть калькулятор</Link>
        </div>
      </aside>

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
    </div>
  );
}
