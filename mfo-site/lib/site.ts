export const site = {
  name: "Финовед",
  tagline: "Честно о займах и банковских картах: условия, риски, сравнение",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://finoved.ru").replace(/\/$/, ""),
  ymId: process.env.NEXT_PUBLIC_YM_ID ?? "",
  /** NEXT_PUBLIC_NOINDEX=1 закрывает сайт от индексации — пока на нём демо-офферы. */
  noindex: process.env.NEXT_PUBLIC_NOINDEX === "1",
  // Владелец сайта — указывается в разделе «О проекте» и в политике ПДн.
  owner: {
    name: "ИП Фамилия Имя Отчество",
    inn: "000000000000",
    email: "info@finoved.ru",
  },
};

export const nav = [
  { href: "/zaimy/", label: "Займы" },
  { href: "/kreditnye-karty/", label: "Кредитные карты" },
  { href: "/debetovye-karty/", label: "Дебетовые карты" },
  { href: "/stati/", label: "Статьи" },
  { href: "/kalkulyator/", label: "Калькулятор" },
  { href: "/o-proekte/", label: "О проекте" },
];
