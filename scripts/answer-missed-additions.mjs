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
  'Name an Olympic track and field event': [
    ['3000 metres steeplechase', 60, ['Steeplechase']],
    // Review of 2026-11-26: race walking is often called speed walking.
    ['20km race walk', 15, ['Race walk', 'Race walking', 'Racewalking', 'Speed walk', 'Speed walking']],
    ['10km race walk', 85, ['10k walk', '10 km walk', '10k race walk', '10k speed walk', '10 kilometer speed walk']],
  ],
  'Name a rice dish': [
    ['rice and beans', 60, ['Arroz e feijão', 'Arroz con frijoles', 'Arroz con habichuelas']],
    ['Mango sticky rice', 60, ['Khao niao mamuang', 'Mango with sticky rice', 'Rice and mango', 'Mango rice']],
  ],
  // The Republic of China fought from 1937 and governs Taiwan today.
  'Name a country that fought in World War II': [['China', 10, ['Republic of China', 'Taiwan']]],
  'Name an app or website where you book things (like Expedia for travel).': [['Selective Asia', 85]],
  // Review of 2026-11-26: real answers and everyday names for answers already in the bank.
  'Name a country with an official state religion': [['United Kingdom', 30, ['England']]],
  'Name a vitamin or dietary mineral': [
    ['Vitamin B1', 60, ['Thiamine', 'Thiamin']], ['Vitamin B2', 60, ['Riboflavin']],
    ['Vitamin B6', 30, ['Pyridoxine']], ['Vitamin B12', 30, ['Cobalamin', 'Cyanocobalamin']],
    ['Folate', 30, ['Folic acid', 'Vitamin B9']], ['Pantothenic acid', 85, ['Vitamin B5']],
  ],
  'Name a muscle in the human body': [['Iliopsoas', 60, ['Hip flexor', 'Hip flexors']]],
  'Name a computer operating system': [['MS-DOS', 30, ['DOS']]],
  'Name a hot drink': [['Yerba mate', 30, ['Mate', 'Maté', 'Chimarrão', 'Chimarrao']]],
  'Name a holiday celebrated around the world': [
    ['Day of the Dead', 60, ['Día de los Muertos', 'Dia de los Muertos', 'Día de Muertos']],
    ['Midsummer', 85, ['San Juan', 'Noche de San Juan', 'John the Baptist Day', 'Saint John the Baptist Day']],
  ],
  'Name a superpower Superman has in the comics or movies': [
    ['Heat vision', 10, ['Laser eyes', 'Laser vision']],
    ['Super speed', 10, ['Speed', 'Faster than a speeding bullet', 'Faster than a bullet']],
  ],
  'Name something you can measure about the human body': [['Body temperature', 10, ['Temperature']]],
  'Name a symptom of a cold or flu': [['Mucus', 30, ['Phlegm']], ['Runny nose', 10, ['Snot']]],
  'Name a font': [['Lobster', 60]],
  // Brazilian cakes: bolo de brigadeiro and bolo formigueiro ("anthill cake").
  'Name a type of cake': [
    ['Brigadeiro cake', 85, ['Brigadeiro', 'Bolo de brigadeiro']],
    ['Formigueiro cake', 85, ['Formigueiro', 'Bolo formigueiro', 'Anthill cake']],
  ],
  'Name a sauce': [['Worcestershire sauce', 60, ['Worchestershire', 'Worchestershire sauce', 'Worchestire', 'Worchestire sauce', 'Worcester']]],
  'Name a type of bag': [['Backpack', 10, ['Hiking bag', 'Hiking backpack']]],
  'Name a style of hat': [['Cowboy hat', 10, ['Western hat', 'Western']]],
  'Name a Korean dish': [['Gyeran-mari', 60, ['Egg roll', 'Rolled egg', 'Rolled omelette']]],
  // Chess is recognised as a sport by the International Olympic Committee.
  'Name a sport played without a ball': [['Chess', 60]],
  'Name a Seinfeld character': [['Jerry', 10, ['Jerry Seinfeld']]],
  'Name a type of skincare product': [['Petroleum jelly', 30, ['Vaseline']]],
  'Name a Bible character': [["Balaam's donkey", 85, ['Talking donkey']]],
  'Name a type of sausage': [['Italian sausage', 10, ['Mild Italian', 'Italian mild', 'Hot Italian', 'Sweet Italian']]],
  'Name a famous physicist': [['Friedrich Paschen', 85]],
  'Name an extreme sport': [['Bog snorkelling', 85, ['Bog snorkeling', 'Bog diving']]],
  'Name a protagonist from an anime or animated TV show (1,000+ votes on IMDb or listed on MAL)': [['Mark Grayson', 60, ['Invincible']]],
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
