/** Обычные страницы — в колонке с отступами. Главная живёт отдельно и идёт на всю ширину. */
export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return <div className="container main">{children}</div>;
}
