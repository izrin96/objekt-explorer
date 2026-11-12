# Proposal

## Why

Two users reported the same gap from both sides. On 2026-11-10, a trader sent a second offer because a partner's want list still showed Kim Lip after they had received it in a verified trade (T-1628). On 2026-11-12, a list owner asked for received objekts to leave their want list, since they now look each one up and remove it by hand. A want list rule with Skip ones I own already stops wanting what its owner receives; an objekt added by hand stays until removed.

The owner does not want this for every want list: some people keep the entry, or want another copy.

## What Changes

- A want list gains a switch, **Remove objekts I get in a trade**, in the create and edit forms. New want lists start with it on; existing lists stay off.
- When a trade leg is verified (by its transfer, by the receiver marking it received, or by an accepted different copy), the received collection's hand-added entry is deleted from each of the receiver's want lists that have the switch on. Entries a rule added are left to the rule.
- On the trade page, a verified objekt that is still on one of the receiver's want lists with the switch off shows one line naming the list, with **Remove** and **Always remove from this list**. This is how owners of existing lists meet the switch.
- Copy as new list keeps the switch when the copy is a want list.

## Non-goals

- No removal for objekts received outside a trade on the site (a gift, a purchase elsewhere). The trigger is a verified leg, not the wallet's holdings.
- No "stop counting while held" state: an entry is on the list or it is not. It does not return if the objekt is later traded away.
- No quantity per want entry. A person who wants duplicates leaves the switch off.
- No notification when an entry is removed.
- No change to rules, to have, sale or general lists, or to what Trade matches and alerts count.
- Existing lists are not switched on, and no existing entry is removed by the deploy.

## Routes

- `/list/$slug`, `/@{$nickname}/list/$slug` and the Lists tab: the create and edit forms.
- `/trade/mine/$tradeId`: the line on a received objekt.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: adds the switch and what it removes.
- `web-verified-trades`: adds the removal on a verified leg and the trade page line.

## Impact

- `packages/db`: one column, `lists.remove_on_receive boolean not null default false`, in a new migration. Running it needs the owner's approval.
- `packages/api`: `schemas/list.ts` (`createListInputSchema`, `editListInputSchema`, the list view), `services/list/create.ts`, `edit.ts`, `copy.ts`; a removal step called where a leg is marked verified (`services/offer/verify.ts` `acceptCopy`, `confirm.ts`, and the worker's verifier loop); `services/offer/trade-view.ts` for the trade page line; a small write for Remove and Always remove.
- `apps/worker`: the verifier calls the removal for the legs it records.
- `apps/web`: the list form, the trade page's You get rows, strings in en, ko and ja.
- `/rpc`: the two list inputs gain an optional field, so a tab from before the deploy still validates; a create without it makes a list with the switch off, and an edit without it keeps the stored value.
- The worker must be rebuilt on the VPS for transfers it verifies to remove entries; until then only legs settled by the web (Mark as received, an accepted copy) do.
