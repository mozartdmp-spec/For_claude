// Проверка статей и офферов перед публикацией: npm run check:content
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDir = path.join(root, "content/articles");
const errors = [];
const warnings = [];

const BANNED = [
  /без\s+отказа/i, /100\s*%\s*одобрени/i, /гарантированн\w*\s+одобр/i, /одобр\w*\s+всем/i,
  /без\s+проверок/i, /самы[ейх]\s+выгодн/i,
];

const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".md"));
const slugs = new Set(files.map((f) => f.replace(/\.md$/, "")));
const pages = new Set(["/", "/zaimy/", "/stati/", "/kalkulyator/", "/o-proekte/", "/reklama/", "/politika-konfidencialnosti/"]);

for (const f of files) {
  const slug = f.replace(/\.md$/, "");
  const { data, content } = matter(fs.readFileSync(path.join(articlesDir, f), "utf8"));
  const at = `content/articles/${f}`;

  if (!/^[a-z0-9-]+$/.test(slug)) errors.push(`${at}: slug только латиница, цифры и дефисы`);
  for (const k of ["title", "description", "date", "author"]) if (!data[k]) errors.push(`${at}: нет поля ${k}`);
  if (data.title?.length > 70) warnings.push(`${at}: title длиннее 70 символов (${data.title.length})`);
  if (data.description && (data.description.length < 100 || data.description.length > 170))
    warnings.push(`${at}: description ${data.description.length} символов, лучше 120–160`);
  if (!Array.isArray(data.faq) || data.faq.length < 3) warnings.push(`${at}: меньше 3 вопросов в faq`);

  const text = content.replace(/<!--[\s\S]*?-->/g, "");
  for (const re of BANNED) {
    const m = text.match(re) ?? (data.title ?? "").match(re);
    // «без отказа» можно упоминать в кавычках как разоблачение мифа
    if (m && !text.includes(`«${m[0]}`)) errors.push(`${at}: запрещённая формулировка «${m[0]}»`);
  }
  if (/<!--\s*TODO/i.test(content) && !data.draft) errors.push(`${at}: есть непроверенные TODO, а draft не стоит`);

  for (const [, href] of content.matchAll(/\]\((\/[^)\s#]*)/g)) {
    const m = href.match(/^\/stati\/([^/]+)\/?$/);
    if (m ? !slugs.has(m[1]) : !pages.has(href)) errors.push(`${at}: битая внутренняя ссылка ${href}`);
  }
  const words = text.split(/\s+/).length;
  if (words < 800) warnings.push(`${at}: всего ${words} слов`);
}

const offers = JSON.parse(fs.readFileSync(path.join(root, "data/offers.json"), "utf8"));
for (const o of offers) {
  const at = `data/offers.json [${o.slug}]`;
  for (const k of ["legalName", "cbrRegistry", "erid", "advertiser", "url"]) if (!o[k]) errors.push(`${at}: нет поля ${k}`);
  if (o.rateMaxPerDay > 0.8) errors.push(`${at}: ставка выше 0,8% в день`);
  if (o.pskMax > 292) errors.push(`${at}: ПСК выше 292%`);
  if (o.demo) warnings.push(`${at}: демо-оффер — замените перед запуском`);
}

for (const w of warnings) console.warn("⚠ " + w);
for (const e of errors) console.error("✖ " + e);
console.log(`\nСтатей: ${files.length}, офферов: ${offers.length}. Ошибок: ${errors.length}, предупреждений: ${warnings.length}`);
process.exit(errors.length ? 1 : 0);
