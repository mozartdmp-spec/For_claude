import type { Metadata } from "next";
import Link from "next/link";
import { creditCards } from "@/lib/cards";
import { creditRow } from "@/lib/rows";
import { OfferRow, RiskWarning } from "@/components/OfferRows";
import { CreditCardShowcase } from "@/components/CreditCardShowcase";
import { OffersSoon } from "@/components/OffersSoon";

export const metadata: Metadata = {
  title: "Кредитные карты с льготным периодом: сравнение условий",
  description: "Сравните кредитные карты по длине льготного периода, плате за обслуживание, лимиту и ПСК. Банки с лицензией Банка России.",
};

export default function KreditnyeKarty() {
  const rendered = Object.fromEntries(
    creditCards.map((c) => [c.slug, <OfferRow key={c.slug} row={creditRow(c, "kreditnye-karty")} />]),
  );
  return (
    <>
      <h1>Кредитные карты с льготным периодом</h1>
      <p className="lead">
        Если вернуть долг до конца льготного периода, проценты не начисляются — поэтому кредитка
        часто обходится дешевле микрозайма. Проверьте, на какие операции действует льготный период:
        у многих карт снятие наличных в него не входит. Подробнее — в статье{" "}
        <Link href="/stati/kreditka-vmesto-zayma/">«Кредитка вместо займа»</Link>.
      </p>
      {creditCards.length ? <><RiskWarning /><CreditCardShowcase cards={creditCards} rendered={rendered} /></> : <OffersSoon what="кредитных карт" />}
    </>
  );
}
