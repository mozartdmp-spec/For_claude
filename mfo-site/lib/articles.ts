import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const dir = path.join(process.cwd(), "content/articles");

export type Faq = { q: string; a: string };

export type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author: string;
  reviewer?: string;
  tags: string[];
  faq: Faq[];
  draft: boolean;
};

export type Article = ArticleMeta & { html: string; headings: { id: string; text: string }[] };

const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");

function read(slug: string): Article {
  const file = fs.readFileSync(path.join(dir, `${slug}.md`), "utf8");
  const { data, content } = matter(file);
  const headings: Article["headings"] = [];
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = slugify(text);
    if (depth === 2) headings.push({ id, text: text.replace(/<[^>]+>/g, "") });
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  const html = marked.parse(content, { renderer, async: false }) as string;
  return {
    slug,
    title: data.title,
    description: data.description,
    date: String(data.date),
    updated: data.updated ? String(data.updated) : undefined,
    author: data.author,
    reviewer: data.reviewer,
    tags: data.tags ?? [],
    faq: data.faq ?? [],
    draft: Boolean(data.draft),
    html,
    headings,
  };
}

export function getAllArticles(): Article[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => read(f.replace(/\.md$/, "")))
    .filter((a) => !a.draft || process.env.NODE_ENV === "development")
    .sort((a, b) => (b.updated ?? b.date).localeCompare(a.updated ?? a.date));
}

export function getArticle(slug: string) {
  return getAllArticles().find((a) => a.slug === slug);
}

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
