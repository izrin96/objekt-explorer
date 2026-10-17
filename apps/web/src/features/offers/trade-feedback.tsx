import { MinusIcon, ThumbsDownIcon, ThumbsUpIcon, type Icon } from "@phosphor-icons/react";
import { type TradeView as Trade, TRADE_RATINGS, type TradeRating } from "@repo/api/schemas/offer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { invalidateOfferLists } from "./queries";
import { offerRefusalOf, offerRefusalText } from "./refusal";
import { SegmentedChoice } from "./segmented-choice";

const RATING_ICON: Record<TradeRating, Icon> = {
  positive: ThumbsUpIcon,
  neutral: MinusIcon,
  negative: ThumbsDownIcon,
};

const RATING_LABEL: Record<TradeRating, () => string> = {
  positive: m.offer_rating_positive,
  neutral: m.offer_rating_neutral,
  negative: m.offer_rating_negative,
};

/** The rating control and its error line, inside the completed and failed banners. */
export function Feedback({ trade, name }: { trade: Trade; name: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const rate = useMutation(
    orpc.offer.rate.mutationOptions({
      // a quick change of mind is sent after the one before it, never beside it
      scope: { id: `rate-${trade.id}` },
      onSuccess: () => {
        setError(null);
        return invalidateOfferLists(queryClient);
      },
      onError: (failure) => {
        const refusal = offerRefusalOf(failure);
        setError((refusal ? offerRefusalText(refusal, "") : null) ?? m.offer_rating_error());
        void invalidateOfferLists(queryClient);
      },
    }),
  );
  const value = rate.isPending ? rate.variables.rating : trade.rating;
  const title =
    trade.status === "failed"
      ? m.offer_rating_title_failed({ name })
      : m.offer_rating_title({ name });

  return (
    <div className="flex flex-col gap-1.5">
      {trade.status === "failed" ? <p className="text-xs text-pretty">{title}</p> : null}
      <SegmentedChoice
        label={title}
        variant="outline"
        options={TRADE_RATINGS.map((rating) => {
          const RatingIcon = RATING_ICON[rating];
          return {
            value: rating,
            label: RATING_LABEL[rating](),
            icon: <RatingIcon aria-hidden weight={rating === value ? "fill" : "regular"} />,
          };
        })}
        value={value}
        className="grid w-full max-w-sm grid-cols-3 *:px-1"
        onChange={(rating) => {
          if (rating !== value) rate.mutate({ tradeId: trade.id, rating });
        }}
      />
      <p role="alert" className="text-destructive-foreground text-xs empty:hidden">
        {error}
      </p>
    </div>
  );
}
