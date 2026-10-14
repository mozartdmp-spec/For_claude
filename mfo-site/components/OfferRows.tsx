import Link from "next/link";
import type { Row } from "@/lib/rows";
import { OfferLink } from "./OfferLink";

/** Предупреждение из закона о рекламе кредитов и займов. */
export function RiskWarning({ small = false }: { small?: boolean }) {
  return <p className={small ? "risk-warning risk-warning--sm" : "risk-warning"}>Оценивайте свои финансовые возможности и риски</p>;
}

/** Таблица сравнения предложений: на широком экране — строки, на узком — карточки. */
export function OfferRows({ rows, head }: { rows: Row[]; head?: string[] }) {
  return (
    <div className="rows">
      {head && (
        <div className="rows__head" aria-hidden="true">
          {head.map((h, i) => <span key={i}>{h}</span>)}
        </div>
      )}
      {rows.map((r) => <OfferRow key={r.slug} row={r} />)}
    </div>
  );
}

export function OfferRow({ row: r }: { row: Row }) {
  return (
    <article className="row">
      <div className="row__inner">
        <div className="row__org">
          <div className="mark" aria-hidden="true">{r.mark}</div>
          <div>
            {r.detailHref ? <Link href={r.detailHref} className="row__name">{r.name}</Link> : <span className="row__name">{r.name}</span>}
            {r.perk && <div><span className="row__perk">{r.perk}</span></div>}
          </div>
        </div>
        <dl className="row__cols">
          {r.cols.map((c) => (
            <div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>
          ))}
        </dl>
        <OfferLink href={r.href} slug={r.slug} placement={r.placement} className="btn row__cta">{r.cta}</OfferLink>
      </div>
      <p className="row__legal">
        {r.ad}. {r.legal}{r.risk && " Оценивайте свои финансовые возможности и риски."}
      </p>
    </article>
  );
}
