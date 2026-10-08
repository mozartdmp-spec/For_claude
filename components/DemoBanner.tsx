import { hasDemoOffers } from "@/lib/offers";

export function DemoBanner() {
  if (!hasDemoOffers) return null;
  return (
    <div className="demo-banner">
      Демо-данные: офферы ненастоящие. Замените их в <code>data/offers.json</code> офферами из CPA-сети
      перед публикацией.
    </div>
  );
}
