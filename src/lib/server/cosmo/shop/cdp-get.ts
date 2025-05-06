import { ofetch } from "ofetch";

type BrowserVersion = {
  webSocketDebuggerUrl: string;
};

export async function getBrowserId() {
  const result = await ofetch<BrowserVersion>(
    `https://${process.env.BROWSER_CDP_HOST!}/json/version`
  );
  return result.webSocketDebuggerUrl.split("/").pop() ?? "";
}

export function getBrowserWsEndpoint(browserId: string) {
  return `wss://${
    process.env.BROWSER_CDP_HOST
  }/devtools/browser/${browserId}?authToken=${process.env.BROWSER_CDP_TOKEN!}`;
}
