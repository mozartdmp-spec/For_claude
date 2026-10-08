export const site = {
  name: "ЗаймГид",
  tagline: "Честно о микрозаймах: условия, риски, сравнение МФО",
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
  { href: "/zaimy/", label: "Подбор займа" },
  { href: "/stati/", label: "Статьи" },
  { href: "/kalkulyator/", label: "Калькулятор" },
  { href: "/o-proekte/", label: "О проекте" },
];
