import { CardsThreeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function BrowseIntro({
  forYou,
  signedIn,
  onNew,
}: {
  forYou: boolean;
  signedIn: boolean;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="text-muted-foreground text-sm text-pretty max-md:hidden">
        {forYou ? m.trade_for_you_description() : m.trade_browse_description()}
      </p>
      {/* on Browse, New post lives in the Your posts row */}
      {signedIn && forYou ? (
        <Button variant="outline" size="sm" onClick={onNew}>
          <CardsThreeIcon />
          {m.trade_new_post()}
        </Button>
      ) : signedIn ? null : (
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/login" search={{ redirect: "/trade" }} />}
        >
          <CardsThreeIcon />
          {m.trade_new_post()}
        </Button>
      )}
    </div>
  );
}
