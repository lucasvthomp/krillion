# Arguable answers

The guess sweep accepts answers a reasonable player could defend, even when they are technically shaky.
These are the ones it accepted leniently. To veto one, delete it from
[the guess additions](scripts/answer-guess-additions.txt), rebuild the banks, then rerun
`node scripts/report-arguable-answers.mjs`. A veto removes it from the next full rebuild; to drop it from the
current banks straight away, remove the answer from its bank file as well.

34 answers.

| Prompt | Answer | Points | Why it is arguable |
| --- | --- | ---: | --- |
| Name a country in Africa | Somaliland | 60 | Self-declared state, not recognised by the UN |
| Name a sport that has ever been part of the Summer Olympics | Marathon | 10 | An event within athletics rather than a sport of its own |
| Name a country in the Americas (North, Central, or South) | Greenland | 60 | Part of the Kingdom of Denmark, not an independent country |
| Name a country in the Americas (North, Central, or South) | Puerto Rico | 30 | US territory, not an independent country |
| Name a country in the Americas (North, Central, or South) | French Guiana | 60 | Part of France, not an independent country |
| Name a bird of prey | Shrike | 60 | A songbird that hunts like a raptor |
| Name a type of cheese | Velveeta | 30 | A processed cheese product brand |
| Name a type of cheese | Babybel | 30 | A brand of snack cheese |
| Name a dog breed | Cockapoo | 60 | A designer crossbreed |
| Name a dog breed | Puggle | 60 | A designer crossbreed |
| Name the capital city of a European country | Edinburgh | 60 | Capital of Scotland, which is not a sovereign state |
| Name the capital city of a European country | Cardiff | 60 | Capital of Wales, which is not a sovereign state |
| Name the capital city of a European country | Belfast | 60 | Capital of Northern Ireland, which is not a sovereign state |
| Name a root vegetable | Konjac | 85 | A corm, like taro |
| Name a venomous or poisonous animal | Monarch butterfly | 60 | Poisonous to eat rather than venomous |
| Name a venomous or poisonous animal | Snake | 10 | Most snakes are not venomous |
| Name a venomous or poisonous animal | Spider | 10 | Most spiders are harmless to people |
| Name an herb or spice | Italian seasoning | 30 | A blend rather than a single herb |
| Name an herb or spice | Old Bay | 60 | A brand of seasoning blend |
| Name a cocktail | Eggnog | 30 | Often made without alcohol |
| Name a mythical creature | Ghost | 30 | A spirit rather than a creature |
| Name a mythical creature | Demon | 30 | A spirit rather than a creature |
| Name a mythical creature | Angel | 30 | A spirit rather than a creature |
| Name a board game | Dungeons & Dragons | 30 | A role-playing game rather than a board game |
| Name a board game | Monopoly Deal | 30 | A card game |
| Name a country with a Mediterranean coastline | Gibraltar | 60 | A British territory, not a country |
| Name a tropical fruit | Persimmon | 30 | Mostly grown in temperate and subtropical climates |
| Name a tropical fruit | Pomegranate | 30 | Mostly grown in subtropical climates |
| Name a tropical fruit | Fig | 30 | Mostly grown in subtropical climates |
| Name a style of dance | K-pop dance | 60 | A style of choreography rather than a dance form |
| Name a style of dance | Moonwalk | 30 | A dance move rather than a style |
| Name a style of dance | Macarena | 30 | A dance move rather than a style |
| Name a style of dance | Floss | 60 | A dance move rather than a style |
| Name a Roman emperor | Julius Caesar | 30 | Ruled as dictator; Augustus was the first emperor |
