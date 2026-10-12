import Link from "next/link";

/** Показывается вместо витрины, пока офферы из CPA-сетей не подключены. */
export function OffersSoon({ what = "предложений" }: { what?: string }) {
  return (
    <div className="offers-soon">
      <p><b>Сравнение {what} скоро появится.</b> Мы проверяем организации по реестру Банка России и условия договоров.</p>
      <p>
        Пока можно разобраться, на что смотреть: <Link href="/stati/chto-takoe-psk/">что такое ПСК</Link>,{" "}
        <Link href="/stati/kak-proverit-mfo/">как проверить МФО</Link>,{" "}
        <Link href="/kalkulyator/">калькулятор переплаты</Link>.
      </p>
    </div>
  );
}
