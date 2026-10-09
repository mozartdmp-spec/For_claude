"use client";

import { useState } from "react";
import type { CreditCard } from "@/lib/cards";

const FILTERS = [
  { key: "longGrace", label: "Льготный период от 100 дней", test: (c: CreditCard) => c.graceDays >= 100 },
  { key: "feeFree", label: "Бесплатное обслуживание", test: (c: CreditCard) => c.feeFree },
  { key: "cash", label: "Снятие наличных в льготный период", test: (c: CreditCard) => c.cashInGrace },
] as const;

type Key = (typeof FILTERS)[number]["key"];

/** Фильтр витрины кредиток. Карточки рендерятся на сервере и приходят по slug. */
export function CreditCardShowcase({ cards, rendered }: { cards: CreditCard[]; rendered: Record<string, React.ReactNode> }) {
  const [on, setOn] = useState<Record<Key, boolean>>({ longGrace: false, feeFree: false, cash: false });
  const visible = cards.filter((c) => FILTERS.every((f) => !on[f.key] || f.test(c)));

  return (
    <>
      <div className="filter">
        {FILTERS.map((f) => (
          <label key={f.key} className="filter__check">
            <input type="checkbox" checked={on[f.key]} onChange={(e) => setOn({ ...on, [f.key]: e.target.checked })} />
            {f.label}
          </label>
        ))}
      </div>
      <p className="muted">Подходит карт: {visible.length} из {cards.length}</p>
      <div className="grid">{visible.map((c) => <div key={c.slug}>{rendered[c.slug]}</div>)}</div>
      {visible.length === 0 && <p>Под эти условия ничего не нашлось — снимите один из фильтров.</p>}
    </>
  );
}
