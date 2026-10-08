import { type TradeView as Trade, TRADE_RATINGS, type TradeRating } from "@repo/api/schemas/offer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { untilLabel } from "@/features/chat/format";
import { orpc } from "@/lib/orpc";
import { TONE_EDGE, TONE_FILL } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { invalidateOfferLists } from "./queries";
import { offerRefusalOf, offerRefusalText } from "./refusal";
import { SegmentedChoice } from "./segmented-choice";

const RATING_LABEL: Record<TradeRating, () => string> = {
  positive: m.offer_rating_positive,
  neutral: m.offer_rating_neutral,
  negative: m.offer_rating_negative,
};

export function Feedback({
  trade,
  name,
  hydrated,
}: {
  trade: Trade;
  name: string;
  hydrated: boolean;
}) {
  const queryClient = useQueryClient();
  const headingId = useId();
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

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        trade.canRate && [TONE_EDGE.success, TONE_FILL.success],
      )}
    >
      <h3 id={headingId} className="text-sm font-medium">
        {trade.status === "in_progress"
          ? m.offer_rating_pending_title()
          : m.offer_rating_title({ name })}
      </h3>
      <SegmentedChoice
        label={m.offer_rating_title({ name })}
        options={TRADE_RATINGS.map((rating) => ({ value: rating, label: RATING_LABEL[rating]() }))}
        value={value}
        disabled={!trade.canRate}
        className="grid w-full grid-cols-3 *:px-1"
        onChange={(rating) => {
          if (rating !== value) rate.mutate({ tradeId: trade.id, rating });
        }}
      />
      <p className="text-muted-foreground text-xs text-pretty">
        {trade.status === "in_progress"
          ? m.offer_rating_pending()
          : trade.canRate && trade.rateUntil && hydrated
            ? m.offer_rating_until({ time: untilLabel(trade.rateUntil) })
            : !trade.canRate
              ? m.offer_rating_closed()
              : null}{" "}
        {m.offer_rating_private()}
      </p>
      <p role="alert" className="text-destructive-foreground text-xs empty:hidden">
        {error}
      </p>
    </section>
  );
}
