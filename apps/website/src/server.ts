import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "./paraglide/server.js";

export default {
  fetch(request: Request) {
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
