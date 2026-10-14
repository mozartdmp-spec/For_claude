"use client";

import { Fragment, useState } from "react";
import type { Offer } from "@/lib/offers";
import { rub } from "@/lib/offers";

/** Фильтр витрины. Карточки рендерятся на сервере и передаются как children по slug. */
export function Showcase({ offers, cards }: { offers: Offer[]; cards: Record<string, React.ReactNode> }) {
  const [amount, setAmount] = useState(10000);
  const [term, setTerm] = useState(14);
  const [freeOnly, setFreeOnly] = useState(false);

  const visible = offers.filter(
    (o) =>
      amount >= o.amountMin && amount <= o.amountMax &&
      term >= o.termMinDays && term <= o.termMaxDays &&
      (!freeOnly || o.firstLoanFree),
  );

  return (
    <>
      <form className="filter" onSubmit={(e) => e.preventDefault()}>
        <label>
          Сумма: <b>{rub(amount)}</b>
          <input type="range" min={1000} max={100000} step={1000} value={amount}
            onChange={(e) => setAmount(+e.target.value)} />
        </label>
        <label>
          Срок: <b>{term} дн.</b>
          <input type="range" min={5} max={180} value={term} onChange={(e) => setTerm(+e.target.value)} />
        </label>
        <label className="filter__check">
          <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
          Только 0% на первый займ
        </label>
      </form>
      <p className="muted">Подходит предложений: {visible.length} из {offers.length}</p>
      {visible.length > 0 && <div className="rows">{visible.map((o) => <Fragment key={o.slug}>{cards[o.slug]}</Fragment>)}</div>}
      {visible.length === 0 && <p>Под эти условия ничего не нашлось — попробуйте изменить сумму или срок.</p>}
    </>
  );
}
