import type { Metadata } from "next";
import { offers } from "@/lib/offers";
import { OfferCard } from "@/components/OfferCard";
import { Showcase } from "@/components/Showcase";

export const metadata: Metadata = {
  title: "Подбор микрозайма: сравнение условий МФО",
  description: "Сравните суммы, сроки, ставки и ПСК микрофинансовых организаций. Только МФО из реестра Банка России.",
};

export default function Zaimy() {
  const cards = Object.fromEntries(offers.map((o) => [o.slug, <OfferCard key={o.slug} offer={o} placement="zaimy" />]));
  return (
    <>
      <h1>Подбор микрозайма</h1>
      <p>
        В подборке только организации из государственного реестра МФО Банка России. Порядок
        определяется оценкой редакции (<a href="/o-proekte/#metodika">методика</a>). Перед
        оформлением прочитайте индивидуальные условия договора на сайте МФО.
      </p>
      <Showcase offers={offers} cards={cards} />
    </>
  );
}
