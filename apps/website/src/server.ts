import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "./paraglide/server.js";

export default {
  fetch(request: Request) {
    return paraglideMiddleware(request, async () => {
      const response = await handler.fetch(request);
      response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      return response;
    });
  },
};
