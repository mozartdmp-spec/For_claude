import Link from "next/link";
import { offers, offerHref, pct } from "@/lib/offers";
import { creditCards, debitCards } from "@/lib/cards";
import { getAllArticles } from "@/lib/articles";
import { loanRow, creditRow, debitRow, initials } from "@/lib/rows";
import { Picker, type PickLoan, type PickCard } from "@/components/Picker";
import { OfferRows, RiskWarning } from "@/components/OfferRows";
import { OffersSoon } from "@/components/OffersSoon";
import { Tabs } from "@/components/Tabs";
import { StickyCta } from "@/components/StickyCta";

const Check = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export default function Home() {
  const articles = getAllArticles().slice(0, 4);

  const pickLoans: PickLoan[] = offers.map((o) => ({
    slug: o.slug,
    mark: initials(o.brand),
    name: o.brand,
    perk: o.firstLoanFree ? "0% на первый займ" : o.features[0] ?? "",
    min: o.amountMin,
    max: o.amountMax,
    maxDays: o.termMaxDays,
    ratePerDay: o.rateMinPerDay,
    href: offerHref(o, "home-picker"),
    legal: `Реклама. ${o.advertiser}. erid: ${o.erid}. ${o.legalName}, рег. номер в реестре МФО ${o.cbrRegistry}.`,
    cond: o.rateMinPerDay === 0
      ? `0% — для новых клиентов при возврате в срок, далее до ${pct(o.rateMaxPerDay)} в день.`
      : `Расчёт по ставке от ${pct(o.rateMinPerDay)} в день.`,
    psk: `${pct(o.pskMin)} – ${pct(o.pskMax)} годовых`,
  }));
  const pickCards: PickCard[] = creditCards.map((c) => ({
    slug: c.slug,
    mark: initials(c.bank),
    name: c.name,
    perk: c.bank,
    limit: c.limitMax,
    grace: `до ${c.graceDays} дней`,
    fee: c.fee,
    href: offerHref(c, "home-picker"),
    legal: `Реклама. ${c.advertiser}. erid: ${c.erid}. ${c.legalName}, лицензия Банка России № ${c.license}.`,
    cond: `Без процентов — при погашении долга в льготный период (${c.graceNote}).`,
    psk: `${pct(c.pskMin)} – ${pct(c.pskMax)} годовых`,
  }));

  const loanTable = offers.length ? (
    <>
      <RiskWarning />
      <OfferRows rows={offers.slice(0, 5).map((o) => loanRow(o, "home"))} head={["Организация", "Сумма", "Срок", "Ставка", "ПСК", ""]} />
    </>
  ) : <OffersSoon what="займов" />;
  const cardTable = creditCards.length ? (
    <>
      <RiskWarning />
      <OfferRows rows={creditCards.slice(0, 5).map((c) => creditRow(c, "home"))} head={["Карта", "Лимит", "Без процентов", "Обслуживание", "ПСК", ""]} />
    </>
  ) : <OffersSoon what="кредитных карт" />;
  const debitTable = debitCards.length
    ? <OfferRows rows={debitCards.slice(0, 5).map((c) => debitRow(c, "home"))} head={["Карта", "Кэшбэк", "На остаток", "Обслуживание", "Банк", ""]} />
    : <OffersSoon what="дебетовых карт" />;

  const top = offers[0];

  return (
    <>
      <div className="container">
        <section className="hero">
          <div className="hero__text">
            <h1>Займ или кредитка<span>за минуту</span></h1>
            <p className="lead">
              Укажите сумму — покажем, где оформить на подходящих условиях. Заявка — на сайте МФО или банка,
              деньги приходят на вашу карту.
            </p>
          </div>
          <div className="hero__checks">
            <ul className="checks">
              <li><Check /><span><b>Только из реестра Банка России</b> — каждую МФО и банк проверяем перед публикацией</span></li>
              <li><Check /><span><b>Паспорт и банковская карта</b> — всё, что обычно нужно для заявки в МФО</span></li>
              <li><Check /><span><b>Подбор бесплатный</b> — мы не берём денег с вас и не просим ваши данные</span></li>
            </ul>
          </div>
          <Picker loans={pickLoans} cards={pickCards} />
        </section>
      </div>

      <section className="section section--white" id="vse">
        <div className="container">
          <div className="section__head">
            <h2>Сравнение предложений</h2>
            <span className="muted">Порядок — по оценке редакции · <Link href="/o-proekte/#metodika">методика</Link></span>
          </div>
          <Tabs tabs={[
            { label: "Займы", content: loanTable },
            { label: "Кредитные карты", content: cardTable },
            { label: "Дебетовые карты", content: debitTable },
          ]} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="tip">
            <div>
              <span className="eyebrow" style={{ color: "var(--cobalt-hover)" }}>Совет</span>
              <h2>Можете подождать день? Кредитка может обойтись без процентов</h2>
              <p>
                Если вернуть долг в льготный период, проценты не начисляются. Карту часто можно оформить онлайн,
                а пользоваться ею снова и снова. <Link href="/stati/kreditka-vmesto-zayma/">Когда это выгоднее займа</Link>.
              </p>
            </div>
            <Link href="/kreditnye-karty/" className="btn btn--lg">Подобрать кредитку</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Как это работает</h2>
          <div className="steps">
            <div className="step">
              <span className="step__num">01</span>
              <h3>Выберите предложение</h3>
              <p>Сравните условия здесь — без звонков и анкет на нашем сайте.</p>
            </div>
            <div className="step">
              <span className="step__num">02</span>
              <h3>Заполните заявку</h3>
              <p>На официальном сайте МФО или банка. Решение обычно приходит в течение нескольких минут.</p>
            </div>
            <div className="step">
              <span className="step__num">03</span>
              <h3>Получите деньги</h3>
              <p>На карту или по СБП. Прочитайте договор перед подписанием — <Link href="/stati/chto-takoe-psk/">объясняем, на что смотреть</Link>.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="section__head">
            <h2>Гайды</h2>
            <Link href="/stati/" className="more">Все гайды</Link>
          </div>
          <div className="guides">
            {articles.map((a, i) => (
              <Link key={a.slug} href={`/stati/${a.slug}/`} className="guide">
                <span className="guide__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="guide__title">{a.title}</span>
                <span className="guide__meta">{Math.max(3, Math.round(a.html.replace(/<[^>]+>/g, " ").split(/\s+/).length / 180))} мин</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {top && <StickyCta href={offerHref(top, "sticky")} slug={top.slug} label={`Оформить займ в ${top.brand}`} />}
    </>
  );
}
