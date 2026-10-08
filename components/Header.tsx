import Link from "next/link";
import { nav, site } from "@/lib/site";

export function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link href="/" className="logo">{site.name}</Link>
        <nav className="nav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
