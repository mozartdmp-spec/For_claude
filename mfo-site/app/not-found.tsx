import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container main">
      <h1>Страница не найдена</h1>
      <p className="lead">Возможно, её перенесли. Начните с главной или загляните в гайды.</p>
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/" className="btn btn--ink">На главную</Link>
        <Link href="/stati/" className="btn btn--soft">Гайды</Link>
      </p>
    </div>
  );
}
