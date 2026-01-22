import Script from "next/script";

import { env } from "@/env";

const Analytics = () => {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <Script
      strategy="afterInteractive"
      async
      src={env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
      data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
    />
  );
};

export { Analytics };
