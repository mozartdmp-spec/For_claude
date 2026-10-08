"use client";

declare global {
  interface Window { ym?: (...args: unknown[]) => void }
}

/** Партнёрская ссылка: rel=sponsored для поисковиков + цель в Метрике. */
export function OfferLink({ href, slug, placement, className, children }: {
  href: string; slug: string; placement: string; className?: string; children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener"
      className={className}
      onClick={() => {
        const id = Number(process.env.NEXT_PUBLIC_YM_ID);
        if (id && window.ym) window.ym(id, "reachGoal", "offer_click", { offer: slug, placement });
      }}
    >
      {children}
    </a>
  );
}
