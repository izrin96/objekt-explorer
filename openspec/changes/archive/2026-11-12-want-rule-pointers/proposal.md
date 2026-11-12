# Proposal

## Why

On 2026-11-12 a user asked for a way to add only the objekts they are missing of one member to a want list. Add rule already does this (any class, any season, the member, Skip ones I own on), but they had not found it. Add rule is offered only in the want list's header, and its dialog's examples name a collection and a class, never a whole member.

## What Changes

- The empty state of the owner's own want list gains a line about rules and an Add rule button beside Browse objekts. It opens the same dialog as the header's button.
- In the Add rule dialog, the example under Class, season and edition also shows the whole-member case: any class and any season, one member.

## Non-goals

- No hint or rule option in the Add to list dialog. `web-lists` keeps "Add to list adds objekts only", and the owner confirmed on 2026-11-12 that no hint is wanted there.
- No new kind of rule and no preset: the fields and what a rule wants are unchanged.
- No change for visitors, or for have, sale and general lists.
- No server change.

## Routes

- `/list/$slug` and `/@{$nickname}/list/$slug`: the list page, its empty state and the Add rule dialog.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: the Add rule requirement gains the empty want list's Add rule, and the second kind's example names the whole-member case.

## Impact

- `apps/web/src/features/list/list-empty.tsx`: a want-list branch for the owner, with its own Add rule dialog.
- `apps/web/messages/{en,ko,ja}.json`: one new string, one changed.
- No API, schema or worker change.
