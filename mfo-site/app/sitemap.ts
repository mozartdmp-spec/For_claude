import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { offers } from "@/lib/offers";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/zaimy/", "/kreditnye-karty/", "/debetovye-karty/", "/stati/", "/kalkulyator/", "/o-proekte/"].map((p) => ({ url: site.url + p }));
  const articles = getAllArticles().map((a) => ({ url: `${site.url}/stati/${a.slug}/`, lastModified: a.updated ?? a.date }));
  const mfo = offers.filter((o) => !o.demo).map((o) => ({ url: `${site.url}/mfo/${o.slug}/` }));
  return [...pages, ...articles, ...mfo];
}
