export const site = {
  name: "ЗаймГид",
  tagline: "Честно о займах и банковских картах: условия, риски, сравнение",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.ru").replace(/\/$/, ""),
  ymId: process.env.NEXT_PUBLIC_YM_ID ?? "",
  // Владелец сайта — указывается в разделе «О проекте» и в политике ПДн.
  owner: {
    name: "ИП Фамилия Имя Отчество",
    inn: "000000000000",
    email: "info@example.ru",
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
