import { hasDemoOffers } from "@/lib/offers";
import { hasDemoCards } from "@/lib/cards";

export function DemoBanner() {
  if (!hasDemoOffers && !hasDemoCards) return null;
  return (
    <div className="demo-banner">
      Демо-данные: офферы ненастоящие. Замените их в <code>data/*.json</code> офферами из CPA-сети
      перед публикацией.
    </div>
  );
}
