import { type Offer, offerHref, rub, pct, days } from "@/lib/offers";
import type { CreditCard, DebitCard } from "@/lib/cards";

/** Строка сравнения: общий вид для займов и карт. Все поля маркировки рекламы обязательны. */
export type Row = {
  slug: string;
  mark: string;
  name: string;
  detailHref?: string;
  perk?: string;
  cols: { label: string; value: string }[];
  cta: string;
  href: string;
  placement: string;
  /** «Реклама. <рекламодатель>. erid: …» — ст. 18.1 38-ФЗ */
  ad: string;
  /** Полное наименование и номер в реестре или лицензия ЦБ — ст. 28 38-ФЗ */
  legal: string;
  /** Займы и кредиты: «Оценивайте свои финансовые возможности и риски» */
  risk: boolean;
};

export const initials = (s: string) =>
  s.replace(/[«»"]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const adLine = (advertiser: string, erid: string) => `Реклама. ${advertiser}. erid: ${erid}`;

export function loanRow(o: Offer, placement: string): Row {
  return {
    slug: o.slug,
    mark: initials(o.brand),
    name: o.brand,
    detailHref: `/mfo/${o.slug}/`,
    perk: o.firstLoanFree ? "0% на первый займ" : o.features[0],
    cols: [
      { label: "Сумма", value: `${rub(o.amountMin)} – ${rub(o.amountMax)}` },
      { label: "Срок", value: `${o.termMinDays} – ${days(o.termMaxDays)}` },
      { label: "Ставка", value: `${pct(o.rateMinPerDay)} – ${pct(o.rateMaxPerDay)} в день` },
      { label: "ПСК", value: `${pct(o.pskMin)} – ${pct(o.pskMax)} годовых` },
    ],
    cta: "Оформить займ",
    href: offerHref(o, placement),
    placement,
    ad: adLine(o.advertiser, o.erid),
    legal: `${o.legalName}, рег. номер в реестре МФО Банка России ${o.cbrRegistry}.`,
    risk: true,
  };
}

export function creditRow(c: CreditCard, placement: string): Row {
  return {
    slug: c.slug,
    mark: initials(c.bank),
    name: c.name,
    perk: `До ${days(c.graceDays)} без процентов`,
    cols: [
      { label: "Лимит", value: `до ${rub(c.limitMax)}` },
      { label: "Без процентов", value: `до ${days(c.graceDays)}` },
      { label: "Обслуживание", value: c.fee },
      { label: "ПСК", value: `${pct(c.pskMin)} – ${pct(c.pskMax)} годовых` },
    ],
    cta: "Оформить карту",
    href: offerHref(c, placement),
    placement,
    ad: adLine(c.advertiser, c.erid),
    legal: `${c.legalName}, лицензия Банка России № ${c.license}. Льготный период ${c.graceNote}.`,
    risk: true,
  };
}

export function debitRow(c: DebitCard, placement: string): Row {
  return {
    slug: c.slug,
    mark: initials(c.bank),
    name: c.name,
    perk: c.features[0],
    cols: [
      { label: "Кэшбэк", value: c.cashback },
      { label: "На остаток", value: c.balanceRate },
      { label: "Обслуживание", value: c.fee },
      { label: "Банк", value: c.bank },
    ],
    cta: "Оформить карту",
    href: offerHref(c, placement),
    placement,
    ad: adLine(c.advertiser, c.erid),
    legal: `${c.legalName}, лицензия Банка России № ${c.license}.`,
    risk: false,
  };
}
