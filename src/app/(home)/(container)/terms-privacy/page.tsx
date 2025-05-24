import { Link } from "@/components/ui";
import React from "react";

export default function TermsPrivacy() {
  return (
    <div className="flex flex-col items-center py-8 gap-6">
      <h2 className="text-lg font-semibold">Terms and Privacy</h2>

      <div className="prose text-fg text-sm">
        <ul>
          <li>
            When you log in with Twitter (X) or Discord, we get your public
            profile info (like your name and username).
          </li>
          <li>We do not post anything or access your private data.</li>
          <li>We do not sell or share your data.</li>
          <li>We only use your info to make the app work.</li>
          <li>You can ask us to delete your data anytime.</li>
          <li>
            Objekt Tracker is open source. Github link{" "}
            <Link
              href="https://github.com/izrin96/objekt-explorer"
              className="underline"
              target="_blank"
            >
              available here
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
