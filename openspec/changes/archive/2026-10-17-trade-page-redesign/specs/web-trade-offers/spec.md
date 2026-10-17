## MODIFIED Requirements

### Requirement: My trades
`/trade/mine` SHALL list the signed-in user's offers and trades in four groups:
- **Needs you**: open offers sent to the user;
- **Waiting on them**: open offers the user sent;
- **In progress**: accepted trades not yet ended;
- **History**: ended offers and trades, newest first, loading more as the user scrolls.

Each row SHALL show the partner, the O or T number, a one-line summary of both sides and its status. It links to the conversation, or to the trade page for a trade. The status chip SHALL be indigo for a trade in progress, green for a completed trade, and red for a cancelled, failed or expired offer or trade. Other statuses stay neutral. An in-progress trade's row SHALL also show a small ring filled to its share of verified transfers, with "n/m" beside it.

`/trade/mine/$tradeId` SHALL show a trade to its two parties only:
- a link back to My trades;
- its status, and what happens next (see `web-verified-trades`);
- when it was proposed and accepted, as steps of its progress (see `web-verified-trades`);
- each leg under You give or You get: the objekt and its state;
- Open chat, and an actions menu holding Report a problem and Cancel trade (see `web-verified-trades`).

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

#### Scenario: Legs by side
- **WHEN** the user opens a trade where they give HyeRin 301Z #1203 and get SeoYeon 204Z #537
- **THEN** HyeRin 301Z #1203 is under You give and SeoYeon 204Z #537 under You get, with no from and to column

### Requirement: Objekt data in monospace
On Trade pages, in offer cards in chat and in the offer builder, objekt data SHALL be set in the monospace font with tabular figures:
- O and T numbers;
- serials, with any "~" estimate mark;
- the "n/m" share of verified transfers;
- top-up amounts;
- the numbers in a reputation line (see `web-verified-trades`);
- counts shown as numbers beside a label, such as a section's "(N)";
- transaction hashes;
- the partner's name in the trade page's header, which is often an address.

Other names of people, and names of lists, collections and members, and sentences around these values, SHALL stay in the body font.

#### Scenario: My trades row
- **WHEN** the user sees an in-progress trade row with one of two transfers verified
- **THEN** "T-1042" and "1/2" are monospace, and the partner's name and the summary are not

#### Scenario: Reputation line
- **WHEN** a reputation line reads "31 verified · 100% · since Mar 2025"
- **THEN** "31" and "100%" are monospace and the words are not

#### Scenario: Trade page header
- **WHEN** the user opens a trade with rin.trades
- **THEN** "rin.trades" in the header is monospace, while names in the banner's sentences are not
