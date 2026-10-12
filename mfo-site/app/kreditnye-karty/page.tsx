import type { Metadata } from "next";
import Link from "next/link";
import { creditCards } from "@/lib/cards";
import { CreditCardCard, RiskWarning } from "@/components/BankCards";
import { CreditCardShowcase } from "@/components/CreditCardShowcase";
import { OffersSoon } from "@/components/OffersSoon";

export const metadata: Metadata = {
  title: "Кредитные карты с льготным периодом: сравнение условий",
  description: "Сравните кредитные карты по длине льготного периода, плате за обслуживание, лимиту и ПСК. Банки с лицензией Банка России.",
};

export default function KreditnyeKarty() {
  const rendered = Object.fromEntries(
    creditCards.map((c) => [c.slug, <CreditCardCard key={c.slug} card={c} placement="kreditnye-karty" />]),
  );
  return (
    <>
      <h1>Кредитные карты с льготным периодом</h1>
      <p>
        Если вернуть долг до конца льготного периода, проценты не начисляются — поэтому кредитка
        часто обходится дешевле микрозайма. Проверьте, на какие операции действует льготный период:
        у многих карт снятие наличных в него не входит. Подробнее — в статье{" "}
        <Link href="/stati/kreditka-vmesto-zayma/">«Кредитка вместо займа»</Link>.
      </p>
      <RiskWarning />
      {creditCards.length ? <CreditCardShowcase cards={creditCards} rendered={rendered} /> : <OffersSoon what="кредитных карт" />}
    </>
  );
}
