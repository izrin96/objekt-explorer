# Tasks

## 1. Strings

- [x] 1.1 Add `list_empty_want_hint` and extend `rule_kind_set_example` in `apps/web/messages/en.json`, `ko.json` and `ja.json`. Verify `bun run paraglide:compile` in `apps/web` succeeds, and that lint, typecheck and build pass for `web`.

## 2. Empty want list

- [x] 2.1 In `list-empty.tsx`, give the owner of a want list its own empty state before the bound-list branch: the new hint, Browse objekts and Add rule, which opens a `RuleDialog` mounted there with the props the header passes. Load `vercel-react-best-practices` before the edit. Verify lint, typecheck and build pass for `web`.
- [x] 2.2 Check in the running app against the local database: an empty want list of the signed-in test account shows the hint and both buttons, Add rule opens the dialog with the new example, an empty have list shows no Add rule, and a visitor sees neither. Check at phone width and in ko and ja. Verify lint, typecheck and build pass for `web`.
- [x] 2.3 State in the final report whether any `AGENTS.md` convention changed (expected: none). Verify lint, typecheck and build pass for `web`.

## Workflow follow-up

- Archive the change once it is reviewed and deployed.
- Move "Make want list rules easier to find" out of `design/backlog.md`.
