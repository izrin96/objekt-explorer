import { clientEnv } from "@/env/client";

const Analytics = () => {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <script
      async
      src={clientEnv.VITE_UMAMI_SCRIPT_URL}
      data-website-id={clientEnv.VITE_UMAMI_WEBSITE_ID}
    />
  );
};

export { Analytics };
