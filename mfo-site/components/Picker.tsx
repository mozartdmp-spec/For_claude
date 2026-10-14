"use client";

import { useState } from "react";
import Link from "next/link";
import { OfferLink } from "./OfferLink";

/** Данные для подбора, подготовленные на сервере (в браузер уходит только нужное). */
export type PickLoan = {
  slug: string; mark: string; name: string; perk: string;
  min: number; max: number; maxDays: number; ratePerDay: number;
  href: string; legal: string; cond: string; psk: string;
};
export type PickCard = {
  slug: string; mark: string; name: string; perk: string;
  limit: number; grace: string; fee: string;
  href: string; legal: string; cond: string; psk: string;
};

const rub = (n: number) => Math.round(n).toLocaleString("ru-RU") + " ₽";
const TERMS = [7, 14, 30];

export function Picker({ loans, cards }: { loans: PickLoan[]; cards: PickCard[] }) {
  const [kind, setKind] = useState<"loan" | "card">(loans.length || !cards.length ? "loan" : "card");
  const [amount, setAmount] = useState(10000);
  const [term, setTerm] = useState(30);
  const isLoan = kind === "loan";

  const fitLoans = loans.filter((o) => amount >= o.min && amount <= o.max && term <= o.maxDays);
  const fitCards = cards.filter((c) => amount <= c.limit);
  const count = isLoan ? fitLoans.length : fitCards.length;

  let match: null | { slug: string; mark: string; name: string; perk: string; k1: string; v1: string; k2: string; v2: string; href: string; cta: string; legal: string; cond: string; psk: string } = null;
  if (isLoan && loans.length) {
    const o = fitLoans[0] ?? loans[0];
    match = { ...o, k1: "Вернёте вовремя", v1: rub(amount * (1 + (o.ratePerDay / 100) * term)), k2: "Срок", v2: `${term} дней`, cta: "Оформить займ" };
  } else if (!isLoan && cards.length) {
    const c = fitCards[0] ?? cards[0];
    match = { ...c, k1: "Без процентов", v1: c.grace, k2: "Обслуживание", v2: c.fee, cta: "Оформить карту" };
  }

  return (
    <div className="picker" id="podbor">
      <div className="segmented" role="tablist" aria-label="Что подобрать">
        <button role="tab" aria-selected={isLoan} onClick={() => setKind("loan")}>Займ</button>
        <button role="tab" aria-selected={!isLoan} onClick={() => setKind("card")}>Кредитная карта</button>
      </div>

      <label className="slider">
        <span className="slider__top">Сколько нужно <b className="slider__value">{rub(amount)}</b></span>
        <input type="range" min={3000} max={100000} step={1000} value={amount} onChange={(e) => setAmount(+e.target.value)} />
      </label>

      {isLoan && (
        <div className="chips" role="group" aria-label="Срок займа">
          {TERMS.map((d) => (
            <button key={d} className="chip" aria-pressed={term === d} onClick={() => setTerm(d)}>{d} дней</button>
          ))}
        </div>
      )}

      {match ? (
        <div className="match">
          <div className="match__top">
            <span className="match__note">{count > 0 ? `Лучшее совпадение из ${count}` : "Ближайшее предложение"}</span>
            <span className="muted">Реклама</span>
          </div>
          <div className="match__org">
            <div className="mark" aria-hidden="true">{match.mark}</div>
            <div><div className="match__name">{match.name}</div><div className="match__perk">{match.perk}</div></div>
          </div>
          <dl className="match__nums">
            <div><dt>{match.k1}</dt><dd>{match.v1}</dd></div>
            <div><dt>{match.k2}</dt><dd>{match.v2}</dd></div>
          </dl>
          <OfferLink href={match.href} slug={match.slug} placement="home-picker" className="btn btn--lg btn--block">{match.cta}</OfferLink>
          <p className="match__legal">{match.cond} {match.legal} ПСК {match.psk}.</p>
        </div>
      ) : (
        <div className="match">
          <p style={{ margin: 0 }}><b>Подбор скоро заработает.</b> Мы проверяем {isLoan ? "МФО" : "банки"} по реестру Банка России и условия договоров.</p>
          <p style={{ margin: 0 }}>Пока разберитесь, <Link href="/stati/chto-takoe-psk/">как читать ПСК</Link> и <Link href="/kalkulyator/">сколько стоит займ</Link>.</p>
        </div>
      )}

      <div className="picker__foot">
        <Link href={isLoan ? "/zaimy/" : "/kreditnye-karty/"}>Все предложения →</Link>
        <p className="risk-warning risk-warning--sm">Оценивайте свои финансовые возможности и риски</p>
      </div>
    </div>
  );
}
