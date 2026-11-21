# Krillion

Krillion is a browser trivia game that draws seven distinct prompts for each game. Players get three seconds to read each prompt and 25 seconds to answer. A guess outside the bank costs three seconds. The answer bank supplies the names, rarity tiers and scores, and every point adds ten metres to the dive.

The animated ocean fills the screen and descends as the score increases. The scene respects the browser's reduced-motion preference.

## Play locally

Run `node scripts/serve.mjs` and open [the local game](http://127.0.0.1:8080/krillion/). The static site needs a modern browser with gzip decompression support.

## GitHub Pages

The site is ready to publish from `main` and the `/docs` directory using GitHub Pages’ **Deploy from a branch** setting. The prompt index and answer files ship with the site and load automatically. All scoring runs in the browser.

## Answer bank

The supplied dataset identifies itself as an export of Krillion public reveal data. The site preserves the prompt text, category, accepted answer text, tier, and score from that export. It samples prompts by distinct wording. When the same wording appears in more than one source game, it randomly chooses one matching answer bank.

The coverage build checks every prompt against [the coverage rules](scripts/answer-coverage-rules.mjs). It can add answers and alternate names from a scoped [Wikidata CC0](https://www.wikidata.org/wiki/Wikidata:Licensing) collection, an equivalent prompt, or a narrower prompt whose answers also qualify. Direct matches take precedence over aliases, and ambiguous aliases are skipped.

Imported Wikidata answers are graded into Plankton, Schooler, Rare, or Deep Cut using their coverage across Wikimedia sites relative to other eligible entries for that prompt. Sitelink coverage is an estimate of familiarity. Transfers from an existing prompt reuse the donor's score with two adjustments. A donor jackpot becomes Deep Cut, and Too Clever becomes Schooler when the recipient prompt differs. Original scores and hand-picked jackpots are preserved.

The [coverage report](scripts/answer-coverage.json) lists original and updated counts, alternate names, and the evidence used for every prompt. Prompts marked `needs-specific-source` still need a source that verifies their exact wording.

To rebuild the static answer files after updating the dataset, run the following from the repository root.

```powershell
node scripts/build-bank.mjs 'C:\path\to\krillion-answers.jsonl.gz'
node scripts/enrich-bank.mjs
```

The enrichment uses checked-in source and familiarity snapshots, so rebuilding and playing require no Wikidata requests. After refreshing the sources, run `node scripts/fetch-answer-familiarity.mjs` to retrieve sitelink counts for new entities. Individual additions record a Wikidata entity ID or a donor prompt ID. The original archive is kept separately. GitHub Pages exposes the packaged answer bank as public site files.
