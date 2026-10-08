import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticles, fmtDate } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Статьи о микрозаймах",
  description: "Как работают микрозаймы, что такое ПСК, как проверить МФО и что делать при просрочке.",
};

export default function Stati() {
  const articles = getAllArticles();
  return (
    <>
      <h1>Статьи</h1>
      <ul className="article-list">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/stati/${a.slug}/`}>{a.title}</Link>
            <p>{a.description}</p>
            <span className="muted">{fmtDate(a.updated ?? a.date)} · {a.author}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
