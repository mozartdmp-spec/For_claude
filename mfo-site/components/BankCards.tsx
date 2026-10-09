import type { CreditCard, DebitCard } from "@/lib/cards";
import { offerHref, rub, pct, days } from "@/lib/offers";
import { OfferLink } from "./OfferLink";

/** Предупреждение из закона о рекламе кредитов: «Оценивайте свои финансовые возможности и риски». */
export function RiskWarning() {
  return <p className="risk-warning">Оценивайте свои финансовые возможности и риски</p>;
}

function AdLabel({ advertiser, erid }: { advertiser: string; erid: string }) {
  return <div className="offer__ad">Реклама. {advertiser}. erid: {erid}</div>;
}

export function CreditCardCard({ card, placement }: { card: CreditCard; placement: string }) {
  return (
    <article className="offer">
      <AdLabel advertiser={card.advertiser} erid={card.erid} />
      <div className="offer__head">
        <h3 className="offer__brand">{card.name}</h3>
        <span className="offer__rating" title="Оценка редакции">★ {card.rating.toFixed(1)}</span>
      </div>
      <div className="muted">{card.bank}</div>
      <dl className="offer__terms">
        <div><dt>Льготный период</dt><dd>до {days(card.graceDays)}</dd></div>
        <div><dt>Лимит</dt><dd>до {rub(card.limitMax)}</dd></div>
        <div><dt>Обслуживание</dt><dd>{card.fee}</dd></div>
        <div><dt>ПСК</dt><dd>{pct(card.pskMin)} – {pct(card.pskMax)} годовых</dd></div>
      </dl>
      <ul className="offer__features">
        <li>Льготный период {card.graceNote}</li>
        {card.features.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <OfferLink href={offerHref(card, placement)} slug={card.slug} placement={placement} className="btn">
        Оформить на сайте банка
      </OfferLink>
      <p className="offer__legal">{card.legalName}, лицензия Банка России № {card.license}</p>
      <RiskWarning />
    </article>
  );
}

export function DebitCardCard({ card, placement }: { card: DebitCard; placement: string }) {
  return (
    <article className="offer">
      <AdLabel advertiser={card.advertiser} erid={card.erid} />
      <div className="offer__head">
        <h3 className="offer__brand">{card.name}</h3>
        <span className="offer__rating" title="Оценка редакции">★ {card.rating.toFixed(1)}</span>
      </div>
      <div className="muted">{card.bank}</div>
      <dl className="offer__terms">
        <div><dt>Кэшбэк</dt><dd>{card.cashback}</dd></div>
        <div><dt>Процент на остаток</dt><dd>{card.balanceRate}</dd></div>
        <div><dt>Обслуживание</dt><dd>{card.fee}</dd></div>
      </dl>
      <ul className="offer__features">
        {card.features.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <OfferLink href={offerHref(card, placement)} slug={card.slug} placement={placement} className="btn">
        Оформить на сайте банка
      </OfferLink>
      <p className="offer__legal">{card.legalName}, лицензия Банка России № {card.license}</p>
    </article>
  );
}
