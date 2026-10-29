## Why

`online-presence` counts a person as online while any signed-in tab of theirs is open, so a tab left open all day shows a green dot to people who then message and wait. The dot should say "around right now", not "has a tab somewhere". This change adds an idle state the browser works out by itself. Nobody has to pick a status; a picker would go stale the same way.

## What Changes

- **Idle.** An online person with no activity in any of their tabs for 10 minutes shows as idle. Activity means a tab in front with a click, a key, a scroll, a touch or pointer movement. A hidden tab counts as no activity.
- **The idle dot.** It sits in the same place and at the same size as the online dot, but in the warning (amber) colour, with "Idle" as its text alternative. The thread header says "Idle" where it says "Online".
- **Back to online.** The first activity after idling makes the person online again. Viewers see it by their next check, within 60 seconds.
- **The same rules decide who sees it.** Idle is a kind of online, so the switch, blocks and the signed-out rule from `online-presence` all apply unchanged. A person who is off shows neither dot.
- **Fails toward online.** When activity can't be read, an online person shows as online, as today, rather than idle.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `web-presence`: adds the Idle requirement. The capability is created by `online-presence`, which must be archived before this change.

## Routes

`/messages`, `/trade`, `/trade/for-you`, `/@<name>`: the surfaces that already show the dot.

## Non-goals

- A status picker (Online, Idle, Do not disturb, Invisible). The switch in General stays the only control.
- Idle per device or per tab. A person is idle only when every tab is idle.
- "Idle for 2 h" or "last active" times.
- A different idle threshold per person.
- Telling viewers at once through the socket. They still poll.

## Impact

- `packages/api`:
  - a `presence.active` procedure that marks the caller active in Redis for 10 minutes, rate limited;
  - `onlineAmong` reads those marks for the people who are online, and `presence.online` returns `idle` beside `online`;
  - the pure parts (idle from online plus active marks, and the Redis key), with tests.
- `apps/web`:
  - an activity tracker beside the poller that sends `presence.active` at most once a minute while the person is active;
  - the store keeps idle ids;
  - `OnlineAvatar` and the thread header show the idle dot and "Idle";
  - en/ja/ko messages.
- No database migration and no Centrifugo config change. Valkey (`REDIS_URL`) holds the activity marks.
- Ordering: archive `online-presence` before this change.
