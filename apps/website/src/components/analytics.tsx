import { clientEnv } from "@/lib/env/client";

export default function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <script
      async
      src={clientEnv.VITE_UMAMI_SCRIPT_URL}
      data-website-id={clientEnv.VITE_UMAMI_WEBSITE_ID}
    />
  );
}
