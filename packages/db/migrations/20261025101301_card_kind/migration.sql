-- An objekt card in message.card now carries kind "objekt", as a post card carries "post".
UPDATE "message"
SET "card" = "card" || '{"kind":"objekt"}'::jsonb
WHERE "card" IS NOT NULL AND jsonb_typeof("card") = 'object' AND NOT ("card" ? 'kind');
--> statement-breakpoint
-- A report excerpt entry keeps either kind of card in "card" (a post card was its own "post"),
-- and always has "offer" and "unsent".
UPDATE "report"
SET "excerpt" = (
  SELECT jsonb_agg(
    (e - 'post')
      || jsonb_build_object(
        'card',
        CASE
          WHEN jsonb_typeof(e -> 'post') = 'object'
            THEN jsonb_build_object('kind', 'post', 'listId', e -> 'post' -> 'listId')
          WHEN jsonb_typeof(e -> 'card') = 'object' AND NOT ((e -> 'card') ? 'kind')
            THEN (e -> 'card') || '{"kind":"objekt"}'::jsonb
          ELSE COALESCE(e -> 'card', 'null'::jsonb)
        END,
        'offer', COALESCE(e -> 'offer', 'null'::jsonb),
        'unsent', COALESCE(e -> 'unsent', 'false'::jsonb)
      )
    ORDER BY ord
  )
  FROM jsonb_array_elements("excerpt") WITH ORDINALITY AS entries(e, ord)
)
WHERE jsonb_typeof("excerpt") = 'array' AND jsonb_array_length("excerpt") > 0;
