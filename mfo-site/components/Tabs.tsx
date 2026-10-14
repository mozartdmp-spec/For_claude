"use client";

import { useState } from "react";

/** Вкладки: содержимое панелей рендерится на сервере и приходит готовым. */
export function Tabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="tabs__list" role="tablist" style={{ marginBottom: 20 }}>
        {tabs.map((t, i) => (
          <button key={t.label} role="tab" aria-selected={active === i} onClick={() => setActive(i)}>{t.label}</button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} role="tabpanel" hidden={active !== i}>{t.content}</div>
      ))}
    </div>
  );
}
