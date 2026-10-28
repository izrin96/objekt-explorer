## MODIFIED Requirements

### Requirement: Matches added when the builder opens
Opened from a Trade row's Make offer, the builder SHALL add the sender's matches with the partner before it shows its sides, chosen by the rule the row's chip follows (see `web-trade-browse` Matches to the signed-in viewer):
- when the sender can swap with the partner (the row reads "You can swap N"), only the matches inside the pair of posts that score counts: You give gets one copy of each collection on the sender's post there that the partner's post wants, and You get one of each on the partner's post there that the sender's post wants;
- otherwise, only the direction with more matches, swaps and sales alike: one copy of each collection the sender has that the partner wants under You give, or one of each the partner has that the sender wants under You get, the other side left empty. When both directions match equally, You get SHALL be filled.

The matches SHALL be read live, by the rules and the Compare with list the row counts with, up to 50 a side. What may be sent is not narrowed: the pickers still offer every list on Trade.

#### Scenario: A person the sender can swap with
- **WHEN** the sender's post P2 pairs have list "yooyeon spares" with want list "hyerin and kaede", jun.p's post holds Hyerin 302Z and wants Yooyeon 205Z, jun.p also holds 3 DCOs that the sender's other post P1 wants through its rule, and the sender chooses Make offer on jun.p's row, which reads "You can swap 1"
- **THEN** the builder opens with Yooyeon 205Z under You give and Hyerin 302Z under You get, and none of the DCOs

#### Scenario: A person who matches both ways across posts
- **WHEN** mina.k holds 2 DCOs that the sender's post P1 wants through its rule and wants Yooyeon 205Z from the sender's post P2, so her row reads "They have 2 you want · You have 1 they want" with no Can swap mark, and the sender chooses Make offer on her row
- **THEN** the builder opens with the 2 DCOs under You get and nothing under You give, and the line reads "Added 2 you get from your matches"

#### Scenario: From a Trade row
- **WHEN** rin.trades's row reads "They have 5 you want · You have 3 they want" with "No swap · buy or sell", and the sender chooses Make offer on it
- **THEN** the builder opens with 5 under You get and nothing under You give

#### Scenario: Equal both ways
- **WHEN** a person's row reads "They have 2 you want · You have 2 they want" with no Can swap mark, and the sender chooses Make offer on it
- **THEN** the builder opens with 2 under You get and nothing under You give

#### Scenario: Under Compare with
- **WHEN** the sender has Compare with set to their want list "ARTMS wants" on Browse, and chooses Make offer on rin.trades's row, which reads "They have 3 you want" only
- **THEN** You get holds only the collections on "ARTMS wants" that rin.trades has, as the row counted them

#### Scenario: Over the limit
- **WHEN** the sender can swap with rin.trades inside one pair of posts, the sender's post there has 60 collections rin.trades's post wants, and rin.trades's post has 5 the sender's post wants
- **THEN** You give holds 50 of them, the line says more matched than fit, and the side limit doesn't keep Send disabled

#### Scenario: Adding what was left out
- **WHEN** the builder opened for mina.k with only You get filled
- **THEN** the sender can still add Yooyeon 205Z, or anything else on their lists, under You give, and the offer sends with it

### Requirement: Matches of one post
From Make offer on this post, or a conversation whose newest card is the partner's post card with a match, the builder SHALL add only matches through that post's lists: under You get those on its have or sale list, under You give those on its want list. When the sender can swap with the partner and that post is the partner's half of the pair the score counts, the builder SHALL add that pair's matches, as from the row; otherwise it SHALL add only the direction with more of the post's matches, You get on a tie. You get's picker SHALL open on the post's have or sale list, as from a Market listing, else on All their lists. What may be sent is not narrowed. The line SHALL name the post's list.

#### Scenario: One post of two
- **WHEN** rin.trades has the WTT post "doubles" and "wants", and the WTS post "spares", open to swaps, which reads "2 you want", rin.trades's row reads "You can swap 3" through "doubles" and the sender's post "extras" and "binary hunt", and the sender chooses Make offer on this post on "doubles"
- **THEN** the builder opens with the 3 the pair swaps under each side, none from "spares" or through the sender's other posts, the line reads "Added from doubles: 3 you give and 3 you get", and You get's picker opens on "doubles"

#### Scenario: A post that matches both ways across the sender's posts
- **WHEN** rin.trades's WTT post "doubles" has 2 collections the sender's post P1 wants and wants 1 on the sender's post P2, rin.trades is not Can swap through it, and the sender chooses Make offer on this post on "doubles"
- **THEN** the builder opens with the 2 under You get, nothing under You give, and the line reads "Added from doubles: 2 you get"

#### Scenario: Another post of a Can swap person
- **WHEN** rin.trades's row reads "You can swap 3" through the post "doubles", rin.trades also has the WTS post "spares", open to swaps, which reads "2 you want", and the sender chooses Make offer on this post on "spares"
- **THEN** the builder opens with the 2 under You get, nothing under You give, and none from "doubles"

#### Scenario: WTB post
- **WHEN** jun.k has the WTT post "extras" and the WTB post "hunting", which reads "2 you have", and the sender chooses Make offer on this post on "hunting"
- **THEN** the builder opens with 2 under You give, nothing under You get, the line "Added from hunting: 2 you give", and You get's picker on All their lists

#### Scenario: From a conversation with a post card
- **WHEN** the sender opens Make offer in their conversation with rin.trades, whose newest card is the post card for "doubles" with "They have 2 you want"
- **THEN** the builder opens with the matches through "doubles" and its want list read now, chosen by the same rule, which may differ from the 2 saved on the card, and the line names "doubles"

#### Scenario: Asking past the post
- **WHEN** the builder opened from "doubles", and the sender switches You get's List to "spares" and adds an objekt from it
- **THEN** the offer sends with that objekt
