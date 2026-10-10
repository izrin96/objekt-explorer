## Context

On `feat/trade`:
- `cd0f6269` holds the Match with design: `lists.match_sale`, `offerMatchesWantSql` = "have, or the want list takes sales", and the radio on want lists.
- `e8fbf708` replaced it with the link rule and dropped the column in `20261010152345_drop_want_match_sale`.

None of it is deployed. Production (`main`) has no `match_sale`, and its For you already counts sale lists against every want list. The main specs still describe Match with, because `derive-trades-only-from-link` was never archived.

The agreed behaviour is the `cd0f6269` matching rule with new labels.

## Goals / Non-Goals

**Goals:**
- Return to one per-want-list choice, labelled "Open to: Trade only / Trade or buy".
- Keep the history linear: no force-push and no edits to past migrations.

**Non-Goals:**
- Keeping `e8fbf708`'s `takesSales` / `wantTakesSalesSql` refactor. It encoded the link rule. The `cd0f6269` code already reads the column directly, and its tests cover it.

## Decisions

**Restore the code files from `cd0f6269`, rather than `git revert e8fbf708`.**
- A revert would also delete the drop migration, which would mean editing a past, pushed migration, and the project rule forbids that.
- `git checkout cd0f6269 -- <code paths>` restores exactly the files `e8fbf708` touched, apart from migrations, the openspec folder and messages.
- Messages are restored the same way, then reworded (see below).
- Alternative considered: hand-editing the link rule back into a column rule. It's more diff and more risk, for the same result.

**Re-add the column in a new migration, generated from the schema.**
- Once `schema.ts` is restored, `db:generate` emits `ALTER TABLE "lists" ADD COLUMN "match_sale" boolean DEFAULT true NOT NULL;`.
- Each database applies add → drop → add in one `db:migrate` run, and ends with every existing want list at `true` (Trade or buy). That matches what production does today.
- New want lists get Trade only from the input default (`matchSale: z.boolean().default(false)`), as at `cd0f6269`.

**Old `/rpc` inputs stay valid.**
- `cd0f6269`'s schemas already take `matchSale` (default on create, optional on edit).
- A tab built from `e8fbf708` was never deployed, so no client omits it in a way that matters, and the defaults cover that anyway.

**Labels: keep the message keys and change the text.**
- `list_create_match_*` keys stay, so no code changes for them:

  | Key | en | ja | ko |
  |---|---|---|---|
  | `with_label` | Open to | 取引方法 | 거래 방식 |
  | `trades_label` | Trade only | 交換のみ | 교환만 |
  | `sales_label` | Trade or buy | 交換または購入 | 교환 또는 구매 |

- The two descriptions stay as they are ("Have lists only…", "Have lists and sale lists.").
- `list_create_link_list_desc` returns to its `cd0f6269` text, with no trades-only note.
- Help, in en, ja and ko:
  - `trade_match_help_trades_only`: "A want list open to Trade only never matches a sale list, whether it's yours or theirs."
  - Browse table:
    - WTS "Matches your": "Want lists open to Trade or buy";
    - WTT "Their list": "Have list, or a want list open to Trade only";
    - WTB "Their list": "Want list open to Trade or buy".
    - The other cells are unchanged.

**Remove `openspec/changes/derive-trades-only-from-link/`.**
- It was never archived, so its deltas never reached the main specs.
- Archiving it would write a rule that this change immediately undoes.
- Git history keeps it.

## Risks / Trade-offs

- [The local DB already dropped the column.] → The new migration re-adds it with `true`. Local want lists read Trade or buy, the same as production after the deploy.
- [The extra drop and re-add migrations on the branch.] → Each is a cheap `ALTER` on `lists`, run once before the deploy. Accepted rather than editing pushed migrations.

## Migration Plan

`db:migrate` (needs the user's approval) on local, staging and production before deploying `feat/trade`, with the branch's other migrations. Rollback: a further migration dropping the column, with the code reverted.
