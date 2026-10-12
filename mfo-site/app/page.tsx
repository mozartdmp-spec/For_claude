import Link from "next/link";
import { offers } from "@/lib/offers";
import { creditCards } from "@/lib/cards";
import { getAllArticles, fmtDate } from "@/lib/articles";
import { OfferCard } from "@/components/OfferCard";
import { CreditCardCard } from "@/components/BankCards";
import { OffersSoon } from "@/components/OffersSoon";

export default function Home() {
  const articles = getAllArticles().slice(0, 6);
  return (
    <>
      <section className="hero">
        <h1>Деньги взаймы — без сюрпризов в договоре</h1>
        <p>
          Сравниваем микрозаймы и банковские карты, считаем реальную переплату и честно говорим,
          когда займ — не лучший выход.
        </p>
        <div className="categories">
          <Link href="/zaimy/" className="category"><b>Микрозайм</b><span>На карту за минуты, до 30 дней</span></Link>
          <Link href="/kreditnye-karty/" className="category"><b>Кредитная карта</b><span>Без процентов в льготный период</span></Link>
          <Link href="/debetovye-karty/" className="category"><b>Дебетовая карта</b><span>Кэшбэк и процент на остаток</span></Link>
        </div>
      </section>

      <section>
        <h2>10 000 ₽ на 30 дней: что выгоднее</h2>
        <table className="table">
          <tbody>
            <tr><th>Микрозайм под 0,8% в день</th><td>переплата 2 400 ₽</td></tr>
            <tr><th>Кредитная карта, если вернуть в льготный период</th><td>переплата 0 ₽</td></tr>
          </tbody>
        </table>
        <p className="muted">
          Без учёта комиссий за снятие наличных и платных услуг. Свой случай посчитайте
          в <Link href="/kalkulyator/">калькуляторе</Link>.
        </p>
      </section>

      <section>
        <h2>Микрозаймы</h2>
        {offers.length ? (
          <div className="grid">
            {offers.slice(0, 3).map((o) => <OfferCard key={o.slug} offer={o} placement="home" />)}
          </div>
        ) : <OffersSoon what="займов" />}
        <p><Link href="/zaimy/">Все займы →</Link></p>
      </section>

      <section>
        <h2>Кредитные карты</h2>
        {creditCards.length ? (
          <div className="grid">
            {creditCards.slice(0, 3).map((c) => <CreditCardCard key={c.slug} card={c} placement="home" />)}
          </div>
        ) : <OffersSoon what="кредитных карт" />}
        <p><Link href="/kreditnye-karty/">Все кредитные карты →</Link></p>
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
