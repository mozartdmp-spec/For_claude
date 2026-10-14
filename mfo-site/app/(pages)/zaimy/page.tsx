import type { Metadata } from "next";
import { offers } from "@/lib/offers";
import { loanRow } from "@/lib/rows";
import { OfferRow, RiskWarning } from "@/components/OfferRows";
import { Showcase } from "@/components/Showcase";
import { OffersSoon } from "@/components/OffersSoon";

export const metadata: Metadata = {
  title: "Подбор микрозайма: сравнение условий МФО",
  description: "Сравните суммы, сроки, ставки и ПСК микрофинансовых организаций. Только МФО из реестра Банка России.",
};

export default function Zaimy() {
  const cards = Object.fromEntries(offers.map((o) => [o.slug, <OfferRow key={o.slug} row={loanRow(o, "zaimy")} />]));
  return (
    <>
      <h1>Подбор микрозайма</h1>
      <p className="lead">
        В подборке только организации из государственного реестра МФО Банка России. Порядок
        определяется оценкой редакции (<a href="/o-proekte/#metodika">методика</a>). Перед
        оформлением прочитайте индивидуальные условия договора на сайте МФО.
      </p>
      {offers.length ? <><RiskWarning /><Showcase offers={offers} cards={cards} /></> : <OffersSoon what="займов" />}
    </>
  );
}
