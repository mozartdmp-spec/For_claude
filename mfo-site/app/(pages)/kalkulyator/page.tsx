import type { Metadata } from "next";
import Link from "next/link";
import { Calculator } from "@/components/Calculator";

export const metadata: Metadata = {
  title: "Калькулятор микрозайма: сколько придётся вернуть",
  description: "Посчитайте проценты и переплату по займу в МФО с учётом законных ограничений: 0,8% в день и не более 130% переплаты.",
};

export default function Kalkulyator() {
  return (
    <>
      <h1>Калькулятор микрозайма</h1>
      <p>
        Введите сумму, срок и ставку из условий МФО. Калькулятор учитывает ограничения закона:
        ставка — не выше 0,8% в день, а общая переплата — не больше 130% от суммы займа.
      </p>
      <Calculator />
      <p>Что такое ПСК и почему она важнее ставки — <Link href="/stati/chto-takoe-psk/">в нашей статье</Link>.</p>
    </>
  );
}
