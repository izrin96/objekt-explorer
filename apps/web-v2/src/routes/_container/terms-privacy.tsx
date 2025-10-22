import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/terms-privacy")({
  component: RouteComponent,
  head: () => ({
    meta: seo({ title: "Terms and Privacy" }),
  }),
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h2 className="font-semibold text-lg">Terms and Privacy</h2>

      <div className="prose text-fg text-sm">
        <ul className="list-disc">
          <li>
            When you log in with Twitter (X) or Discord, we get your public profile info (like your
            name and username).
          </li>
          <li>We do not post anything or access your private data.</li>
          <li>We do not sell or share your data.</li>
          <li>We only use your info to make the app work.</li>
          <li>You can ask us to delete your data anytime.</li>
          <li>
            Objekt Tracker is open source. Github link{" "}
            <a
              href="https://github.com/izrin96/objekt-explorer"
              className="underline"
              target="_blank"
              rel="noopener"
            >
              available here
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
