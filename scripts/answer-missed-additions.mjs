// Answers added after reviewing the "Missed answers" form: real answers that players typed and the
// game rejected. Keyed by exact prompt text. Each row is [name, points, alternate names]. When the
// bank already has the answer, only the alternate names are added and its score is kept.
export const missedAdditions = {
  // Review of 2026-11-24
  'Name a branch of science ending in -ology': [['Odontology', 60, ['Dental science']]],
  'Name a branded fast-food menu item (like the Big Mac).': [['Grand Mac', 60]],
  'Name a carnivorous mammal': [['Red fox', 30, ['Vulpes vulpes']]],
  'Name a Netflix original series': [
    ['The Disastrous Life of Saiki K.: Reawakened', 85, ['Saiki K', 'Saiki K.', 'Saiki K Reawakened', 'The Disastrous Life of Saiki K']],
  ],
  'Name a Nintendo video game franchise': [
    ['Mario', 10, ['Super Mario', 'Super Mario Bros.', 'Super Mario Brothers']],
    ['Mario Bros.', 60, ['Mario Brothers', 'Mario Bros']],
  ],
  'Name a type of knot': [['Bow knot', 30, ['Shoelace knot', 'Shoe knot', 'Bowknot', 'Shoelace']]],
  'Name a movie starring Timothée Chalamet': [
    ['Dune: Part Two', 10, ['Dune 2', 'Dune II', 'Dune Part 2', 'Dune Part II']],
    ['Dune', 10, ['Dune: Part One', 'Dune Part 1', 'Dune Part One']],
  ],
  // Review of 2026-11-25. Former countries come from the generated catalog in
  // answer-missed-catalogs.json (see fetch-missed-catalogs.mjs).
  'Name an Olympic track and field event': [['3000 metres steeplechase', 60, ['Steeplechase']]],
  'Name a rice dish': [['rice and beans', 60, ['Arroz e feijão', 'Arroz con frijoles', 'Arroz con habichuelas']]],
  // The Republic of China fought from 1937 and governs Taiwan today.
  'Name a country that fought in World War II': [['China', 10, ['Republic of China', 'Taiwan']]],
  'Name an app or website where you book things (like Expedia for travel).': [['Selective Asia', 85]],
  // Gaps found by auditing small banks on open-ended prompts.
  'Name an organ of the human body': [
    ['Colon', 30, ['Large intestine']], ['Small intestine', 30, ['Small bowel']], ['Mouth', 30], ['Teeth', 30, ['Tooth']],
    ['Muscles', 30, ['Muscle']], ['Bones', 30, ['Bone', 'Skeleton']], ['Rectum', 60], ['Anus', 60], ['Lips', 60, ['Lip']],
    ['Gums', 60, ['Gum', 'Gingiva']], ['Tonsils', 60, ['Tonsil']], ['Urethra', 60], ['Ureters', 60, ['Ureter']],
    ['Penis', 60], ['Vagina', 60], ['Vulva', 85], ['Clitoris', 85], ['Breasts', 60, ['Breast', 'Mammary glands', 'Mammary gland']],
    ['Fallopian tubes', 60, ['Fallopian tube', 'Oviducts']], ['Blood vessels', 60, ['Arteries', 'Veins', 'Artery', 'Vein']],
    ['Nerves', 60, ['Nerve']], ['Cerebellum', 60], ['Duodenum', 85], ['Adenoids', 85], ['Epididymis', 85],
    ['Seminal vesicles', 85], ['Sweat glands', 85], ['Lacrimal glands', 85, ['Tear glands']], ['Interstitium', 85],
    ['Lymphatic vessels', 85], ['Hair', 60], ['Nails', 60, ['Fingernails', 'Toenails']], ['Scrotum', 85], ['Cervix', 85],
  ],
  'Name a nut': [
    ['Hazelnut', 10, ['Filbert', 'Cobnut']], ['Peanut', 10, ['Groundnut', 'Earthnut', 'Goober']],
    ['Pine nut', 30, ['Pignoli', 'Pinon', 'Piñon']], ['Macadamia', 30, ['Queensland nut', 'Bush nut', 'Macadamia nut']],
    ['Brazil nut', 30, ['Cream nut', 'Para nut']], ['Betel nut', 60, ['Areca nut']], ['Tigernut', 85, ['Chufa', 'Tiger nut']],
    ['Walnut', 10, ['English walnut', 'Persian walnut']], ['Heartnut', 85, ['Japanese walnut']], ['Malabar chestnut', 85],
    ['Paradise nut', 85], ['Apricot kernel', 85], ['Marula nut', 85], ['Yeheb nut', 85], ['Ogbono nut', 85, ['Ogbono', 'Bush mango seed']],
    ['Tropical almond', 85, ['Indian almond', 'Sea almond']], ['Java almond', 85, ['Kenari nut', 'Canarium nut']],
    ['Jack nut', 85, ['Jackfruit seed']], ['Peach kernel', 85], ['Cashew', 10, ['Cashew nut']], ['Almond', 10, ['Almond nut']],
  ],
  'Name a sport played with a racquet or paddle': [
    ['Ping pong', 10, ['Table tennis']], ['Paddle tennis', 60], ['Paddleball', 60], ['Spec tennis', 85, ['Spectennis']],
    ['Touchtennis', 85, ['Touch tennis']], ['Speedminton', 85, ['Speed badminton']], ['Pelota mixteca', 85],
    ['Rafting', 60, ['White water rafting', 'River rafting']], ['Outrigger canoeing', 85, ['Va\'a']], ['Padel', 30, ['Padel tennis', 'Paddle']],
  ],
};
