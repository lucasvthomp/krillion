# Krillion

Krillion is a browser trivia game that draws seven distinct prompts for each game. Players get three seconds to read each prompt and 25 seconds to answer. A wrong guess leaves the clock running at its normal pace. The answer bank supplies the names, rarity tiers and scores, and every point adds ten metres to the dive.

The animated ocean fills the screen and descends as the score increases. The scene respects the browser's reduced-motion preference.

## Multiplayer

Choose Multiplayer, enter a display name, and create a room or join with its six-character code. A room supports 2–12 players. Everyone gets the same prompts and a shared timer. Each round ends when everyone answers or passes, or when the timer expires. The host advances the round leaderboard. After the final leaderboard, each player can return to the same lobby with **Play again**. The host can start another dive once the players still in the room are back in the lobby.

Rooms use [PeerJS Cloud](https://peerjs.com/server/cloud) for WebRTC signaling. The host's browser runs the game and validates answers. Room codes last as long as the host keeps the room open. WebRTC connectivity between players is required.

## Play locally

Run `node scripts/serve.mjs` and open [the local game](http://127.0.0.1:8080/krillion/). The static site needs a modern browser with gzip decompression support.

## GitHub Pages

The site is ready to publish from `main` and the `/docs` directory using GitHub Pages’ **Deploy from a branch** setting. The prompt index and answer files ship with the site and load automatically. All scoring runs in the browser.

## Answer bank

The supplied dataset identifies itself as an export of Krillion public reveal data. The site preserves the prompt text, category, accepted answer text, tier, and score from that export. It samples prompts by distinct wording. When the same wording appears in more than one source game, it randomly chooses one matching answer bank.

The coverage build checks every prompt against [the coverage rules](scripts/answer-coverage-rules.mjs). It can add answers and alternate names from a scoped [Wikidata CC0](https://www.wikidata.org/wiki/Wikidata:Licensing) collection, an equivalent prompt, or a narrower prompt whose answers also qualify. Direct matches take precedence over aliases, and ambiguous aliases are skipped.

Imported Wikidata answers are graded into Plankton, Schooler, Rare, or Deep Cut using their coverage across Wikimedia sites relative to other eligible entries for that prompt. Sitelink coverage is an estimate of familiarity. Transfers from an existing prompt reuse the donor's score with two adjustments. A donor jackpot becomes Deep Cut, and Too Clever becomes Schooler when the recipient prompt differs. Original scores outside the reviewed families and hand-picked jackpots are preserved.

[Reviewed answer families](scripts/answer-families.mjs) give a common answer and its recognized varieties separate scores. The scope is set per prompt so a group name can count on a broad question without counting as a particular species. Food families use established dish names, including preparations documented by [chef Alfred Prasad](https://www.greatbritishchefs.com/features/classic-indian-takeaway-curries). The rodent family uses [the ITIS prairie dog classification](https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=930249). The same rules accept ordinary singular and plural forms in applicable prompts and offer a confirmation for close typos.

The [coverage report](scripts/answer-coverage.json) lists original and updated counts, alternate names, and the evidence used for every prompt. Prompts marked `needs-specific-source` still need a source that verifies their exact wording.

[Reviewed additions](scripts/answer-additions.mjs) cover gaps found by spot-checking unrelated prompts. Each new answer uses an existing rarity, and an alternate name inherits the existing answer’s score. The console pass uses model names from [Nintendo](https://en-americas-support.nintendo.com/app/answers/detail/a_id/5066), [PlayStation](https://www.playstation.com/en-us/ps5/buy-now/), and [Xbox](https://www.xbox.com/en-us/consoles/xbox-series-x). Tree species include common and scientific names from the [USDA Forest Service](https://www.fs.usda.gov/pnw/pubs/pnw_rb168.pdf).

To rebuild the static answer files after updating the dataset, run the following from the repository root.

```powershell
node scripts/build-bank.mjs 'C:\path\to\krillion-answers.jsonl.gz'
node scripts/enrich-bank.mjs
```

The enrichment uses checked-in source and familiarity snapshots, so rebuilding and playing require no Wikidata requests. After refreshing the sources, run `node scripts/fetch-answer-familiarity.mjs` to retrieve sitelink counts for new entities. Individual additions record a Wikidata entity ID or a donor prompt ID. The original archive is kept separately. GitHub Pages exposes the packaged answer bank as public site files.
