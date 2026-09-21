import "@/styles/app.css";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { router } from "@/router";

// the profile header scrolls past the banner on mount; the browser's own
// restore would undo that on a hard load
history.scrollRestoration = "manual";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
