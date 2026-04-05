import Script from "next/script";

import { clientEnv } from "@/lib/env";

export default function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <Script
      strategy="afterInteractive"
      async
      src={clientEnv.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
      data-website-id={clientEnv.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
    />
  );
}
