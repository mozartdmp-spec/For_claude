import { offers } from "@/lib/offers";
import { creditCards, debitCards } from "@/lib/cards";

export function DemoBanner() {
  if (![...offers, ...creditCards, ...debitCards].some((o) => o.demo)) return null;
  return (
    <div className="demo-banner">
      Демо-данные: офферы ненастоящие. Замените их в <code>data/*.json</code> офферами из CPA-сети
      перед публикацией.
    </div>
  );
}
