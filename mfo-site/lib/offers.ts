import raw from "@/data/offers.json";

export type Offer = {
  slug: string;
  /** Демо-оффер: на сайте показывается предупреждение, в sitemap не попадает. */
  demo?: boolean;
  brand: string;
  /** Полное наименование — обязательно в рекламе финуслуг (ст. 28 38-ФЗ). */
  legalName: string;
  ogrn: string;
  /** Регистрационный номер в госреестре МФО Банка России. */
  cbrRegistry: string;
  type: "МФК" | "МКК";
  amountMin: number;
  amountMax: number;
  termMinDays: number;
  termMaxDays: number;
  rateMinPerDay: number;
  rateMaxPerDay: number;
  /** Диапазон ПСК, % годовых — показывается не мельче ставки. */
  pskMin: number;
  pskMax: number;
  firstLoanFree: boolean;
  approvalMinutes: number;
  age: string;
  payout: string[];
  features: string[];
  rating: number;
  /** Партнёрская ссылка из CPA-сети. */
  url: string;
  /** Имя параметра subid в CPA-сети (sub1, subid, aff_sub…). */
  subidParam?: string;
  /** Токен маркировки рекламы из ОРД (выдаёт CPA-сеть). */
  erid: string;
  /** Рекламодатель для пометки «Реклама». */
  advertiser: string;
};

/** Демо-офферы видны только при разработке или с NEXT_PUBLIC_SHOW_DEMO=1 — на рабочий сайт не попадают. */
export const showDemo = process.env.NEXT_PUBLIC_SHOW_DEMO === "1" || process.env.NODE_ENV === "development";

export const offers: Offer[] = (raw as Offer[])
  .filter((o) => showDemo || !o.demo)
  .toSorted((a, b) => b.rating - a.rating);


export function getOffer(slug: string) {
  return offers.find((o) => o.slug === slug);
}

/** Партнёрская ссылка с subid = место размещения, чтобы видеть в CPA-сети, какая страница продаёт. */
export function offerHref(offer: { url: string; subidParam?: string }, placement: string) {
  if (!offer.subidParam) return offer.url;
  const u = new URL(offer.url);
  u.searchParams.set(offer.subidParam, placement.slice(0, 64));
  return u.toString();
}

export const rub = (n: number) => n.toLocaleString("ru-RU") + " ₽";
export const pct = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 3 }) + "%";
export const days = (n: number) => {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? "день" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "дня" : "дней";
  return `${n} ${w}`;
};
