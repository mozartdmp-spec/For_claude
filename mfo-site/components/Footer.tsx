import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__about">
          <Link href="/" className="logo">финовед<span>.</span></Link>
          <p className="footer__warn">Займ и кредитная карта — это долг. Оценивайте свои финансовые возможности и риски.</p>
          <p>
            {site.name} — информационный сайт, а не кредитор и не кредитный брокер. Мы не выдаём займы и не принимаем
            заявки. Карточки предложений — реклама: за переходы по ним мы можем получать вознаграждение
            (<Link href="/reklama/">подробнее</Link>). Решение о выдаче принимает банк или МФО.
          </p>
          <p>© {new Date().getFullYear()} {site.owner.name}. {site.owner.email}</p>
        </div>
        <nav className="footer__links" aria-label="Служебные страницы">
          <Link href="/o-proekte/">О проекте и редакции</Link>
          <Link href="/reklama/">Раскрытие информации о рекламе</Link>
          <Link href="/politika-konfidencialnosti/">Политика конфиденциальности</Link>
        </nav>
      </div>
    </footer>
  );
}
