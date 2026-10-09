import creditRaw from "@/data/credit-cards.json";
import debitRaw from "@/data/debit-cards.json";

type BankOffer = {
  slug: string;
  /** Демо-оффер: на сайте показывается предупреждение. */
  demo?: boolean;
  bank: string;
  name: string;
  /** Полное наименование банка — обязательно в рекламе финуслуг (ст. 28 38-ФЗ). */
  legalName: string;
  /** Номер лицензии Банка России. */
  license: string;
  feeFree: boolean;
  fee: string;
  features: string[];
  rating: number;
  /** Партнёрская ссылка из CPA-сети. */
  url: string;
  subidParam?: string;
  /** Токен маркировки рекламы из ОРД. */
  erid: string;
  advertiser: string;
};

export type CreditCard = BankOffer & {
  graceDays: number;
  /** На что действует льготный период: «на покупки», «на покупки и снятие наличных». */
  graceNote: string;
  limitMax: number;
  cashInGrace: boolean;
  pskMin: number;
  pskMax: number;
};

export type DebitCard = BankOffer & {
  cashback: string;
  balanceRate: string;
};

const byRating = <T extends { rating: number }>(xs: T[]) => xs.toSorted((a, b) => b.rating - a.rating);

export const creditCards: CreditCard[] = byRating(creditRaw as CreditCard[]);
export const debitCards: DebitCard[] = byRating(debitRaw as DebitCard[]);

export const hasDemoCards = [...creditCards, ...debitCards].some((c) => c.demo);
