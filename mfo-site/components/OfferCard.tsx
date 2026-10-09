import Link from "next/link";
import { type Offer, offerHref, rub, pct, days } from "@/lib/offers";
import { OfferLink } from "./OfferLink";
import { RiskWarning } from "./BankCards";

/**
 * Карточка оффера. Обязательные элементы рекламы займа:
 * пометка «Реклама» + рекламодатель + erid (ст. 18.1 38-ФЗ),
 * полное наименование МФО и ПСК не мельче ставки (ст. 28 38-ФЗ).
 */
export function OfferCard({ offer, placement }: { offer: Offer; placement: string }) {
  return (
    <article className="offer">
      <div className="offer__ad">
        Реклама. {offer.advertiser}. erid: {offer.erid}
      </div>
      <div className="offer__head">
        <h3 className="offer__brand">
          <Link href={`/mfo/${offer.slug}/`}>{offer.brand}</Link>
        </h3>
        <span className="offer__rating" title="Оценка редакции">★ {offer.rating.toFixed(1)}</span>
      </div>
      {offer.firstLoanFree && <div className="badge">0% на первый займ</div>}
      <dl className="offer__terms">
        <div><dt>Сумма</dt><dd>{rub(offer.amountMin)} – {rub(offer.amountMax)}</dd></div>
        <div><dt>Срок</dt><dd>{offer.termMinDays} – {days(offer.termMaxDays)}</dd></div>
        <div><dt>Ставка</dt><dd>{pct(offer.rateMinPerDay)} – {pct(offer.rateMaxPerDay)} в день</dd></div>
        <div><dt>ПСК</dt><dd>{pct(offer.pskMin)} – {pct(offer.pskMax)} годовых</dd></div>
      </dl>
      <ul className="offer__features">
        {offer.features.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <OfferLink href={offerHref(offer, placement)} slug={offer.slug} placement={placement} className="btn">
        Перейти на сайт МФО
      </OfferLink>
      <p className="offer__legal">
        {offer.legalName}, рег. номер в реестре МФО Банка России {offer.cbrRegistry}
      </p>
      <RiskWarning />
    </article>
  );
}
