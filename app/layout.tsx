import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DemoBanner } from "@/components/DemoBanner";
import { Metrika } from "@/components/Metrika";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s — ${site.name}` },
  description: "Независимые статьи о микрозаймах: как выбрать МФО, посчитать переплату и не попасть в долговую яму.",
  openGraph: { siteName: site.name, locale: "ru_RU", type: "website" },
  alternates: { canonical: "./" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <DemoBanner />
        <Header />
        <main className="container main">{children}</main>
        <Footer />
        <Metrika />
      </body>
    </html>
  );
}
