"use client";

import { useState } from "react";

const MAX_RATE = 0.8; // % в день — предельная ставка для МФО с 01.07.2023
const MAX_OVERPAY = 1.3; // переплата не более 130% от суммы займа

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU") + " ₽";

export function Calculator() {
  const [amount, setAmount] = useState(10000);
  const [daysN, setDays] = useState(30);
  const [rate, setRate] = useState(0.8);
  const [lateDays, setLate] = useState(0);

  const r = Math.min(rate, MAX_RATE) / 100;
  const interest = amount * r * daysN;
  // Пени при просрочке — не более 20% годовых на остаток основного долга (ч. 21 ст. 5 353-ФЗ).
  const penalty = amount * 0.2 / 365 * lateDays;
  const lateInterest = amount * r * lateDays;
  const overpayRaw = interest + lateInterest + penalty;
  const cap = amount * MAX_OVERPAY;
  const overpay = Math.min(overpayRaw, cap);
  const capped = overpayRaw > cap;

  return (
    <div className="calc">
      <div className="calc__inputs">
        <label>Сумма займа, ₽
          <input type="number" min={1000} max={1000000} step={500} value={amount}
            onChange={(e) => setAmount(Math.max(0, +e.target.value))} />
        </label>
        <label>Срок, дней
          <input type="number" min={1} max={365} value={daysN} onChange={(e) => setDays(Math.max(1, +e.target.value))} />
        </label>
        <label>Ставка, % в день
          <input type="number" min={0} max={MAX_RATE} step={0.05} value={rate}
            onChange={(e) => setRate(Math.max(0, +e.target.value))} />
        </label>
        <label>Дней просрочки (если будет)
          <input type="number" min={0} max={365} value={lateDays} onChange={(e) => setLate(Math.max(0, +e.target.value))} />
        </label>
      </div>
      <div className="calc__result">
        <div><span>Проценты за срок</span><b>{fmt(interest)}</b></div>
        {lateDays > 0 && <div><span>Проценты и пени за просрочку</span><b>{fmt(lateInterest + penalty)}</b></div>}
        <div><span>Переплата всего</span><b>{fmt(overpay)}</b></div>
        <div className="calc__total"><span>Вернуть</span><b>{fmt(amount + overpay)}</b></div>
        <div><span>Годовая ставка</span><b>{(Math.min(rate, MAX_RATE) * 365).toLocaleString("ru-RU")}%</b></div>
        {rate > MAX_RATE && <p className="warn">Ставка выше 0,8% в день для МФО запрещена — расчёт сделан по 0,8%.</p>}
        {capped && <p className="warn">Сработал законный потолок: переплата не может превышать 130% от суммы займа.</p>}
        <p className="muted">
          Расчёт примерный: точную сумму к возврату и ПСК смотрите в индивидуальных условиях договора.
        </p>
      </div>
    </div>
  );
}
