import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Locales } from "intlayer";
import { useLocale } from "next-intlayer";

export function Notice() {
  const { locale } = useLocale();
  return (
    <div className="flex items-center justify-center space-x-1 bg-rose-100 text-center text-xs leading-loose text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
      <WarningCircleIcon className="mx-1.5 inline-flex size-4" />
      {locale === Locales.KOREAN
        ? "코스모 API 문제로 일부 기록의 시리얼 번호 및 전송 가능 여부가 표시되지 않고 있습니다."
        : "Due to a Cosmo API problem, serial numbers and transferability for some records are not being displayed."}
    </div>
  );
}
