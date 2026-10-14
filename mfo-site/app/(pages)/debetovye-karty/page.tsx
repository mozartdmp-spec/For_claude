import type { Metadata } from "next";
import { debitCards } from "@/lib/cards";
import { debitRow } from "@/lib/rows";
import { OfferRows } from "@/components/OfferRows";
import { OffersSoon } from "@/components/OffersSoon";

export const metadata: Metadata = {
  title: "Дебетовые карты с кэшбэком и процентом на остаток",
  description: "Сравните дебетовые карты по кэшбэку, проценту на остаток и стоимости обслуживания.",
};

export default function DebetovyeKarty() {
  return (
    <>
      <h1>Дебетовые карты</h1>
      <p className="lead">
        Сравнивайте карты по тому, что вы реально будете использовать: кэшбэк в ваших категориях
        трат, процент на остаток и условия бесплатного обслуживания. Порядок определяется оценкой
        редакции (<a href="/o-proekte/#metodika">методика</a>).
      </p>
      {debitCards.length ? (
        <OfferRows rows={debitCards.map((c) => debitRow(c, "debetovye-karty"))} />
      ) : <OffersSoon what="дебетовых карт" />}
    </>
  );
}
