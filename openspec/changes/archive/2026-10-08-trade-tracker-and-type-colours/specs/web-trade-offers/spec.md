## MODIFIED Requirements

### Requirement: My trades
`/trade/mine` SHALL list the signed-in user's offers and trades in four groups:
- **Needs you**: open offers sent to the user;
- **Waiting on them**: open offers the user sent;
- **In progress**: accepted trades not yet ended;
- **History**: ended offers and trades, newest first, loading more as the user scrolls.

Each row SHALL show the partner, the O or T number, a one-line summary of both sides and its status. It links to the conversation, or to the trade page for a trade. The status chip SHALL be indigo for a trade in progress, green for a completed trade, and red for a cancelled, failed or expired offer or trade. Other statuses stay neutral. An in-progress trade's row SHALL also show a small ring filled to its share of verified transfers, with "n/m" beside it.

`/trade/mine/$tradeId` SHALL show a trade to its two parties only:
- its status;
- when it was proposed and accepted, as steps of its progress (see `web-verified-trades`);
- each leg: the objekt, from whom, to whom and its state;
- Open chat, and Cancel while cancelling is allowed.

Anyone else SHALL get the not-found page. A signed-out visitor SHALL be sent to `/login?redirect=` with the page's path.

#### Scenario: Needs you
- **WHEN** rin.trades counters the user's offer
- **THEN** My trades lists O-882 under Needs you, with "your turn"

#### Scenario: Not a party
- **WHEN** a third account opens `/trade/mine/1042`
- **THEN** the not-found page is shown

#### Scenario: Progress on a row
- **WHEN** one of a trade's two transfers has verified
- **THEN** its row under In progress shows a ring half filled, "1/2" and an indigo In progress chip
