# Tasks

## 1. Copy

- [x] 1.1 In `apps/web/messages/en.json`, set these values (keys unchanged). Verify: `bun run typecheck --filter=web` (it compiles Paraglide), `bun run lint --filter=web` and `bun run build --filter=web` pass.
  - `trade_mutual_only`: "Can swap"
  - `trade_section_mutual`: "Can swap"
  - `trade_help_any`: "For you shows posts with at least one match. Turn on Can swap to see WTT posts from people you can swap with, best first."
  - `trade_help_mutual_heading`: "What counts toward Can swap"
  - `trade_help_mutual_score`: "Someone's swap score is how many you can swap: the smaller of what they have that you want and what you have that they want."
  - `trade_help_mutual_no_sale`: "A sale list never counts toward Can swap: a sale isn't a swap."
  - `trade_matches_link_label`: "Find matches: {count} people you can swap with"
  - `trade_browse_no_mutual_list_title`: "No one can swap with you for {list}"
  - `trade_browse_no_mutual_title`: "No one can swap with you"
  - `trade_composer_match_both`: "Matches people looking for what you offer, and people offering what you look for. When both ways match, they show under Can swap."
- [x] 1.2 In `ko.json`, set the same keys. Verify: the same checks as 1.1.
  - `trade_mutual_only` / `trade_section_mutual`: "교환 가능"
  - `trade_help_any`: "추천에는 일치가 하나 이상 있는 게시물이 표시됩니다. '교환 가능'을 켜면 나와 교환할 수 있는 사람의 WTT 게시물을 잘 맞는 순으로 표시합니다."
  - `trade_help_mutual_heading`: "교환 가능에 포함되는 것"
  - `trade_help_mutual_score`: "교환 점수는 서로 교환할 수 있는 수입니다: 상대가 가진 것 중 내가 원하는 수와 내가 가진 것 중 상대가 원하는 수 중 작은 쪽입니다."
  - `trade_help_mutual_no_sale`: "판매 목록은 교환 가능에 포함되지 않습니다: 판매는 교환이 아닙니다."
  - `trade_matches_link_label`: "매치 찾기: 교환할 수 있는 상대 {count}명"
  - `trade_browse_no_mutual_list_title`: "{list} 목록으로 교환할 수 있는 사람이 없습니다"
  - `trade_browse_no_mutual_title`: "교환할 수 있는 사람이 없습니다"
  - `trade_composer_match_both`: "내놓는 것을 찾는 사람, 찾는 것을 내놓은 사람과 매치됩니다. 양쪽 모두 맞으면 교환 가능에 표시됩니다."
- [x] 1.3 In `ja.json`, set the same keys. Verify: the same checks as 1.1.
  - `trade_mutual_only` / `trade_section_mutual`: "交換できる"
  - `trade_help_any`: "おすすめには、一致が1つ以上ある投稿が並びます。「交換できる」をオンにすると、あなたと交換できる人のWTT投稿を一致の多い順に表示します。"
  - `trade_help_mutual_heading`: "「交換できる」に数えるもの"
  - `trade_help_mutual_score`: "交換スコアは交換できる数です：相手が持っていてあなたが欲しい数と、あなたが持っていて相手が欲しい数の小さい方です。"
  - `trade_help_mutual_no_sale`: "販売リストは「交換できる」に数えません：販売は交換ではないためです。"
  - `trade_matches_link_label`: "マッチを探す：交換できる相手{count}人"
  - `trade_browse_no_mutual_list_title`: "{list} で交換できる人はいません"
  - `trade_browse_no_mutual_title`: "交換できる人はいません"
  - `trade_composer_match_both`: "出すものを探している人、探しているものを出している人とマッチします。双方向でマッチすると「交換できる」に表示されます。"

## 2. Check

- [x] 2.1 Search the three message files for any value still showing Mutual to the viewer (`Mutual`, `mutual`, `상호`, `相互`), and the web source for a hard-coded "Mutual" in rendered text. Verify: no hits besides keys and code identifiers, listed in the apply summary.
- [x] 2.2 Open `/trade/for-you` signed in on the local dev server, in en, ko and ja (read path). Verify: the toggle reads "Can swap N" / "교환 가능 N" / "交換できる N", the section heading under Any matches it, the help shows the new lines, and the toggle still sets `match=mutual` in the URL.
- [x] 2.3 Run `bun run check` and `openspec validate rename-mutual-to-can-swap --strict`. Verify: both pass. No package `AGENTS.md` changes, because no convention or workflow changed. State that in the summary.

## Workflow follow-up

- `/opsx:archive rename-mutual-to-can-swap` once applied and checked.
