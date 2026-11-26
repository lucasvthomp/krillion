# Krillion

Krillion is a browser trivia game that draws seven distinct prompts for each game. Prompts are dealt like a shuffled deck: the browser remembers which prompts it has played, and none comes back until every other prompt has had a turn. In multiplayer the host's browser deals. Players get three seconds to read each prompt and 25 seconds to answer. A wrong guess leaves the clock running at its normal pace. The answer bank supplies the names, rarity tiers and scores, and every point adds ten metres to the dive.

The animated ocean fills the screen and descends as the score increases. Each accepted answer sinks as deep as it is worth, so a Rare answer sinks 600 m. The answer's name drops from the current depth while the depth readout counts up. Dashed lines mark the depth each rarity tier would reach from that start, and each lights up in its tier's color as the answer passes it. The result shows once the answer stops. Labels at the screen edges mark real things found at each depth, from the Mary Rose at 11 m to the Titanic at 3,800 m and the deepest shipwreck ever found at 6,865 m, and wrecks and animals appear as faint shapes beside their labels. A ruler on the right edge shows the depth. A label that would cover the text on screen fades out, and the depth readout fades while a tier label passes beneath it. The [fact list](docs/landmarks.mjs) gives approximate depths. In multiplayer, the leaderboard waits until the player's dive finishes. The scene respects the browser's reduced-motion preference.

## Multiplayer

Choose Multiplayer, enter a display name, and create a room or join with its six-character code. A room supports 2–12 players. Everyone gets the same prompts and a shared timer. Each round ends when everyone answers or passes, or when the timer expires. The leaderboard shows players’ accepted answers in their rarity colors, and the host advances the round. Each player can search all seven answer banks on the final screen or return to the same lobby with **Play again**. The host can start another dive once the players still in the room are back in the lobby.

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

The [prompt-by-prompt review](ANSWER-REVIEW.md) records the guesses checked, the gains, and the reason each bank stayed unchanged. It includes a spot check for every prompt and full rosters for selected closed questions. The enrichment script applies the [reviewed guesses](scripts/answer-sweep.txt) when the prompt wording matches. Run `node scripts/report-answer-sweep.mjs 9a0e0d0` after rebuilding to compare with the release before the sweep.

The [catalog review](CATALOG-REVIEW.md) records a later expansion from taxonomies, geographic catalogs, and noun senses. The [source credits](docs/bank/SOURCES.txt) identify the editions and licenses. The packaged catalog snapshot makes the build self-contained. To regenerate it from source downloads, place the files listed in the credits in a local folder and pass that folder to `node scripts/build-answer-catalogs.mjs`, then run the enrichment script.

### Alternate names and last names

Answers accept common alternate names, so USA, US and America all count as United States. Two sources supply them. The [alias table](scripts/answer-alias-table.mjs) lists hand-picked groups such as UK, Britain and Great Britain, or Burma and Myanmar. The [Wikidata alias snapshot](scripts/answer-aliases.json.gz) matches each answer name to the Wikidata item with that English label and the most Wikipedia sitelinks, then keeps that item's English aliases. It covers every answer outside the Deep Cut tier and every answer in banks with 3,000 answers or fewer. A Wikidata alias of three letters or fewer must be a capitalised abbreviation. Because a name such as Don or Florentine can belong to several unrelated things, Wikidata names are used only when the matched item is the same kind of thing as other answers to that prompt, using its "instance of" and "subclass of" types. Prompts that judge spelling, such as "starts with S", take no alternate names. An alternate name inherits its answer's score and is skipped when another answer in the same bank already uses it.

The game also accepts St, Mt and Ft for Saint, Mount and Fort, and the reverse, and distances written as 200m, 5k or 10 kilometers for 200 metres, 5000 metres and 10000 metres. A guess of six letters or more with up to two typos offers the answer it is closest to, if the answer starts with the same letter. When a spelling fits one well-known answer and otherwise only Deep Cuts, the well-known one counts without a choice, so Federer is Roger Federer. On prompts about people or characters, a last name on its own counts, such as Lincoln for Abraham Lincoln or da Vinci for Leonardo da Vinci. On prompts about characters, villains or protagonists, a first name counts too, such as Michael for Michael Scott, but only for characters scored Schooler or lower, and a first name gets no typo help. When a last name or alternate name fits several answers, such as Williams on a tennis prompt, the player picks the one they meant. When more than six answers fit, the game asks for more of the name.

Guesses are also compared word by word, ignoring word order, "the", "of" and endings such as -s and -ed. "Bruce Wayne" matches the alternate name "Wayne, Bruce", and "whip cream" matches Whipped cream. Part of a longer name counts when only one answer contains it, so IWC matches IWC Schaffhausen and Tony Stark matches Iron Man. A single word is accepted only when it is an abbreviation in the name, typed exactly, or a word of five or more letters from a two-word name that no other answer uses. That word must be the last one, as in Rhapsody for Bohemian Rhapsody, unless the other word only names the kind of thing, as in Galapagos for Galapagos tortoise. So soccer does not count as Soccer field, and Japan does not count as one of 62 video games with Japan in the title. A variety of an answer always counts: up to three describing words before an answer, such as "south american gray fox" or "miniature poodle", score as that answer when the bank does not list the variety itself. Otherwise a guess that contains an answer must be mostly that answer, so a list of several answers in one guess does not count, unless the other words only name its kind, as in "pistachio nut". Prompts that judge spelling skip word matching. Words in prompts such as "a shade of green" or "a penguin species" are treated like category names, so Olive counts for Olive green. Run `node scripts/check-answer-matching.mjs --all` to test the examples and confirm that every answer still matches its own name.

### Varieties

A variety of an answer counts on every prompt. The word matching described above scores it as its answer, so "teacup poodle" counts as Poodle. On prompts about animals and nature, food and drink, or objects, varieties that Wikidata lists are also answers of their own and can score more. Toy Poodle is Deep Cut where Poodle is Plankton, and Bengal tiger is Schooler where Tiger is Plankton.

The reverse also works on those prompts. When the bank lists two or more varieties of something but not the thing itself, the base name counts. It scores one tier below its best-known variety and never more than Schooler, since the plain name is the obvious way to say it. "Name a living animal that moves on 2 feet and can't fly" lists Broad-breasted White and Broad-breasted Bronze turkeys, so Turkey, turkeys and "domestic turkey" score as Turkey. Close spellings of a base name get the usual typo help. A base name is skipped when it only names the prompt's subject, such as "turtle" on a turtle prompt, and on prompts about brands.

The [variety snapshot](scripts/answer-varieties.json.gz) lists the Wikidata subclasses ("subclass of") and child taxa ("parent taxon") of each answer's Wikidata item. Up to the 150 best known per answer are added, each with English alternate names from Wikidata. A variety scores by its coverage across Wikimedia sites and never below its answer: 40 or more sites make it Schooler, 15 or more Rare, and fewer Deep Cut. A variety of a jackpot answer is at most Deep Cut.

These rules keep out entries that are not real varieties of the answer.

- A variety needs pages on at least two Wikimedia sites.
- A variety must include its answer's name, as Bengal tiger includes Tiger, unless it has pages on ten or more sites, like Honeycrisp. Otherwise obscure cultivars named Laura or Bombay would count as fruits.
- Taxa known only by their scientific name are skipped, as are entries tied to one place ("health insurance in France"), ship classes, named events and championships, and labels longer than four words.
- Classes with more than 1,000 varieties, such as protein or a plant genus with thousands of species, are too broad and are not expanded.
- On food prompts, answers whose Wikidata item is a living species are not expanded, because the breeds of the bird are not cuts of chicken.
- Prompts that rule varieties out, such as "kinds of animal, not breeds", are skipped, as are prompts that judge spelling.
- As with alternate names, only answers whose Wikidata item is the same kind of thing as other answers to the prompt are expanded.

Other categories are left out because there Wikidata subclasses drift into unrelated topics, such as a vaccine listed under a college major or real swords under Minecraft items.

### Missed answers

Every guess the game rejects is sent to the "Missed answers" Google Form, whose responses fill the "Missed answers (Responses)" sheet, so real answers missing from a bank can be found and added. In multiplayer the host's browser sends every player's misses; in solo each browser sends its own. The [miss log](docs/miss-log.mjs) sends the prompt, the guess, the display name ("Solo" in solo play) and the time. Unsent misses wait in browser storage until the connection returns. A guess that offers a choice of answers is not reported.

Real answers found in the sheet go in [the reviewed additions](scripts/answer-missed-additions.mjs), keyed by prompt text. The apply script adds each one with its listed score, or only its alternate names when the bank already has it. It also updates the answer counts in the prompt index.

Some misses showed that a whole bank was far from complete. "Name a country that no longer exists" had 74 answers, for example. An audit of open-ended prompts with small banks found more, such as famous paintings, scientists, poets, arcade games, western movies, gulfs and bays, Caribbean islands and cryptids. [The catalog script](scripts/fetch-missed-catalogs.mjs) fills each of these from a Wikidata query, keeping items covered on enough Wikimedia sites. It saves them to [the missed catalogs](scripts/answer-missed-catalogs.json), which the apply script adds like reviewed additions. A new answer is Rare when it is well covered and Deep Cut otherwise. Run `node scripts/fetch-missed-catalogs.mjs` to refresh them, or pass prompt texts to refresh only those. A catalog whose query fails keeps its previous answers.

### Guess sweep

The form only catches misses that someone has already typed, so every prompt was also tested with guesses a player would realistically try. [The guess list](scripts/answer-guess-sweep.txt) has one line per prompt: the prompt ID, then the guesses, separated by `|`. They include common answers, nicknames, abbreviations, plurals and typical misspellings. Run `node scripts/check-guess-sweep.mjs FIRST LAST`, for example `0646 0710`, to list the guesses each prompt rejects.

Real answers among the rejected guesses go in [the guess additions](scripts/answer-guess-additions.txt), one line per prompt in the form `ID|Name@points=alternate=alternate|...`. The points (10, 15, 30, 60, 85 or 100) apply only when the name is new to the bank and default to 30; otherwise the alternate names are added to the existing answer. A line applies to every prompt with the same wording. The apply script reads this file along with the reviewed additions.

Answers that are defensible but debatable end with `!reason` and usually score 10 or 15, such as Turkey for "birds that can't fly" or Western Sahara where a country is asked for. Run `node scripts/report-arguable-answers.mjs` to list them all in [ARGUABLE-ANSWERS.md](ARGUABLE-ANSWERS.md) for review. To veto one, delete it from the additions file and run `node scripts/remove-answers.mjs ID "Name"` for each prompt that has it.

To rebuild the static answer files after updating the dataset, run the following from the repository root.

```powershell
node scripts/build-bank.mjs 'C:\path\to\krillion-answers.jsonl.gz'
node scripts/enrich-bank.mjs
node scripts/apply-answer-aliases.mjs
```

To refresh the Wikidata aliases, run `node scripts/fetch-answer-aliases.mjs` and then `node scripts/fetch-answer-varieties.mjs` before the last step. Both only request what they have not already looked up.

The enrichment uses checked-in source and familiarity snapshots, so rebuilding and playing require no Wikidata requests. After refreshing the sources, run `node scripts/fetch-answer-familiarity.mjs` to retrieve sitelink counts for new entities. Individual additions record a Wikidata entity ID or a donor prompt ID. The original archive is kept separately. GitHub Pages exposes the packaged answer bank as public site files.
