// Сообщает Яндексу о новых и изменённых страницах через IndexNow. Запускается после деплоя.
//   node scripts/indexnow.mjs --all              — все адреса из out/sitemap.xml
//   node scripts/indexnow.mjs --since <sha>      — только изменённые с коммита <sha>
// Ключ публичный по протоколу: он же лежит в public/<ключ>.txt и доступен на сайте.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const KEY = "87f80ec9fc69469ac241eccdd232e7fb";
const HOST = "finoved.ru";
const ORIGIN = `https://${HOST}`;

const args = process.argv.slice(2);
const since = args.includes("--since") ? args[args.indexOf("--since") + 1] : "";
const all = args.includes("--all") || !since || /^0+$/.test(since);

const sitemap = fs.readFileSync("out/sitemap.xml", "utf8");
const known = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

function changedUrls() {
  let files;
  try {
    files = execFileSync("git", ["diff", "--name-only", since, "HEAD", "--", "."], { encoding: "utf8" })
      .split("\n").filter(Boolean).map((f) => f.replace(/^mfo-site\//, ""));
  } catch {
    return known; // история недоступна — отправляем всё
  }
  if (!files.length) return [];
  // Изменились шаблоны, данные или стили — затронуты все страницы.
  if (files.some((f) => !f.startsWith("content/articles/") && !f.startsWith("docs/") && !f.endsWith(".md"))) return known;
  const slugs = files.filter((f) => f.startsWith("content/articles/")).map((f) => f.split("/").pop().replace(/\.md$/, ""));
  return [...slugs.map((s) => `${ORIGIN}/stati/${s}/`), `${ORIGIN}/stati/`, `${ORIGIN}/`].filter((u) => known.includes(u));
}

const urls = all ? known : changedUrls();
if (!urls.length) {
  console.log("IndexNow: нечего отправлять");
  process.exit(0);
}

const res = await fetch("https://yandex.com/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
});
console.log(`IndexNow: отправлено ${urls.length} адресов, ответ ${res.status}`);
if (!res.ok) console.log(await res.text());
