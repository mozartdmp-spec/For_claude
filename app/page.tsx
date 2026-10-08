import Link from "next/link";
import { offers } from "@/lib/offers";
import { getAllArticles, fmtDate } from "@/lib/articles";
import { OfferCard } from "@/components/OfferCard";

export default function Home() {
  const articles = getAllArticles().slice(0, 6);
  return (
    <>
      <section className="hero">
        <h1>Микрозаймы без сюрпризов</h1>
        <p>
          Разбираем условия МФО, считаем реальную переплату и объясняем, когда займ поможет,
          а когда лучше поискать другой выход.
        </p>
        <div className="hero__actions">
          <Link href="/zaimy/" className="btn">Подобрать займ</Link>
          <Link href="/kalkulyator/" className="btn btn--ghost">Посчитать переплату</Link>
        </div>
      </section>

      <section>
        <h2>Популярные предложения</h2>
        <div className="grid">
          {offers.slice(0, 3).map((o) => <OfferCard key={o.slug} offer={o} placement="home" />)}
        </div>
        <p><Link href="/zaimy/">Все предложения →</Link></p>
      </section>

      <section>
        <h2>Свежие статьи</h2>
        <ul className="article-list">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={`/stati/${a.slug}/`}>{a.title}</Link>
              <p>{a.description}</p>
              <span className="muted">{fmtDate(a.updated ?? a.date)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
