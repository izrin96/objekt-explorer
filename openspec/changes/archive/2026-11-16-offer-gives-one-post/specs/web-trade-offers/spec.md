## MODIFIED Requirements

### Requirement: Recipients who take only what they want
While the recipient has "Only offers with what I want" on (see `web-account`), each You give objekt SHALL be a collection, rules included, on the one want list the offer is held to, on Trade and not empty. That list SHALL be the first of these that applies:

1. An offer that asks for an objekt the recipient did not offer in the countered offer: the want list paired with the offer's post. An offer to a partner with no have or sale list on Trade is on no post: any of their want lists on Trade.
2. A counter that asks for nothing but objekts the recipient offered: any of their want lists on Trade.
3. An offer started from one of the recipient's want lists that none of their have or sale posts pairs with (their Buy post, or the want list a Trade row's You give matches came from), asking for nothing: that want list.
4. An offer asking for nothing on a post: that post's want list.
5. An offer on no post (a partner with no have or sale list on Trade, or a tab loaded before every offer had to ask from one post that names no post): any of their want lists on Trade.

An offer held to a post without a want list (an empty one counts as none) SHALL give no objekts, whether or not it asks for anything: only a top-up. Where any of their want lists counts and they have none on Trade, any give SHALL be taken. Otherwise the send SHALL be refused as not wanted, naming those objekts; an objekt they asked for in a countered offer is exempt from every case.

#### Scenario: Unwanted give refused
- **WHEN** rin.trades has the setting on and the post "doubles" paired with the want list "hunting", and a user's offer on "doubles" asks for one objekt on "doubles" and gives HyeRin 301Z #1203, a collection not on "hunting"
- **THEN** the offer is refused as not wanted, naming #1203, and nothing is sent

#### Scenario: Wanted give sent
- **WHEN** rin.trades has the setting on, and a user's offer on "doubles" asks for one objekt on "doubles" and gives SeoYeon 204Z #88, whose collection is on "hunting"
- **THEN** the offer is sent

#### Scenario: Wanted through a rule
- **WHEN** rin.trades's "hunting" holds a rule that wants every ARTMS Double class, and a user gives one of those collections
- **THEN** the offer is sent

#### Scenario: On another post's want list
- **WHEN** rin.trades has the setting on, also has the post "spares" paired with the want list "wishlist", and a user's offer on "doubles" asks for one objekt on "doubles" and gives a collection only on "wishlist"
- **THEN** the offer is refused as not wanted: only the post's own want list counts

#### Scenario: Post without a want list
- **WHEN** rin.trades has the setting on and the have list "extras" posted alone, and a user's offer on "extras" asks for one objekt on "extras" and gives HyeRin 301Z #1203
- **THEN** the offer is refused as not wanted, naming #1203: an offer on a post without a want list gives no objekts

#### Scenario: Top-up on a post without a want list
- **WHEN** the user's offer on "extras" instead asks for one objekt on "extras" and gives nothing but 6,000 KRW
- **THEN** the offer is sent

#### Scenario: Asks for nothing
- **WHEN** rin.trades has the setting on, and a user's offer with Offer on "doubles" asks for nothing and gives one collection on "hunting" and one only on "wishlist"
- **THEN** the offer is refused as not wanted, naming the "wishlist" give: an offer that asks for nothing is held to its post's want list

#### Scenario: Asks for nothing, wanted
- **WHEN** rin.trades has the setting on, and a user's offer with Offer on "doubles" asks for nothing and gives SeoYeon 204Z #88, on "hunting", for a top-up
- **THEN** the offer is sent

#### Scenario: Asks for nothing on a post without a want list
- **WHEN** rin.trades has the setting on, "extras" posted alone, and "hunting" and "wishlist" on Trade, and a user's offer with Offer on "extras" asks for nothing
- **THEN** any objekt it gives, even one on "wishlist", is refused as not wanted

#### Scenario: From a Buy post
- **WHEN** rin.trades has the setting on and the Buy post "looking for" (a want list leading its own post), and a user's offer started from "looking for" asks for nothing
- **THEN** a give on "looking for" is sent, and a give only on "hunting" is refused as not wanted

#### Scenario: From a Buy post, then an ask
- **WHEN** the user then adds one objekt from "doubles" under You get
- **THEN** the gives are held to "hunting": a give only on "looking for" is refused as not wanted

#### Scenario: Counter asks only for what they offered
- **WHEN** rin.trades, with the setting on, offered HyeRin 301Z #1203, and the user counters, keeping #1203 under You get, asking for nothing else and giving a collection only on "wishlist"
- **THEN** the counter is sent: its gives are checked against every want list on Trade, whatever Offer on reads

#### Scenario: Gives only from an older tab
- **WHEN** a tab loaded before every offer had to ask from one post sends an offer to rin.trades that asks for nothing, names no post, and gives a collection only on "wishlist"
- **THEN** the offer is sent: its gives are checked against every want list on Trade

#### Scenario: No post
- **WHEN** rin.trades has the setting on, no have or sale list on Trade, and the want lists "hunting" and "wishlist" on Trade, and a user's offer gives one collection on each
- **THEN** the offer is sent: an offer on no post may give from any of their want lists on Trade

#### Scenario: Want list kept off Trade
- **WHEN** rin.trades has the setting on and no have or sale list on Trade, and a user's offer gives a collection that is only on rin.trades's want list "private", which is not shown on Trade
- **THEN** the offer is refused as not wanted

#### Scenario: Cash buy
- **WHEN** rin.trades has the setting on, and a user offers nothing under You give for SeoYeon 204Z #537 plus 6,000 KRW
- **THEN** the offer is sent

#### Scenario: Counter gives what they asked for
- **WHEN** rin.trades, with the setting on, offered to take the user's JiWoo 108Z #88, which is on none of rin.trades's want lists, and the user counters, still giving #88 and adding a top-up
- **THEN** the counter is sent

#### Scenario: No want list on Trade
- **WHEN** rin.trades has the setting on, no have or sale list and no want list shown on Trade, and a user's offer gives any objekt they own
- **THEN** the offer is sent

#### Scenario: Posts but no want list on Trade
- **WHEN** rin.trades has the setting on, "extras" as their only post and no want list on Trade, and a user's offer on "extras" gives an objekt
- **THEN** the offer is refused as not wanted

#### Scenario: Open offers stay
- **WHEN** a user's offer giving an unwanted objekt is open, and rin.trades then turns the setting on
- **THEN** the offer stays open, and rin.trades may still accept it

### Requirement: Builder for a want-only recipient
When the rule filters the offer (see Recipients who take only what they want), You give's "Only what they want" SHALL be on and locked from the first frame, and a line SHALL say what it keeps to. It keeps to the want list the rule holds the offer to, and the line names the want list of {list}: the Buy post or want list the builder started from, else the post under Offer on. Where any of their want lists counts, it keeps to all their want lists on Trade, and the line says their want lists. Where the rule holds the offer to a post without a want list, You give SHALL have no Add button and the line SHALL say that {name} takes no objekts on {post} and a top-up can be offered instead. The switch, its line and You give's picker SHALL follow the first ask added under You get, the last one removed, and Offer on when it changes. Offer on itself SHALL keep choosing where You get's asks come from. A pick refused under the rule SHALL be one that can't be sent, "Not on their wants".

#### Scenario: Switch locked on
- **WHEN** the sender opens the builder for rin.trades, who has the setting on and the want list "hunting" on Trade paired with "doubles"
- **THEN** with Offer on "doubles", You give's "Only what they want" is on and can't be turned off, the line reads that rin.trades only takes objekts on the want list of doubles, and the picker shows only collections on "hunting"

#### Scenario: Before the first ask
- **WHEN** rin.trades also has "wishlist" on Trade paired with "spares", Offer on reads "doubles", and You get holds nothing
- **THEN** You give's picker shows only collections on "hunting", never one only on "wishlist", and the line names the want list of doubles

#### Scenario: Changing the post
- **WHEN** the sender changes Offer on from "doubles" to "spares"
- **THEN** the line names the want list of spares, and You give's picker shows only collections on "wishlist"

#### Scenario: Started from a Buy post
- **WHEN** the sender chooses Make offer on rin.trades's Buy post "looking for", and rin.trades has "doubles" then "spares" on Trade
- **THEN** the line reads that rin.trades only takes objekts on the want list of looking for, You give's picker shows only collections on "looking for", and Offer on reads "doubles", where You get's asks would come from

#### Scenario: Buy post start, changing the post
- **WHEN** You get holds nothing and the sender changes Offer on to "spares"
- **THEN** the line still names looking for, and You give's picker still shows only collections on "looking for"

#### Scenario: First ask added
- **WHEN** the sender adds one objekt from "doubles" under You get
- **THEN** the line changes to the want list of doubles and You give's picker shows only collections on "hunting"; removing that ask brings back looking for

#### Scenario: Changing to a post without a want list
- **WHEN** the sender, who did not start from a want list, changes Offer on to rin.trades's "extras", posted alone, whether or not You get holds anything
- **THEN** "Only what they want" stays on and locked, You give has no Add button, and the line reads that extras has no want list, so rin.trades takes no objekts on it, and a top-up can be offered

#### Scenario: Post without a want list, nothing asked
- **WHEN** Offer on reads "extras", posted alone, the sender did not start from a want list, and You get holds nothing
- **THEN** "Only what they want" stays on and locked, You give has no Add button, and the line reads that extras has no want list, so rin.trades takes no objekts on it: a top-up can still be offered

#### Scenario: Gives already on the side
- **WHEN** You give holds picks and the sender changes Offer on to "extras"
- **THEN** the picks stay until Send, where the server refuses them as not wanted and each is outlined with "Not on their wants"

#### Scenario: Counter asking for nothing new
- **WHEN** the sender counters rin.trades's offer, keeping under You get only objekts rin.trades offered
- **THEN** the line reads that rin.trades only takes objekts on their want lists, and the picker shows collections on any of them, whatever Offer on reads

#### Scenario: Partner with no posts
- **WHEN** rin.trades has the setting on, no have or sale list on Trade, and the want lists "hunting" and "wishlist" on Trade
- **THEN** "Only what they want" is on and can't be turned off, the line reads that rin.trades only takes objekts on their want lists, and the picker shows collections on "hunting" or "wishlist"

#### Scenario: Refused on send
- **WHEN** rin.trades removes a collection from "hunting" after the sender picked it, and the sender chooses Send
- **THEN** the server refuses it as not wanted, and that pick is outlined with "Not on their wants" and counted in You give's banner

#### Scenario: Setting off
- **WHEN** the sender opens the builder for a partner with the setting off
- **THEN** "Only what they want" starts off and may be turned on, as before

### Requirement: The post an offer is on
An offer SHALL store its post: the Offer on choice or the post it started from, else the one list its asks fit. An offer that asks for nothing new SHALL be on the post under Offer on too, except two that are on no post: a counter that asks only for objekts the recipient offered, and an offer started from a want list (a Buy post's, or a row's You give matches') that asks for nothing. An offer to a partner with no have or sale list on Trade, one from a client that named no post and asks for nothing new, and one sent across posts before every offer had to ask from one, are on no post. After sending, the offer card and the offer page SHALL read "Offer on {post}" for both people. An offer on no post SHALL show no "Offer on" line and no other mark about posts, and a post deleted later SHALL drop it.

#### Scenario: Both sides see it
- **WHEN** an offer on "doubles" is sent
- **THEN** both the sender's and rin.trades's card in their conversation read "Offer on doubles"

#### Scenario: Gives only
- **WHEN** an offer to rin.trades with Offer on "doubles" gives objekts for a top-up and asks for nothing
- **THEN** both cards read "Offer on doubles"

#### Scenario: Gives only from a Buy post
- **WHEN** an offer started from rin.trades's Buy post "looking for" gives objekts and asks for nothing
- **THEN** neither card reads "Offer on"

#### Scenario: Counter asking for nothing new
- **WHEN** the user counters rin.trades's offer, keeping only objekts rin.trades offered under You get
- **THEN** neither card reads "Offer on", whatever Offer on read in the builder

#### Scenario: Gives only from an older tab
- **WHEN** a tab loaded before every offer had to ask from one post sends an offer that asks for nothing and names no post
- **THEN** neither card reads "Offer on", and its gives are checked against every want list on Trade

#### Scenario: Partner with no lists
- **WHEN** a user asks rin.trades, who has no have or sale list on Trade and lets people ask for anything they hold, for an objekt from their collection
- **THEN** neither card reads "Offer on"

#### Scenario: Post deleted
- **WHEN** rin.trades deletes "doubles" after the offer was sent
- **THEN** neither card reads "Offer on"

#### Scenario: Across posts
- **WHEN** an offer to rin.trades asking from "doubles" and "spares" was sent before every offer had to ask from one post
- **THEN** neither card reads "Offer on" or names rin.trades's posts, and its items, Accept, Decline and Counter are as on any offer

### Requirement: Row matches from one post
Opened from a Trade row's Make offer for a partner with a have or sale list on Trade, when the matches don't come from a Can swap pair, the builder SHALL count You get matches only from the partner's have or sale post with the most of them (on a tie, the row's lead post, then list order), and You give matches only from the partner's want list with the most of them (on a tie, the row's lead post when it is that want list, then list order), and only then choose the direction with more, You get on a tie. When You get is filled, the added-matches line SHALL name that post and Offer on SHALL open on it. When You give wins, You get SHALL stay empty, the line SHALL name that want list, and You give SHALL be held to it as a start (see Recipients who take only what they want). Can swap pairs, whose sides come from one post already, SHALL stay as in Matches added when the builder opens.

#### Scenario: Matches across two posts
- **WHEN** rin.trades's row reads "They have 5 you want" with no Can swap mark, 3 of them on "doubles" and 2 on "spares", and the sender chooses Make offer on the row
- **THEN** the builder opens with the 3 from "doubles" under You get, the line reads "Added from doubles: 3 you get", Offer on reads "doubles", and Send is enabled

#### Scenario: Tie between posts
- **WHEN** rin.trades has 2 matches each on "doubles", the lead post of their row, and "spares"
- **THEN** the builder adds the 2 from "doubles"

#### Scenario: You give wins after the cut
- **WHEN** rin.trades's row reads "They have 4 you want · You have 4 they want" with no Can swap mark, 2 of the 4 on "doubles", the row's lead post, and 2 on "spares", and of the user's 4, 3 are on rin.trades's Buy post "looking for" and 1 on "hunting"
- **THEN** the builder opens with the 3 on "looking for" under You give, nothing under You get, the line "Added from looking for: 3 you give", and You give held to "looking for"

#### Scenario: You give across want lists
- **WHEN** rin.trades's row has no Can swap mark, 1 match under You get on "doubles", and of the user's matches 2 are on "hunting" and 2 on "wishlist", "hunting" first in list order
- **THEN** the builder opens with the 2 on "hunting" under You give and nothing under You get

#### Scenario: Can swap pair unchanged
- **WHEN** the sender's row with rin.trades reads "You can swap 3" through "doubles"
- **THEN** the builder adds that pair's matches as before, all of You get on "doubles"

### Requirement: Where Offer on opens
Offer on SHALL open on the post the builder started from (a post or a Market listing), else the post a row's matches came from, else the row's lead post when it is one of the partner's have or sale lists, else the list of the first You get pick, else the partner's first list. Where the start or the matches name a want list paired with one of those posts, Offer on SHALL open on that post. A start from a want list no post pairs with (a Buy post) opens on the first list that follows.

#### Scenario: From a WTB row
- **WHEN** the sender opens the builder from rin.trades's row, whose lead post is a WTB post, with no matches, and rin.trades has "doubles" then "spares" on Trade
- **THEN** Offer on opens on "doubles"

#### Scenario: You give matches from a paired want list
- **WHEN** the builder opens from rin.trades's row with only You give matches, all on "wishlist", the want list of "spares"
- **THEN** Offer on opens on "spares"

#### Scenario: Counter
- **WHEN** rin.trades counters the user's offer, keeping the objekt the user gave under You get, and the user has "sale1" then "doubles" on Trade
- **THEN** Offer on opens on "sale1", and the kept objekt can be sent whichever post is chosen, since the user offered it
