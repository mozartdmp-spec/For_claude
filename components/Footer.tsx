import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p className="footer__warn">
          Займ и кредитная карта — это долг. Прежде чем брать деньги, оцените, сможете ли вернуть их в срок.
          Просрочка ведёт к штрафам и портит кредитную историю. Подробнее о рисках — в разделе{" "}
          <Link href="/stati/">«Статьи»</Link>.
        </p>
        <p>
          {site.name} — информационный сайт, а не кредитор и не кредитный брокер. Мы не выдаём займы
          и не принимаем заявки. На сайте размещены рекламные ссылки на сайты банков и микрофинансовых
          организаций; за переходы по ним мы можем получать вознаграждение (<Link href="/reklama/">подробнее</Link>).
          Решение о выдаче принимает банк или МФО.
        </p>
        <p className="footer__links">
          <Link href="/o-proekte/">О проекте и редакции</Link>
          <Link href="/reklama/">Раскрытие информации о рекламе</Link>
          <Link href="/politika-konfidencialnosti/">Политика конфиденциальности</Link>
        </p>
        <p className="muted">© {new Date().getFullYear()} {site.owner.name}. {site.owner.email}</p>
      </div>
    </footer>
  );
}
