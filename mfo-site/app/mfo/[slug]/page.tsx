import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { offers, getOffer, rub, pct, days } from "@/lib/offers";
import { OfferCard } from "@/components/OfferCard";
import { JsonLd } from "@/components/JsonLd";
import { OffersSoon } from "@/components/OffersSoon";

export const dynamicParams = false;
// Статическая сборка требует хотя бы одну страницу: пока офферов нет, отдаём служебную заглушку.
const PLACEHOLDER = "skoro";
export const generateStaticParams = () =>
  offers.length ? offers.map((o) => ({ slug: o.slug })) : [{ slug: PLACEHOLDER }];

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  if (slug === PLACEHOLDER) return { title: "Обзоры МФО", robots: { index: false } };
  const o = getOffer(slug);
  if (!o) return {};
  return {
    title: `${o.brand}: условия займа, ставки, отзывы`,
    description: `${o.brand} (${o.legalName}): займ от ${rub(o.amountMin)} до ${rub(o.amountMax)} на срок до ${days(o.termMaxDays)}, ПСК ${pct(o.pskMin)}–${pct(o.pskMax)}.`,
    robots: o.demo ? { index: false } : undefined,
  };
}

export default async function MfoPage({ params }: Props) {
  const slug = (await params).slug;
  if (slug === PLACEHOLDER) return <><h1>Обзоры МФО</h1><OffersSoon what="МФО" /></>;
  const o = getOffer(slug);
  if (!o) notFound();
  return (
    <div className="two-col">
      <div>
        <h1>{o.brand}: обзор условий</h1>
        <table className="table">
          <tbody>
            <tr><th>Организация</th><td>{o.legalName}</td></tr>
            <tr><th>Тип</th><td>{o.type === "МФК" ? "Микрофинансовая компания" : "Микрокредитная компания"}</td></tr>
            <tr><th>ОГРН</th><td>{o.ogrn}</td></tr>
            <tr><th>Номер в реестре ЦБ</th><td>{o.cbrRegistry}</td></tr>
            <tr><th>Сумма</th><td>{rub(o.amountMin)} – {rub(o.amountMax)}</td></tr>
            <tr><th>Срок</th><td>{o.termMinDays} – {days(o.termMaxDays)}</td></tr>
            <tr><th>Ставка</th><td>{pct(o.rateMinPerDay)} – {pct(o.rateMaxPerDay)} в день</td></tr>
            <tr><th>ПСК</th><td>{pct(o.pskMin)} – {pct(o.pskMax)} годовых</td></tr>
            <tr><th>Возраст заёмщика</th><td>{o.age}</td></tr>
            <tr><th>Способы получения</th><td>{o.payout.join(", ")}</td></tr>
            <tr><th>Рассмотрение заявки</th><td>от {o.approvalMinutes} мин.</td></tr>
          </tbody>
        </table>
        <h2>Как проверить организацию</h2>
        <p>
          Найдите {o.legalName} по ОГРН или названию в{" "}
          <a href="https://www.cbr.ru/fmp_check/" target="_blank" rel="noopener">справочнике участников финансового рынка</a>{" "}
          на сайте Банка России. Если организации там нет — она не вправе выдавать микрозаймы.
        </p>
      </div>
      <aside><OfferCard offer={o} placement={`mfo-${o.slug}`} /></aside>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        name: `Микрозайм ${o.brand}`,
        provider: { "@type": "Organization", name: o.legalName },
        annualPercentageRate: { "@type": "QuantitativeValue", minValue: o.pskMin, maxValue: o.pskMax },
      }} />
    </div>
  );
}
