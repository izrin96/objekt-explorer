## MODIFIED Requirements

### Requirement: Trade feed posts named by post id
Each post of `GET /trade/people` SHALL carry `id`, an integer that names the post, never null, unique in the response, and the same while the post is: a post stays the same post when its owner edits it, whichever of its lists the edit swaps or drops. A post SHALL carry no other field that repeats its `id`. A post's sides SHALL come in the order have, sale, want, so the first side is the anchor list; each side's `list.id` SHALL keep naming its list.

#### Scenario: A post's id and its anchor
- **WHEN** a client requests `GET /api/v1/trade/people`, and a person's post pairs have list 812 with want list 813
- **THEN** that post's `id` is the post's own id, a number other than 812 or 813, the post carries no `postId`, and its first side's `list.id` is 812

#### Scenario: Anchor changes, post id stays
- **WHEN** a person's Buy post on want list 813 has `id` 1000123, and the person then pairs have list 900 with it
- **THEN** the next response shows that post with `id` 1000123 and first side `list.id` 900

#### Scenario: Edit post swaps the have list, post id stays
- **WHEN** a person's post pairing have list 812 with want list 813 has `id` 1000200, and the person edits it to swap 812 for have list 950
- **THEN** the next response shows that post with `id` 1000200 and first side `list.id` 950

#### Scenario: Edit post drops the have list, post id stays
- **WHEN** a person's post pairing have list 812 with want list 813 has `id` 1000200, and the person edits it into a Buy post of 813 alone
- **THEN** the next response shows the Buy post with `id` 1000200 and one side, `list.id` 813
