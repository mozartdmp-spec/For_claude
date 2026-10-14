import Link from "next/link";
import { nav } from "@/lib/site";

export function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link href="/" className="logo" aria-label="Финовед — на главную">финовед<span>.</span></Link>
        <nav className="nav" aria-label="Основные разделы">
          {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        </nav>
        <Link href="/#podbor" className="btn btn--pill">Подобрать</Link>
      </div>
    </header>
  );
}
