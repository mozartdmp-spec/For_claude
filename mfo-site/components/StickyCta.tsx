"use client";

import { useEffect } from "react";
import { OfferLink } from "./OfferLink";

/** Закреплённая кнопка внизу экрана на телефоне. */
export function StickyCta({ href, slug, label }: { href: string; slug: string; label: string }) {
  useEffect(() => {
    document.body.classList.add("has-sticky");
    return () => document.body.classList.remove("has-sticky");
  }, []);
  return (
    <div className="sticky-cta">
      <OfferLink href={href} slug={slug} placement="sticky" className="btn btn--lg btn--block">{label}</OfferLink>
    </div>
  );
}
