import type { Metadata } from "next";
import { debitCards } from "@/lib/cards";
import { DebitCardCard } from "@/components/BankCards";
import { OffersSoon } from "@/components/OffersSoon";

export const metadata: Metadata = {
  title: "Дебетовые карты с кэшбэком и процентом на остаток",
  description: "Сравните дебетовые карты по кэшбэку, проценту на остаток и стоимости обслуживания.",
};

export default function DebetovyeKarty() {
  return (
    <>
      <h1>Дебетовые карты</h1>
      <p>
        Сравнивайте карты по тому, что вы реально будете использовать: кэшбэк в ваших категориях
        трат, процент на остаток и условия бесплатного обслуживания. Порядок определяется оценкой
        редакции (<a href="/o-proekte/#metodika">методика</a>).
      </p>
      {debitCards.length ? (
        <div className="grid">
          {debitCards.map((c) => <DebitCardCard key={c.slug} card={c} placement="debetovye-karty" />)}
        </div>
      ) : <OffersSoon what="дебетовых карт" />}
    </>
  );
}
